require('dotenv').config();

const express = require('express');
const radarrRouter = require('./routes/radarr');
const sonarrRouter = require('./routes/sonarr');

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json({ limit: '10mb' }));

// Basic Auth Middleware
app.use((req, res, next) => {
  if (req.path === '/health') return next();

  const user = process.env.WEBHOOK_USERNAME;
  const pass = process.env.WEBHOOK_PASSWORD;

  if (!user || !pass) {
    return next(); // Si no hay usuario/pass configurado, dejar pasar
  }

  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login && password && login === user && password === pass) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required.');
});

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/radarr', radarrRouter);
app.use('/sonarr', sonarrRouter);

app.use((err, req, res, next) => {
  console.error('[Server]', err.message);
  res.status(200).json({ ok: false });
});

app.listen(port, () => {
  console.log(`[Server] Discord Webhook Bot listening on ${port}`);
});
