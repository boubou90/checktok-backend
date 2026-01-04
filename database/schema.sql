-- TikTok Save Organizer - Schéma de base de données Supabase
-- À exécuter dans le SQL Editor de Supabase

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tiktok_user_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  access_token TEXT, -- Sera chiffré côté application
  refresh_token TEXT, -- Sera chiffré côté application
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index sur tiktok_user_id pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_users_tiktok_user_id ON users(tiktok_user_id);

-- Table des vidéos sauvegardées
CREATE TABLE IF NOT EXISTS saved_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tiktok_video_id VARCHAR(255) NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title VARCHAR(500),
  description TEXT,
  author_username VARCHAR(255),
  category VARCHAR(50) CHECK (category IN ('recipe', 'fitness', 'shopping', 'diy', 'education', 'travel', 'other')),
  extracted_data JSONB DEFAULT '{}'::jsonb,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tiktok_video_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_saved_videos_user_id ON saved_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_videos_category ON saved_videos(category);
CREATE INDEX IF NOT EXISTS idx_saved_videos_is_completed ON saved_videos(is_completed);
CREATE INDEX IF NOT EXISTS idx_saved_videos_tiktok_video_id ON saved_videos(tiktok_video_id);

-- Table des actions utilisateur
CREATE TABLE IF NOT EXISTS user_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES saved_videos(id) ON DELETE CASCADE,
  action_text VARCHAR(500) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index sur video_id pour les jointures
CREATE INDEX IF NOT EXISTS idx_user_actions_video_id ON user_actions(video_id);

-- Fonction pour mettre à jour completed_at automatiquement
CREATE OR REPLACE FUNCTION update_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
    NEW.completed_at = NOW();
  ELSIF NEW.is_completed = FALSE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour saved_videos
DROP TRIGGER IF EXISTS trigger_update_saved_videos_completed_at ON saved_videos;
CREATE TRIGGER trigger_update_saved_videos_completed_at
  BEFORE UPDATE ON saved_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_completed_at();

-- Trigger pour user_actions
DROP TRIGGER IF EXISTS trigger_update_user_actions_completed_at ON user_actions;
CREATE TRIGGER trigger_update_user_actions_completed_at
  BEFORE UPDATE ON user_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_completed_at();

-- Vue pour obtenir les vidéos avec leurs actions
CREATE OR REPLACE VIEW videos_with_actions AS
SELECT
  sv.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', ua.id,
        'action_text', ua.action_text,
        'is_completed', ua.is_completed,
        'completed_at', ua.completed_at
      )
      ORDER BY ua.created_at
    ) FILTER (WHERE ua.id IS NOT NULL),
    '[]'::json
  ) as actions
FROM saved_videos sv
LEFT JOIN user_actions ua ON sv.id = ua.video_id
GROUP BY sv.id;

-- Politique RLS (Row Level Security) pour sécuriser les données
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent seulement voir leurs propres données
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view their own videos" ON saved_videos
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own actions" ON user_actions
  FOR SELECT USING (
    video_id IN (
      SELECT id FROM saved_videos WHERE user_id::text = auth.uid()::text
    )
  );

-- Note: Les opérations INSERT/UPDATE/DELETE seront faites via le service role key
-- côté backend pour plus de contrôle

-- Commentaires pour la documentation
COMMENT ON TABLE users IS 'Stocke les informations des utilisateurs authentifiés via TikTok OAuth';
COMMENT ON TABLE saved_videos IS 'Stocke les vidéos TikTok sauvegardées avec leur catégorisation IA';
COMMENT ON TABLE user_actions IS 'Stocke les actions à réaliser pour chaque vidéo';
COMMENT ON COLUMN users.access_token IS 'Token TikTok chiffré côté application (AES-256)';
COMMENT ON COLUMN users.refresh_token IS 'Refresh token TikTok chiffré côté application (AES-256)';
COMMENT ON COLUMN saved_videos.extracted_data IS 'Données structurées extraites par GPT-4o selon la catégorie';
