#!/usr/bin/env node
/**
 * Pre-Deployment Checklist for Railway
 * 
 * This script verifies that the application is ready for deployment
 * by checking configuration, dependencies, and build requirements.
 * 
 * Usage:
 *   npm run pre-deployment-check
 */

import * as fs from 'fs';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

class PreDeploymentChecker {
  private results: CheckResult[] = [];
  
  /**
   * Add a check result
   */
  private addResult(name: string, status: 'pass' | 'fail' | 'warn', message: string): void {
    this.results.push({ name, status, message });
  }
  
  /**
   * Check if required files exist
   */
  private checkRequiredFiles(): void {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'railway.json',
      '.env.production.template',
      'src/index.ts',
      'src/app.ts'
    ];
    
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        this.addResult(`File: ${file}`, 'pass', 'File exists');
      } else {
        this.addResult(`File: ${file}`, 'fail', 'File is missing');
      }
    }
  }
  
  /**
   * Check package.json configuration
   */
  private checkPackageJson(): void {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      
      // Check scripts
      const requiredScripts = ['build', 'start', 'migrate', 'seed'];
      for (const script of requiredScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.addResult(`Script: ${script}`, 'pass', 'Script is defined');
        } else {
          this.addResult(`Script: ${script}`, 'fail', 'Script is missing');
        }
      }
      
      // Check engines
      if (packageJson.engines && packageJson.engines.node) {
        this.addResult('Node version', 'pass', `Specified: ${packageJson.engines.node}`);
      } else {
        this.addResult('Node version', 'warn', 'Node version not specified in engines');
      }
      
      // Check dependencies
      const criticalDeps = ['express', 'pg', 'redis'];
      for (const dep of criticalDeps) {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          this.addResult(`Dependency: ${dep}`, 'pass', 'Installed');
        } else {
          this.addResult(`Dependency: ${dep}`, 'fail', 'Missing');
        }
      }
      
      // Check devDependencies
      if (packageJson.devDependencies && packageJson.devDependencies['typescript']) {
        this.addResult('DevDependency: typescript', 'pass', 'Installed');
      } else {
        this.addResult('DevDependency: typescript', 'fail', 'Missing');
      }
      
    } catch (error) {
      this.addResult('package.json', 'fail', 'Failed to parse package.json');
    }
  }
  
  /**
   * Check Railway configuration
   */
  private checkRailwayConfig(): void {
    try {
      const railwayConfig = JSON.parse(fs.readFileSync('railway.json', 'utf-8'));
      
      if (railwayConfig.$schema) {
        this.addResult('Railway schema', 'pass', 'Schema is defined');
      }
      
      if (railwayConfig.build && railwayConfig.build.builder === 'NIXPACKS') {
        this.addResult('Railway builder', 'pass', 'Using NIXPACKS');
      } else {
        this.addResult('Railway builder', 'warn', 'Builder not specified or not NIXPACKS');
      }
      
      if (railwayConfig.deploy && railwayConfig.deploy.startCommand) {
        this.addResult('Start command', 'pass', railwayConfig.deploy.startCommand);
      } else {
        this.addResult('Start command', 'warn', 'Start command not specified');
      }
      
      if (railwayConfig.deploy && railwayConfig.deploy.healthcheckPath) {
        this.addResult('Health check', 'pass', railwayConfig.deploy.healthcheckPath);
      } else {
        this.addResult('Health check', 'warn', 'Health check path not specified');
      }
      
    } catch (error) {
      this.addResult('railway.json', 'fail', 'Failed to parse railway.json');
    }
  }
  
  /**
   * Check environment template
   */
  private checkEnvTemplate(): void {
    try {
      const envTemplate = fs.readFileSync('.env.production.template', 'utf-8');
      
      const requiredVars = [
        'NODE_ENV',
        'DATABASE_URL',
        'REDIS_URL',
        'JWT_SECRET',
        'ENCRYPTION_KEY',
        'DEMO_MODE_ENABLED',
        'LLM_PROVIDER'
      ];
      
      for (const varName of requiredVars) {
        if (envTemplate.includes(varName)) {
          this.addResult(`Env var: ${varName}`, 'pass', 'Documented in template');
        } else {
          this.addResult(`Env var: ${varName}`, 'warn', 'Not documented in template');
        }
      }
      
    } catch (error) {
      this.addResult('.env.production.template', 'fail', 'Failed to read template');
    }
  }
  
  /**
   * Check database migrations
   */
  private checkMigrations(): void {
    const migrationsDir = 'src/database/migrations';
    
    if (fs.existsSync(migrationsDir)) {
      const migrations = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
      
      if (migrations.length > 0) {
        this.addResult('Database migrations', 'pass', `${migrations.length} migrations found`);
      } else {
        this.addResult('Database migrations', 'warn', 'No migrations found');
      }
    } else {
      this.addResult('Database migrations', 'fail', 'Migrations directory not found');
    }
  }
  
  /**
   * Check database seeds
   */
  private checkSeeds(): void {
    const seedsDir = 'src/database/seeds';
    
    if (fs.existsSync(seedsDir)) {
      const seeds = fs.readdirSync(seedsDir)
        .filter(f => f.endsWith('.ts'))
        .sort();
      
      if (seeds.length > 0) {
        this.addResult('Database seeds', 'pass', `${seeds.length} seed files found`);
        
        // Check for demo data seed
        const hasDemoData = seeds.some(s => s.includes('demo'));
        if (hasDemoData) {
          this.addResult('Demo data seed', 'pass', 'Demo data seed exists');
        } else {
          this.addResult('Demo data seed', 'warn', 'No demo data seed found');
        }
      } else {
        this.addResult('Database seeds', 'warn', 'No seed files found');
      }
    } else {
      this.addResult('Database seeds', 'fail', 'Seeds directory not found');
    }
  }
  
  /**
   * Check TypeScript configuration
   */
  private checkTypeScriptConfig(): void {
    try {
      const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf-8'));
      
      if (tsConfig.compilerOptions) {
        const outDir = tsConfig.compilerOptions.outDir;
        if (outDir) {
          this.addResult('TypeScript outDir', 'pass', `Output: ${outDir}`);
        } else {
          this.addResult('TypeScript outDir', 'warn', 'outDir not specified');
        }
        
        const target = tsConfig.compilerOptions.target;
        if (target) {
          this.addResult('TypeScript target', 'pass', `Target: ${target}`);
        }
      }
      
    } catch (error) {
      this.addResult('tsconfig.json', 'fail', 'Failed to parse tsconfig.json');
    }
  }
  
  /**
   * Check static files
   */
  private checkStaticFiles(): void {
    const publicDir = 'public';
    
    if (fs.existsSync(publicDir)) {
      const htmlFiles = fs.readdirSync(publicDir)
        .filter(f => f.endsWith('.html'));
      
      if (htmlFiles.length > 0) {
        this.addResult('Static HTML files', 'pass', `${htmlFiles.length} HTML files found`);
        
        // Check for key portal files
        const keyFiles = ['applicant-portal.html', 'staff-portal.html', 'admin-dashboard.html'];
        for (const file of keyFiles) {
          if (htmlFiles.includes(file)) {
            this.addResult(`Portal: ${file}`, 'pass', 'File exists');
          } else {
            this.addResult(`Portal: ${file}`, 'warn', 'File not found');
          }
        }
      } else {
        this.addResult('Static HTML files', 'warn', 'No HTML files found');
      }
    } else {
      this.addResult('Public directory', 'fail', 'Public directory not found');
    }
  }
  
  /**
   * Run all checks
   */
  public async runAllChecks(): Promise<void> {
    console.log('\n=================================================');
    console.log('🔍 Pre-Deployment Checklist for Railway');
    console.log('=================================================\n');
    
    console.log('Running checks...\n');
    
    this.checkRequiredFiles();
    this.checkPackageJson();
    this.checkRailwayConfig();
    this.checkEnvTemplate();
    this.checkMigrations();
    this.checkSeeds();
    this.checkTypeScriptConfig();
    this.checkStaticFiles();
    
    this.displayResults();
  }
  
  /**
   * Display check results
   */
  private displayResults(): void {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warn').length;
    
    console.log('=================================================');
    console.log('📊 Check Results');
    console.log('=================================================\n');
    
    // Group by status
    const failedChecks = this.results.filter(r => r.status === 'fail');
    const warnChecks = this.results.filter(r => r.status === 'warn');
    const passedChecks = this.results.filter(r => r.status === 'pass');
    
    if (failedChecks.length > 0) {
      console.log('❌ FAILED CHECKS:\n');
      failedChecks.forEach(r => {
        console.log(`   ${r.name}: ${r.message}`);
      });
      console.log('');
    }
    
    if (warnChecks.length > 0) {
      console.log('⚠️  WARNINGS:\n');
      warnChecks.forEach(r => {
        console.log(`   ${r.name}: ${r.message}`);
      });
      console.log('');
    }
    
    if (passedChecks.length > 0) {
      console.log('✓ PASSED CHECKS:\n');
      passedChecks.forEach(r => {
        console.log(`   ${r.name}: ${r.message}`);
      });
      console.log('');
    }
    
    console.log('=================================================');
    console.log('Summary:');
    console.log(`  ✓ Passed: ${passed}`);
    console.log(`  ⚠️  Warnings: ${warnings}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log('=================================================\n');
    
    if (failed === 0) {
      console.log('✅ All critical checks passed! Ready for deployment.\n');
      console.log('Next steps:');
      console.log('1. Create Railway project');
      console.log('2. Add PostgreSQL and Redis services');
      console.log('3. Configure environment variables');
      console.log('4. Deploy application\n');
      console.log('See RAILWAY_DEPLOYMENT_GUIDE.md for detailed instructions.\n');
    } else {
      console.log('❌ Some checks failed. Please fix the issues before deploying.\n');
      process.exit(1);
    }
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const checker = new 