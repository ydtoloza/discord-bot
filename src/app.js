require('dotenv').config();

const express = require('express');
const radarrRouter = require('./routes/radarr');
const sonarrRouter = require('./routes/sonarr');

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json({ limit: '10mb' }));

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
