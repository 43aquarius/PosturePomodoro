const http = require('http');
const fs = require('fs');
const path = require('path');

const mime = {
  'html': 'text/html; charset=utf-8',
  'js': 'application/javascript',
  'json': 'application/json',
  'css': 'text/css',
  'png': 'image/png',
  'ico': 'image/x-icon',
  'mjs': 'application/javascript'
};

const root = __dirname;

http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  const filePath = path.join(root, url);
  try {
    const data = fs.readFileSync(filePath);
    const ext = filePath.split('.').pop();
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'text/plain',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('Not Found: ' + url);
  }
}).listen(3721, () => {
  console.log('Pomodoro server: http://localhost:3721');
});
