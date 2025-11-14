const path = require('path');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const publicDir = path.resolve(__dirname, '../public');

app.use(express.static(publicDir));
app.get('/demo-sba', (_req, res) => {
  res.sendFile(path.join(publicDir, 'demo-sba.html'));
});

const server = app.listen(port, () => {
  console.log(`[demo-static] serving ${publicDir} on http://localhost:${port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
