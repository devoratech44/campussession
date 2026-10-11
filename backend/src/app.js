// backend/src/app.js
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const { httpLogger, bodyLogger } = require('./middlewares/requestLogger');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const routes = require('./routes');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientUrl.split(',').map((o) => o.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);
app.use(bodyLogger);

// Photos de profil publiques (les documents, eux, passeront par l'API authentifiée)
app.use('/uploads/profils', express.static(path.join(__dirname, '..', 'uploads', 'profils')));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;