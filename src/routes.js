// src/routes.js
const express = require('express');
const { createTopic, getTopic, produce, fetch, ack, offsets } = require('./broker');
const { fanoutToPeers } = require('./replication');

const router = express.Router(); // <-- define router

const peers = (process.env.BROKER_PEERS || '').split(',').map(s => s.trim()).filter(Boolean);
const isLeader = /^true$/i.test(process.env.LEADER || 'true');

router.get('/health', (req, res) => res.json({ ok: true }));

// Create topic
router.post('/topics', (req, res, next) => {
  try {
    const { name, partitions } = req.body || {};
    const t = createTopic(name, partitions || 1);
    return res.status(201).json(t);
  } catch (e) { next(e); }
});

router.get('/topics/:topic', (req, res) => {
  const t = getTopic(req.params.topic);
  if (!t) return res.status(404).json({ message: 'Not found' });
  res.json(t);
});

// Produce
router.post('/produce', (req, res, next) => {
  try {
    const { topic, key, value } = req.body || {};
    const meta = produce({ topic, key, value });
    if (isLeader) fanoutToPeers(peers, { type: 'produce', payload: { topic, key, value, meta } });
    return res.status(202).json(meta);
  } catch (e) { next(e); }
});

// Consume
router.post('/consume', (req, res, next) => {
  try {
    const { topic, group, max } = req.body || {};
    if (!topic || !group) throw Object.assign(new Error('topic and group required'), { status: 400 });
    const out = fetch({ topic, group, max: Math.min(Number(max) || 1, 100) });
    return res.json(out);
  } catch (e) { next(e); }
});

// ACK
router.post('/ack', (req, res, next) => {
  try {
    const { topic, group, partition, offset } = req.body || {};
    if (typeof partition !== 'number' || typeof offset !== 'number')
      throw Object.assign(new Error('partition and offset required'), { status: 400 });
    const out = ack({ topic, group, partition, offset });
    return res.json(out);
  } catch (e) { next(e); }
});

// Offsets
router.get('/topics/:topic/partitions/:p/offsets', (req, res, next) => {
  try {
    const { topic, p } = req.params;
    const out = offsets(topic, Number(p));
    return res.json(out);
  } catch (e) { next(e); }
});

// Internal replication (demo)
router.post('/internal/replicate', (req, res, next) => {
  try {
    const { type, payload } = req.body || {};
    if (type === 'produce') {
      const { topic, key, value, meta } = payload;
      const db = require('./db').getDb();
      const ts = meta.ts || new Date().toISOString();
      const val = typeof value === 'string' ? value : JSON.stringify(value);
      db.prepare('INSERT OR IGNORE INTO messages (topic, partition, offset, key, value, ts) VALUES (?, ?, ?, ?, ?, ?)')
        .run(topic, meta.partition, meta.offset, key || null, val, ts);
    }
    return res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router; // <-- export router
