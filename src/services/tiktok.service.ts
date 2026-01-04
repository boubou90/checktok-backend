import axios from 'axios';
import { env } from '../config/env.js';
import { TikTokAuthResponse, TikTokUserInfo, TikTokVideo } from '../types/index.js';

// URLs de l'API TikTok
const TIKTOK_API_BASE = 'https://open.tiktokapis.com';
const TIKTOK_AUTH_BASE = 'https://www.tiktok.com/v2/auth';

/**
 * Service pour interagir avec l'API TikTok
 */
export class TikTokService {
  /**
   * Génère l'URL d'autorisation OAuth TikTok
   */
  static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY,
      scope: 'user.info.basic,video.list', // Permissions nécessaires
      response_type: 'code',
      redirect_uri: env.TIKTOK_REDIRECT_URI,
      state, // État pour la sécurité CSRF
    });

    return `${TIKTOK_AUTH_BASE}/authorize?${params.toString()}`;
  }

  /**
   * Échange le code d'autorisation contre un access token
   */
  static async getAccessToken(code: string): Promise<TikTokAuthResponse> {
    try {
      const response = await axios.post(
        `${TIKTOK_AUTH_BASE}/token/`,
        {
          client_key: env.TIKTOK_CLIENT_KEY,
          client_secret: env.TIKTOK_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: env.TIKTOK_REDIRECT_URI,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error_description || 'TikTok OAuth failed');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `TikTok token exchange failed: ${error.response?.data?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Rafraîchit un access token expiré
   */
  static async refreshAccessToken(refreshToken: string): Promise<TikTokAuthResponse> {
    try {
      const response = await axios.post(
        `${TIKTOK_AUTH_BASE}/token/`,
        {
          client_key: env.TIKTOK_CLIENT_KEY,
          client_secret: env.TIKTOK_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error_description || 'Token refresh failed');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `TikTok token refresh failed: ${error.response?.data?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Récupère les informations de l'utilisateur TikTok
   */
  static async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    try {
      const response = await axios.get(`${TIKTOK_API_BASE}/v2/user/info/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          fields: 'open_id,union_id,avatar_url,display_name',
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error.message || 'Failed to get user info');
      }

      return response.data.data.user;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to get TikTok user info: ${error.response?.data?.error?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Récupère les vidéos sauvegardées de l'utilisateur
   */
  static async getSavedVideos(
    accessToken: string,
    cursor?: string,
    maxCount: number = 20
  ): Promise<{ videos: TikTokVideo[]; cursor: string; hasMore: boolean }> {
    try {
      const params: Record<string, string | number> = {
        max_count: maxCount,
      };

      if (cursor) {
        params.cursor = cursor;
      }

      const response = await axios.post(
        `${TIKTOK_API_BASE}/v2/video/list/`,
        {
          // La liste des vidéos sauvegardées nécessite d'utiliser l'endpoint video.list
          filters: {
            video_ids: [], // Vide pour récupérer toutes les saves
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params,
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error.message || 'Failed to get saved videos');
      }

      const data = response.data.data;

      return {
        videos: data.videos || [],
        cursor: data.cursor || '',
        hasMore: data.has_more || false,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Si l'erreur est due à des permissions manquantes, retourner un tableau vide
        if (error.response?.status === 403) {
          console.warn('User has not granted permission to access saved videos');
          return { videos: [], cursor: '', hasMore: false };
        }
        throw new Error(
          `Failed to get saved videos: ${error.response?.data?.error?.message || error.message}`
        );
      }
      throw error;
    }
  }
}
