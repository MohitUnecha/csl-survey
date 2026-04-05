const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initDb, checkDbConnection } = require('./db');
const surveyRoutes = require('./routes/survey');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;
const clientDist = path.join(__dirname, '..', 'client', 'dist');

let readyPromise;

function ensureReady() {
  if (!readyPromise) {
    readyPromise = initDb();
  }

  return readyPromise;
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use(async (req, res, next) => {
  try {
    await ensureReady();
    next();
  } catch (error) {
    next(error);
  }
});

// API routes
app.get('/api/db-check', async (req, res, next) => {
  try {
    const result = await checkDbConnection();
    res.set('Cache-Control', 'no-store');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.use('/api/survey', surveyRoutes);
app.use('/api/admin', adminRoutes);

// Serve static frontend in production
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  ensureReady().then(() => {
    app.listen(PORT, () => {
      console.log(`CSL Survey API running on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
} else {
  ensureReady().catch((err) => {
    console.error('Failed to initialize database:', err);
  });
}

// Export for Vercel serverless
module.exports = app;
