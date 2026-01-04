import { supabase } from '../config/supabase.js';
import { User } from '../types/index.js';
import { encrypt, decrypt } from '../utils/encryption.js';

/**
 * Service pour gérer les utilisateurs dans Supabase
 */
export class UserService {
  /**
   * Trouve un utilisateur par son TikTok user ID
   */
  static async findByTikTokUserId(tiktokUserId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, tiktok_user_id, username, display_name, avatar_url, created_at')
      .eq('tiktok_user_id', tiktokUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Aucun utilisateur trouvé
        return null;
      }
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Trouve un utilisateur par son ID
   */
  static async findById(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, tiktok_user_id, username, display_name, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Crée un nouvel utilisateur
   */
  static async create(userData: {
    tiktok_user_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    access_token: string;
    refresh_token: string;
  }): Promise<User> {
    // Chiffrer les tokens avant de les stocker
    const encryptedAccessToken = encrypt(userData.access_token);
    const encryptedRefreshToken = encrypt(userData.refresh_token);

    const { data, error } = await supabase
      .from('users')
      .insert({
        tiktok_user_id: userData.tiktok_user_id,
        username: userData.username,
        display_name: userData.display_name,
        avatar_url: userData.avatar_url,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
      })
      .select('id, tiktok_user_id, username, display_name, avatar_url, created_at')
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Met à jour les tokens d'un utilisateur
   */
  static async updateTokens(
    userId: string,
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = encrypt(refreshToken);

    const { error } = await supabase
      .from('users')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update tokens: ${error.message}`);
    }
  }

  /**
   * Met à jour les informations du profil utilisateur
   */
  static async updateProfile(
    userId: string,
    profile: {
      username?: string;
      display_name?: string;
      avatar_url?: string;
    }
  ): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(profile)
      .eq('id', userId)
      .select('id, tiktok_user_id, username, display_name, avatar_url, created_at')
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Récupère les tokens déchiffrés d'un utilisateur
   */
  static async getDecryptedTokens(
    userId: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const { data, error } = await supabase
      .from('users')
      .select('access_token, refresh_token')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get tokens: ${error.message}`);
    }

    if (!data.access_token || !data.refresh_token) {
      return null;
    }

    try {
      return {
        accessToken: decrypt(data.access_token),
        refreshToken: decrypt(data.refresh_token),
      };
    } catch (error) {
      throw new Error('Failed to decrypt tokens');
    }
  }

  /**
   * Supprime un utilisateur et toutes ses données (RGPD)
   */
  static async delete(userId: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }
}
