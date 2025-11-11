import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config';
import userRepository from '../repositories/userRepository';
import { 
  User, 
  CreateUserData, 
  LoginCredentials, 
  AuthTokens, 
  TokenPayload,
  UserResponse 
} from '../models/user';
import logger from '../utils/logger';

class AuthService {
  private readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
  private readonly SALT_ROUNDS = 10;

  /**
   * Register a new user
   */
  async register(userData: CreateUserData): Promise<UserResponse> {
    // Check if user already exists
    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, this.SALT_ROUNDS);

    // Create user
    const user = await userRepository.create({
      ...userData,
      passwordHash,
    });

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    return this.sanitizeUser(user);
  }

  /**
   * Login user and generate tokens
   */
  async login(credentials: LoginCredentials): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    // Find user by email
    const user = await userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await userRepository.deleteRefreshToken(refreshToken);
    logger.info('User logged out successfully');
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Find refresh token in database
    const storedToken = await userRepository.findRefreshToken(refreshToken);
    if (!storedToken) {
      throw new Error('Invalid or expired refresh token');
    }

    // Verify refresh token
    try {
      const decoded = jwt.verify(refreshToken, config.security.jwtSecret) as TokenPayload;
      
      // Get user
      const user = await userRepository.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Delete old refresh token
      await userRepository.deleteRefreshToken(refreshToken);

      logger.info('Access token refreshed successfully', { userId: user.id });

      return tokens;
    } catch (error) {
      // Delete invalid token
      await userRepository.deleteRefreshToken(refreshToken);
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Verify access token and return user payload
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.security.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, config.security.jwtSecret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    // Generate refresh token
    const refreshToken = jwt.sign(payload, config.security.jwtSecret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    // Calculate expiry date for refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store refresh token in database
    await userRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: User): UserResponse {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Update password
    await userRepository.updatePassword(userId, passwordHash);

    // Invalidate all refresh tokens
    await userRepository.deleteUserRefreshTokens(userId);

    logger.info('Password changed successfully', { userId });
  }

  /**
   * Clean up expired refresh tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<void> {
    await userRepository.deleteExpiredRefreshTokens();
    logger.info('Expired refresh tokens cleaned up');
  }
}

export default new AuthService();
