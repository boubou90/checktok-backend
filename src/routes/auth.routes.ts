import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';

const router = Router();

/**
 * Routes d'authentification TikTok OAuth
 */

// Initier la connexion TikTok
router.get('/tiktok', AuthController.initiateLogin);

// Callback OAuth TikTok
router.get('/tiktok/callback', AuthController.callback);

// Récupérer les informations de l'utilisateur connecté
router.get('/me', AuthController.getMe);

// Déconnexion
router.post('/logout', AuthController.logout);

export default router;
