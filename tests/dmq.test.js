const request = require('supertest');
const { createApp } = require('../src/app');


let app;


beforeAll(() => {
process.env.DB_FILE = ':memory:';
app = createApp();
});


describe('DMQ basics', () => {
test('create topic', async () => {
const res = await request(app).post('/topics').send({ name: 'orders', partitions: 2 });
expect(res.status).toBe(201);
expect(res.body.partitions).toBe(2);
});


test('produce and consume with ack (at-least-once)', async () => {
await request(app).post('/topics').send({ name: 'events', partitions: 2 });


const p1 = await request(app).post('/produce').send({ topic: 'events', key: 'user-1', value: { hello: 'world' } });
expect(p1.status).toBe(202);


const c1 = await request(app).post('/consume').send({ topic: 'events', group: 'svc-a', max: 5 });
expect(c1.status).toBe(200);
expect(c1.body.messages.length).toBeGreaterThan(0);


const m = c1.body.messages[0];
const ack = await request(app).post('/ack').send({ topic: 'events', group: 'svc-a', partition: m.partition, offset: m.offset });
expect(ack.status).toBe(200);


const c2 = await request(app).post('/consume').send({ topic: 'events', group: 'svc-a', max: 5 });
const stillThere = c2.body.messages.find(x => x.offset === m.offset && x.partition === m.partition);
expect(stillThere).toBeFalsy(); // not re-delivered after ack
});
});