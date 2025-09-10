// Demo-only replication fan-out (best-effort HTTP). No quorum, no ISR.
const http = require('http');


function fanoutToPeers(peers, payload){
if (!peers || peers.length === 0) return;
const body = JSON.stringify(payload);
peers.forEach(p => {
try {
const url = new URL('/internal/replicate', p);
const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }}, res => res.resume());
req.on('error', ()=>{});
req.write(body); req.end();
} catch (_) {}
});
}


module.exports = { fanoutToPeers };
