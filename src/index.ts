import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Servir les fichiers statiques AVANT tout middleware
// Cela permet à TikTok de crawler /terms et /privacy sans restrictions
app.use(express.static(path.join(__dirname, '../public')));

// Middleware de sécurité
app.use(helmet());

// CORS - Autoriser les requêtes depuis le frontend et Cloudflare
app.use(
  cors({
    origin: [
      env.FRONTEND_URL,
      /\.trycloudflare\.com$/, // Permet les tunnels Cloudflare
      /localhost/,
    ],
    credentials: true,
  })
);

// Rate limiting - Protection contre les abus
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requêtes par IP par fenêtre
  message: {
    error: 'too_many_requests',
    message: 'Too many requests, please try again later.',
  },
});

app.use('/api/', limiter);

// Parser JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route de santé
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Routes statiques pour Terms et Privacy
app.get('/terms', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/terms.html'));
});

app.get('/privacy', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/privacy.html'));
});

// Routes pour les fichiers de vérification TikTok
app.get('/tiktok-developers-site-verification=Yqdd8DJwFhaoiUb5RlgmQOTbPbjftIjR', (_req, res) => {
  res.type('text/plain');
  res.send('tiktok-developers-site-verification=Yqdd8DJwFhaoiUb5RlgmQOTbPbjftIjR');
});

app.get('/tiktok-developers-site-verification=tzjnlbLprcm7dgvp053Oz4KfGAdLaT0o', (_req, res) => {
  res.type('text/plain');
  res.send('tiktok-developers-site-verification=tzjnlbLprcm7dgvp053Oz4KfGAdLaT0o');
});

// Routes API
app.use('/api/auth', authRoutes);

// Middleware de gestion des erreurs
app.use(notFoundHandler);
app.use(errorHandler);

// Démarrer le serveur
const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`
🚀 Server is running!
🌍 Environment: ${env.NODE_ENV}
📡 Port: ${PORT}
🔗 API: http://localhost:${PORT}
📝 Health check: http://localhost:${PORT}/health
  `);
});

// Gestion des erreurs non gérées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
