'use strict';

const http = require('node:http');
const { isKnownEvent } = require('./state.js');

const BODY_LIMIT = 64 * 1024;

function send(res, status) {
  res.writeHead(status, { 'Content-Length': '0', Connection: 'close' });
  res.end();
}

function startServer({ port = 47321, petState, onChange = () => {} }) {
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/hook') {
      req.resume();
      return send(res, 404);
    }
    const chunks = [];
    let size = 0;
    let aborted = false;
    req.on('data', (chunk) => {
      if (aborted) return;
      size += chunk.length;
      if (size > BODY_LIMIT) {
        aborted = true;
        send(res, 413);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (aborted) return;
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return send(res, 400);
      }
      if (!body || typeof body !== 'object'
        || typeof body.hook_event_name !== 'string'
        || typeof body.session_id !== 'string' || body.session_id === '') {
        return send(res, 400);
      }
      if (isKnownEvent(body.hook_event_name)) {
        petState.onHook(body.hook_event_name, body.session_id);
        try { onChange(petState.scene()); } catch (err) { console.error('onChange failed:', err); }
      }
      send(res, 204);
    });
    req.on('error', () => {});
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}

module.exports = { startServer, BODY_LIMIT };
