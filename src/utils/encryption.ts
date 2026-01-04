import crypto from 'crypto';

// Algorithme de chiffrement AES-256-GCM (Galois/Counter Mode)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Pour AES, c'est toujours 16 bytes
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;

/**
 * Dérive une clé de chiffrement à partir de la clé secrète
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Chiffre une chaîne de caractères avec AES-256-GCM
 */
export function encrypt(text: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY not defined in environment variables');
  }

  // Générer un salt et un IV aléatoires
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(encryptionKey, salt);

  // Créer le cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Chiffrer le texte
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Récupérer le tag d'authentification
  const tag = cipher.getAuthTag();

  // Combiner salt + iv + tag + encrypted dans un seul string
  // Format: salt:iv:tag:encrypted
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Déchiffre une chaîne chiffrée avec AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY not defined in environment variables');
  }

  try {
    // Séparer les composants
    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted text format');
    }

    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];

    // Dériver la clé
    const key = deriveKey(encryptionKey, salt);

    // Créer le decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Déchiffrer
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: Invalid encrypted text or key');
  }
}
