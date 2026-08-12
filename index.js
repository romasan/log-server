require('dotenv').config();
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static('public'));

const MAX_LOGS = 1000;
const logs = [];

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    return xff.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function broadcast(entry) {
  const payload = JSON.stringify(entry);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

// Сохранение запроса
app.get('/log', (req, res) => {
  const now = new Date();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    timestamp: now.toISOString(),
    dateTime: formatDateTime(now),
    ip: getClientIp(req),
    params: req.query
  };

  logs.push(entry);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  broadcast(entry);

  res.json({
    status: 'ok',
    id: entry.id,
    count: logs.length
  });
});

// Последние 100 записей для страницы
app.get('/api/logs', (req, res) => {
  res.json(logs.slice(-100));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});