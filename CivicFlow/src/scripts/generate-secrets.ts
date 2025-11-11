#!/usr/bin/env node
/**
 * Generate Secure Secrets for Railway Deployment
 * 
 * This script generates cryptographically secure random strings
 * for JWT_SECRET and ENCRYPTION_KEY environment variables.
 * 
 * Usage:
 *   npm run generate-secrets
 *   node dist/scripts/generate-secrets.js
 */

import * as crypto from 'crypto';

interface Secrets {
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
}

/**
 * Generate a cryptographically secure random string
 */
function generateSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate all required secrets
 */
function generateSecrets(): Secrets {
  return {
    JWT_SECRET: generateSecret(32),
    ENCRYPTION_KEY: generateSecret(32)
  };
}

/**
 * Display secrets in Railway-compatible format
 */
function displaySecrets(secrets: Secrets): void {
  console.log('\n=================================================');
  console.log('🔐 Generated Secure Secrets for Railway');
  console.log('=================================================\n');
  
  console.log('Copy these values to your Railway environment variables:\n');
  
  console.log('JWT_SECRET=' + secrets.JWT_SECRET);
  console.log('ENCRYPTION_KEY=' + secrets.ENCRYPTION_KEY);
  
  console.log('\n=================================================');
  console.log('📋 Instructions:');
  console.log('=================================================\n');
  console.log('1. Go to your Railway project');
  console.log('2. Click on your service');
  console.log('3. Go to Variables tab');
  console.log('4. Click "Raw Editor"');
  console.log('5. Paste the above variables');
  console.log('6. Click "Update Variables"\n');
  
  console.log('⚠️  IMPORTANT: Keep these secrets secure!');
  console.log('   - Never commit them to Git');
  console.log('   - Store them in a password manager');
  console.log('   - Rotate them regularly\n');
}

/**
 * Validate existing secrets
 */
function validateSecrets(): void {
  const jwtSecret = process.env.JWT_SECRET;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  console.log('\n=================================================');
  console.log('🔍 Validating Existing Secrets');
  console.log('=================================================\n');
  
  let hasIssues = false;
  
  if (!jwtSecret) {
    console.log('❌ JWT_SECRET is not set');
    hasIssues = true;
  } else if (jwtSecret.length < 32) {
    console.log('⚠️  JWT_SECRET is too short (should be at least 32 characters)');
    hasIssues = true;
  } else {
    console.log('✓ JWT_SECRET is set and valid');
  }
  
  if (!encryptionKey) {
    console.log('❌ ENCRYPTION_KEY is not set');
    hasIssues = true;
  } else if (encryptionKey.length < 32) {
    console.log('⚠️  ENCRYPTION_KEY is too short (should be at least 32 characters)');
    hasIssues = true;
  } else {
    console.log('✓ ENCRYPTION_KEY is set and valid');
  }
  
  if (hasIssues) {
    console.log('\n⚠️  Issues found with secrets. Generate new ones with:');
    console.log('   npm run generate-secrets\n');
  } else {
    console.log('\n✓ All secrets are properly configured!\n');
  }
}

/**
 * Main execution
 */
function main(): void {
  const args = process.argv.slice(2);
  
  if (args.includes('--validate') || args.includes('-v')) {
    validateSecrets();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log('\nUsage: npm run generate-secrets [options]\n');
    console.log('Options:');
    console.log('  --validate, -v    Validate existing secrets');
    console.log('  --help, -h        Show this help message\n');
  } else {
    const secrets = generateSecrets();
    displaySecrets(secrets);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { generateSecrets, validateSecrets };
