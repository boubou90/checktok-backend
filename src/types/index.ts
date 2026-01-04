import { Request } from 'express';

// Types pour l'authentification
export interface User {
  id: string;
  tiktok_user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  created_at: string;
}

// Extension de Request pour inclure l'utilisateur authentifié
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Catégories de vidéos
export type VideoCategory =
  | 'recipe'
  | 'fitness'
  | 'shopping'
  | 'diy'
  | 'education'
  | 'travel'
  | 'other';

// Structure flexible pour les données extraites
export interface RecipeData {
  ingredients: string[];
  steps: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: number;
}

export interface FitnessData {
  exerciseName: string;
  duration?: string;
  repetitions?: number;
  sets?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ShoppingData {
  products: Array<{
    name: string;
    link?: string;
    price?: string;
  }>;
}

export interface DIYData {
  materials: string[];
  steps: string[];
  difficulty?: string;
  estimatedTime?: string;
}

export interface EducationData {
  topic: string;
  keyPoints: string[];
  resources?: string[];
}

export interface TravelData {
  destination: string;
  tips: string[];
  estimatedCost?: string;
}

export type ExtractedData =
  | RecipeData
  | FitnessData
  | ShoppingData
  | DIYData
  | EducationData
  | TravelData
  | Record<string, unknown>;

// Vidéo sauvegardée
export interface SavedVideo {
  id: string;
  user_id: string;
  tiktok_video_id: string;
  video_url: string;
  thumbnail_url: string;
  title: string;
  description: string;
  author_username: string;
  category: VideoCategory;
  extracted_data: ExtractedData;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

// Action utilisateur
export interface UserAction {
  id: string;
  video_id: string;
  action_text: string;
  is_completed: boolean;
  completed_at: string | null;
}

// Réponse TikTok OAuth
export interface TikTokAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
  scope: string;
  token_type: string;
}

// Données utilisateur TikTok
export interface TikTokUserInfo {
  open_id: string;
  union_id: string;
  avatar_url: string;
  display_name: string;
}

// Vidéo TikTok depuis l'API
export interface TikTokVideo {
  id: string;
  video_description: string;
  share_url: string;
  cover_image_url: string;
  title: string;
  create_time: number;
}

// Réponse de l'analyse IA
export interface AIAnalysisResponse {
  category: VideoCategory;
  action_title: string;
  extracted_data: ExtractedData;
  confidence_score: number;
}

// Configuration de l'environnement
export interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  TIKTOK_CLIENT_KEY: string;
  TIKTOK_CLIENT_SECRET: string;
  TIKTOK_REDIRECT_URI: string;
  OPENAI_API_KEY: string;
  ENCRYPTION_KEY: string;
  FRONTEND_URL: string;
  SESSION_SECRET: string;
}
