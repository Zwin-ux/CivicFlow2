/**
 * TLS Configuration
 * Configures TLS 1.3 for secure HTTPS communications
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import logger from '../utils/logger';
import config from './index';

export interface TLSConfig {
  enabled: boolean;
  cert?: string;
  key?: string;
  ca?: string;
  minVersion: string;
  maxVersion: string;
  ciphers: string;
}

/**
 * Get TLS configuration from environment
 */
export function getTLSConfig(): TLSConfig {
  const tlsEnabled = process.env.TLS_ENABLED === 'true';
  
  return {
    enabled: tlsEnabled,
    cert: process.env.TLS_CERT_PATH,
    key: process.env.TLS_KEY_PATH,
    ca: process.env.TLS_CA_PATH,
    minVersion: 'TLSv1.3',
    maxVersion: 'TLSv1.3',
    // Recommended cipher suites for TLS 1.3
    ciphers: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
    ].join(':'),
  };
}

/**
 * Create HTTPS server options
 * @returns HTTPS server options or null if TLS is disabled
 */
export function createHTTPSOptions(): https.ServerOptions | null {
  const tlsConfig = getTLSConfig();

  if (!tlsConfig.enabled) {
    logger.info('TLS is disabled, using HTTP');
    return null;
  }

  if (!tlsConfig.cert || !tlsConfig.key) {
    logger.warn('TLS is enabled but certificate paths are not configured');
    return null;
  }

  try {
    const options: https.ServerOptions = {
      cert: fs.readFileSync(path.resolve(tlsConfig.cert)),
      key: fs.readFileSync(path.resolve(tlsConfig.key)),
      minVersion: tlsConfig.minVersion as any,
      maxVersion: tlsConfig.maxVersion as any,
      ciphers: tlsConfig.ciphers,
      honorCipherOrder: true,
      // Disable older protocols
      secureOptions: require('constants').SSL_OP_NO_TLSv1 | require('constants').SSL_OP_NO_TLSv1_1,
    };

    // Add CA certificate if provided
    if (tlsConfig.ca) {
      options.ca = fs.readFileSync(path.resolve(tlsConfig.ca));
    }

    logger.info('TLS 1.3 configuration loaded successfully', {
      minVersion: tlsConfig.minVersion,
      maxVersion: tlsConfig.maxVersion,
    });

    return options;
  } catch (error) {
    logger.error('Failed to load TLS certificates', { error });
    throw new Error('Failed to load TLS certificates');
  }
}

/**
 * Validate TLS configuration
 */
export function validateTLSConfig(): void {
  const tlsConfig = getTLSConfig();

  if (!tlsConfig.enabled) {
    if (config.env === 'production') {
      logger.warn('TLS is disabled in production environment. This is not recommended.');
    }
    return;
  }

  if (!tlsConfig.cert || !tlsConfig.key) {
    throw new Error('TLS is enabled but TLS_CERT_PATH and TLS_KEY_PATH are not configured');
  }

  // Check if certificate files exist
  if (!fs.existsSync(tlsConfig.cert)) {
    throw new Error(`TLS certificate file not found: ${tlsConfig.cert}`);
  }

  if (!fs.existsSync(tlsConfig.key)) {
    throw new Error(`TLS key file not found: ${tlsConfig.key}`);
  }

  if (tlsConfig.ca && !fs.existsSync(tlsConfig.ca)) {
    throw new Error(`TLS CA file not found: ${tlsConfig.ca}`);
  }

  logger.info('TLS configuration validated successfully');
}
