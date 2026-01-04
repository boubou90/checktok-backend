import { Request, Response } from 'express';
import { TikTokService } from '../services/tiktok.service.js';
import { UserService } from '../services/user.service.js';
import { env } from '../config/env.js';
import crypto from 'crypto';

/**
 * Contrôleur pour l'authentification TikTok OAuth
 */
export class AuthController {
  /**
   * Redirige vers la page d'autorisation TikTok
   * GET /api/auth/tiktok
   */
  static async initiateLogin(_req: Request, res: Response): Promise<void> {
    try {
      // Générer un état aléatoire pour la sécurité CSRF
      const state = crypto.randomBytes(32).toString('hex');

      // Stocker l'état en session (ou dans un cookie sécurisé)
      // Pour simplifier, on le retourne dans l'URL, mais en production
      // il faudrait le stocker en session
      const authUrl = TikTokService.getAuthorizationUrl(state);

      res.json({
        authUrl,
        state,
      });
    } catch (error) {
      console.error('Error initiating TikTok login:', error);
      res.status(500).json({
        error: 'authentication_failed',
        message: 'Failed to initiate TikTok login',
      });
    }
  }

  /**
   * Callback OAuth TikTok
   * GET /api/auth/tiktok/callback?code=...&state=...
   */
  static async callback(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.query;

      if (!code || typeof code !== 'string') {
        res.redirect(`${env.FRONTEND_URL}/login?error=missing_code`);
        return;
      }

      // En production, vérifier que le state correspond à celui stocké en session
      // Pour l'instant, on continue sans vérification stricte

      // Échanger le code contre un access token
      const tokenData = await TikTokService.getAccessToken(code);

      // Récupérer les informations de l'utilisateur TikTok
      const tiktokUser = await TikTokService.getUserInfo(tokenData.access_token);

      // Vérifier si l'utilisateur existe déjà
      let user = await UserService.findByTikTokUserId(tiktokUser.open_id);

      if (user) {
        // Mettre à jour les tokens
        await UserService.updateTokens(
          user.id,
          tokenData.access_token,
          tokenData.refresh_token
        );

        // Mettre à jour le profil si les informations ont changé
        await UserService.updateProfile(user.id, {
          display_name: tiktokUser.display_name,
          avatar_url: tiktokUser.avatar_url,
          username: tiktokUser.display_name.toLowerCase().replace(/\s+/g, '_'),
        });

        // Récupérer l'utilisateur mis à jour
        user = await UserService.findById(user.id);
      } else {
        // Créer un nouvel utilisateur
        user = await UserService.create({
          tiktok_user_id: tiktokUser.open_id,
          username: tiktokUser.display_name.toLowerCase().replace(/\s+/g, '_'),
          display_name: tiktokUser.display_name,
          avatar_url: tiktokUser.avatar_url,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
        });
      }

      // Créer un token de session simple (en production, utiliser JWT)
      const sessionToken = crypto.randomBytes(64).toString('hex');

      // En production, stocker le sessionToken dans Redis avec l'userId
      // Pour l'instant, on redirige avec l'userId en paramètre (NON SÉCURISÉ pour la production)

      // Rediriger vers le frontend avec succès
      res.redirect(
        `${env.FRONTEND_URL}/auth/callback?success=true&userId=${user!.id}&token=${sessionToken}`
      );
    } catch (error) {
      console.error('Error in TikTok callback:', error);
      res.redirect(`${env.FRONTEND_URL}/login?error=authentication_failed`);
    }
  }

  /**
   * Récupère les informations de l'utilisateur connecté
   * GET /api/auth/me
   */
  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        res.status(401).json({
          error: 'unauthorized',
          message: 'No user ID provided',
        });
        return;
      }

      const user = await UserService.findById(userId);

      if (!user) {
        res.status(404).json({
          error: 'user_not_found',
          message: 'User not found',
        });
        return;
      }

      res.json({ user });
    } catch (error) {
      console.error('Error getting user info:', error);
      res.status(500).json({
        error: 'server_error',
        message: 'Failed to get user information',
      });
    }
  }

  /**
   * Déconnexion (en production, invalider le token de session)
   * POST /api/auth/logout
   */
  static async logout(_req: Request, res: Response): Promise<void> {
    try {
      // En production, supprimer le token de session de Redis
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Error logging out:', error);
      res.status(500).json({
        error: 'logout_failed',
        message: 'Failed to logout',
      });
    }
  }
}
