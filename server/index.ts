import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import configRoutes from './routes/config.js';
import contentRoutes from './routes/content.js';
import planningRoutes from './routes/planning.js';
import sourcesRoutes from './routes/sources.js';
import voiceRoutes from './routes/voice.js';
import aiRoutes from './routes/ai.js';
import { seedDatabase } from './db/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// API routes
app.use('/api', configRoutes);
app.use('/api', contentRoutes);
app.use('/api', planningRoutes);
app.use('/api', sourcesRoutes);
app.use('/api', voiceRoutes);
app.use('/api', aiRoutes);

// Serve static files in production
if (isProduction) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  // SPA fallback
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Start server and seed database
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: ${isProduction ? 'production' : 'development'}`);
  console.log(`API Key configured: ${!!process.env.ANTHROPIC_API_KEY}`);
  console.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);

  // Auto-seed on first run
  try {
    await seedDatabase();
  } catch (err) {
    console.error('Seed error (non-fatal):', err);
  }
});
