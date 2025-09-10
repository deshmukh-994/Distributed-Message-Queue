require('dotenv').config();
const { createApp } = require('./app');

const raw = process.env.PORT;
const parsed = parseInt(raw, 10);
const PORT = Number.isFinite(parsed) ? parsed : 4000;  // fallback safely

const app = createApp();
app.listen(PORT, () => {
  console.log(`[DMQ] Broker ${process.env.BROKER_ID || 'broker'} listening on :${PORT}`);
});
