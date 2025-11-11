import database from '../config/database';
import { User, CreateUserData, RefreshToken } from '../models/user';

class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT 
        id, email, password_hash as "passwordHash", 
        first_name as "firstName", last_name as "lastName",
        role, is_active as "isActive", 
        last_login_at as "lastLoginAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE email = $1
    `;
    
    const result = await database.query(query, [email]);
    return (result.rows[0] as User) || null;
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT 
        id, email, password_hash as "passwordHash", 
        first_name as "firstName", last_name as "lastName",
        role, is_active as "isActive", 
        last_login_at as "lastLoginAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE id = $1
    `;
    
    const result = await database.query(query, [id]);
    return (result.rows[0] as User) || null;
  }

  async create(userData: CreateUserData & { passwordHash: string }): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id, email, password_hash as "passwordHash", 
        first_name as "firstName", last_name as "lastName",
        role, is_active as "isActive", 
        last_login_at as "lastLoginAt",
        created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    const result = await database.query(query, [
      userData.email,
      userData.passwordHash,
      userData.firstName,
      userData.lastName,
      userData.role,
    ]);
    
    return result.rows[0] as User;
  }

  async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    
    await database.query(query, [userId]);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $1
    `;
    
    await database.query(query, [passwordHash, userId]);
  }

  // Refresh token methods
  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id as "userId", token, expires_at as "expiresAt", created_at as "createdAt"
    `;
    
    const result = await database.query(query, [userId, token, expiresAt]);
    return result.rows[0] as RefreshToken;
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    const query = `
      SELECT id, user_id as "userId", token, expires_at as "expiresAt", created_at as "createdAt"
      FROM refresh_tokens
      WHERE token = $1 AND expires_at > NOW()
    `;
    
    const result = await database.query(query, [token]);
    return (result.rows[0] as RefreshToken) || null;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    const query = `DELETE FROM refresh_tokens WHERE token = $1`;
    await database.query(query, [token]);
  }

  async deleteUserRefreshTokens(userId: string): Promise<void> {
    const query = `DELETE FROM refresh_tokens WHERE user_id = $1`;
    await database.query(query, [userId]);
  }

  async deleteExpiredRefreshTokens(): Promise<void> {
    const query = `DELETE FROM refresh_tokens WHERE expires_at <= NOW()`;
    await database.query(query);
  }
}

export default new UserRepository();
