const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { initDb } = require('./db');
const routes = require('./routes');


function createApp(){
const app = express();
initDb();

const path = require('path');

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dmq.html'));
});


app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));


app.use('/', routes);


// Error handler
app.use((err, req, res, next) => {
console.error(err);
res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});


return app;
}


module.exports = { createApp };