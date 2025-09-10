const { getDb } = require('./db');
const { choosePartition } = require('./partitioner');

/* ---------- Topic helpers ---------- */
function createTopic(name, partitions) {
  if (!name) throw Object.assign(new Error('Topic name required'), { status: 400 });
  if (!Number.isInteger(partitions) || partitions < 1) {
    throw Object.assign(new Error('Invalid partitions'), { status: 400 });
  }
  const db = getDb();
  try {
    db.prepare('INSERT INTO topics (name, partitions) VALUES (?, ?)').run(name, partitions);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      throw Object.assign(new Error('Topic exists'), { status: 409 });
    }
    throw e;
  }
  return { name, partitions };
}

function getTopic(name) {
  const db = getDb();
  return db.prepare('SELECT name, partitions FROM topics WHERE name = ?').get(name);
}

function ensureTopic(name, partitions) {
  const db = getDb();
  const row = db.prepare('SELECT name, partitions FROM topics WHERE name = ?').get(name);
  if (!row) {
    db.prepare('INSERT INTO topics (name, partitions) VALUES (?, ?)').run(name, partitions || 1);
    return { name, partitions: partitions || 1 };
  }
  return row;
}

/* ---------- Offsets & messages ---------- */
function getHighWatermark(topic, partition) {
  const db = getDb();
  const row = db
    .prepare('SELECT MAX(offset) as hwm FROM messages WHERE topic = ? AND partition = ?')
    .get(topic, partition);
  return row && row.hwm != null ? row.hwm : -1;
}

function produce({ topic, key, value }) {
  const db = getDb();
  const t = getTopic(topic);
  if (!t) throw Object.assign(new Error('Unknown topic'), { status: 404 });

  const p = choosePartition({ key, partitions: t.partitions });
  const hwm = getHighWatermark(topic, p);
  const next = hwm + 1;
  const ts = new Date().toISOString();
  const val = typeof value === 'string' ? value : JSON.stringify(value);

  db.prepare(
    'INSERT INTO messages (topic, partition, offset, key, value, ts) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(topic, p, next, key || null, val, ts);

  return { topic, partition: p, offset: next, ts };
}

function fetch({ topic, group, max = 1 }) {
  const db = getDb();
  const t = getTopic(topic);
  if (!t) throw Object.assign(new Error('Unknown topic'), { status: 404 });

  const cap = Math.min(Number(max) || 1, 100);
  const out = [];

  for (let p = 0; p < t.partitions; p++) {
    const row = db
      .prepare(
        'SELECT committed_offset FROM offsets WHERE topic = ? AND partition = ? AND consumer_group = ?'
      )
      .get(topic, p, group);
    const committed = row ? row.committed_offset : -1;

    // fetch from committed+1; per-partition limit prevents huge bursts
    const msgs = db
      .prepare(
        'SELECT partition, offset, key, value, ts FROM messages WHERE topic = ? AND partition = ? AND offset > ? ORDER BY offset ASC LIMIT ?'
      )
      .all(topic, p, committed, cap);

    msgs.forEach((m) =>
      out.push({
        partition: m.partition,
        offset: m.offset,
        key: m.key,
        value: safeParse(m.value),
        ts: m.ts,
      })
    );
  }

  // overall cap
  return { messages: out.slice(0, cap) };
}

function ack({ topic, group, partition, offset }) {
  const db = getDb();

  const exists = db
    .prepare('SELECT 1 FROM messages WHERE topic = ? AND partition = ? AND offset = ?')
    .get(topic, partition, offset);
  if (!exists) throw Object.assign(new Error('Message not found'), { status: 404 });

  const row = db
    .prepare(
      'SELECT committed_offset FROM offsets WHERE topic = ? AND partition = ? AND consumer_group = ?'
    )
    .get(topic, partition, group);

  if (!row) {
    db.prepare(
      'INSERT INTO offsets (topic, partition, consumer_group, committed_offset) VALUES (?, ?, ?, ?)'
    ).run(topic, partition, group, offset);
  } else if (offset >= row.committed_offset) {
    db.prepare(
      'UPDATE offsets SET committed_offset = ? WHERE topic = ? AND partition = ? AND consumer_group = ?'
    ).run(offset, topic, partition, group);
  }

  return { committed: true };
}

function offsets(topic, partition) {
  const db = getDb();
  const hwm = getHighWatermark(topic, partition);
  const rows = db
    .prepare('SELECT consumer_group, committed_offset FROM offsets WHERE topic = ? AND partition = ?')
    .all(topic, partition);
  const map = {};
  rows.forEach((r) => (map[r.consumer_group] = r.committed_offset));
  return { highWatermark: hwm, committed: map };
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

module.exports = {
  createTopic,
  getTopic,
  ensureTopic,
  produce,
  fetch,
  ack,
  offsets,
};
