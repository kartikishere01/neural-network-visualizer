import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import inferenceRouter from './api/inference';
import { getOrInitializeModel } from './models/mnistModel';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api', inferenceRouter);


// Serve static assets in production
// Determine project root depending on whether we started inside root or server directory
const projectRoot = process.cwd().endsWith('server') ? path.join(process.cwd(), '..') : process.cwd();
const clientBuildPath = path.join(projectRoot, 'client', 'dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      console.error(`Error serving index.html from ${path.join(clientBuildPath, 'index.html')}:`, err);
      res.status(200).send('API Server is running. Client build not found.');
    }
  });
});

// ── Start Express FIRST, then train in background ───────────────────────────
// This way port 3001 opens immediately and the frontend can connect right away.
// /api/model-info returns "training" until ready, then "ready".
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Starting model initialisation in background...');

  getOrInitializeModel()
    .then(() => console.log('✅ Model ready — inference available.'))
    .catch((err) => console.error('❌ Model init failed:', err));
});
