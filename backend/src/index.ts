import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import uploadRouter from './controllers/upload.controller';
import techpackRouter from './controllers/techpack.controller';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure directories exist
const uploadsDir = path.join(__dirname, '../uploads');
const outputDir = path.join(__dirname, '../output');
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/techpack', techpackRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  const message = err.message || 'Internal server error';
  res.status(err.status || 500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Tech Pack Generator API running on http://localhost:${PORT}`);
});
