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

// Debug route to inspect paths on the production server
app.get('/api/debug-files', (req, res) => {
  try {
    const projectRoot = process.cwd().endsWith('server') ? path.join(process.cwd(), '..') : process.cwd();
    const clientDistPath = path.join(projectRoot, 'client', 'dist');
    const rootFiles = fs.existsSync(projectRoot) ? fs.readdirSync(projectRoot) : [];
    const clientFiles = fs.existsSync(path.join(projectRoot, 'client')) ? fs.readdirSync(path.join(projectRoot, 'client')) : [];
    const distFiles = fs.existsSync(clientDistPath) ? fs.readdirSync(clientDistPath) : [];

    res.json({
      cwd: process.cwd(),
      dirname: __dirname,
      projectRoot,
      clientDistPath,
      existsRoot: fs.existsSync(projectRoot),
      existsClient: fs.existsSync(path.join(projectRoot, 'client')),
      existsDist: fs.existsSync(clientDistPath),
      rootFiles,
      clientFiles,
      distFiles
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
