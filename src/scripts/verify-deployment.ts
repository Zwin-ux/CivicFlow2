/**
 * Deployment Verification Script
 * 
 * This script verifies that a deployment is successful by:
 * 1. Testing all critical endpoints
 * 2. Verifying demo users can login
 * 3. Checking database has demo data
 * 4. Generating deployment report
 */

import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';

interface VerificationResult {
  test: string;
  passed: boolean;
  message: string;
  duration?: number;
  details?: any;
}

interface DeploymentReport {
  timestamp: string;
  baseUrl: string;
  environment: string;
  overallStatus: 'PASSED' | 'FAILED' | 'PARTIAL';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: VerificationResult[];
  summary: string;
}

class DeploymentVerification {
  private baseUrl: string;
  private client: AxiosInstance;
  private results: VerificationResult[] = [];
  private authTokens: { [key: string]: string } = {};

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.BASE_URL || 'http://localhost:3000';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status
    });
  }

  /**
   * Add test result
   */
  private addResult(test: string, passed: boolean, message: string, duration?: number, details?: any): void {
    this.results.push({ test, passed, message, duration, details });
    const status = passed ? '' : '';
    const durationStr = duration ? ` (${duration}ms)` : '';
    logger.info(`${status} ${test}: ${message}${durationStr}`);
  }

  /**
   * Test 1: Health check endpoint
   */
  private async testHealthCheck(): Promise<void> {
    const start = Date.now();
    try {
      const response = await this.client.get('/api/v1/health');
      const duration = Date.now() - start;

      if (response.status === 200 && response.data.status === 'ok') {
        this.addResult('Health Check', true, 'Basic health check passed', duration);
      } else {
        this.addResult('Health Check', false, `Unexpected response: ${response.status}`, duration);
      }
    } catch (error: any) {
      this.addResult('Health Check', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 2: Detailed health check
   */
  private async testDetailedHealth(): Promise<void> {
    const start = Date.now();
    try {
      const response = await this.client.get('/api/v1/health/detailed');
      const duration = Date.now() - start;

      if (response.status === 200 || response.status === 503) {
        const health = response.data;
        const dbOk = health.services?.database?.status === 'ok';
        const redisOk = health.services?.redis?.status === 'ok';

        if (dbOk && redisOk) {
          this.addResult('Detailed Health', true, 'All services healthy', duration, {
            status: health.status,
            dbLatency: health.services.database.latency,
            redisLatency: health.services.redis.latency,
          });
        } else {
          this.addResult('Detailed Health', false, 'Some services unhealthy', duration, health.services);
        }
      } else {
        this.addResult('Detailed Health', false, `Unexpected status: ${response.status}`, duration);
      }
    } catch (error: any) {
      this.addResult('Detailed Health', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 3: Demo applicant login
   */
  private async testDemoApplicantLogin(): Promise<void> {
    const start = Date.now();
    try {
      const response = await this.client.post('/api/v1/auth/login', {
        username: 'demo-applicant',
        password: 'Demo123!',
      });
      const duration = Date.now() - start;

      if (response.status === 200 && response.data.token) {
        this.authTokens.applicant = response.data.token;
        this.addResult('Demo Applicant Login', true, 'Login successful', duration, {
          role: response.data.user?.role,
        });
      } else {
        this.addResult('Demo Applicant Login', false, `Login failed: ${response.status}`, duration);
      }
    } catch (error: any) {
      this.addResult('Demo Applicant Login', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 4: Demo staff login
   */
  private async testDemoStaffLogin(): Promise<void> {
    const start = Date.now();
    try {
      const response = await this.client.post('/api/v1/auth/login', {
        username: 'demo-staff',
        password: 'Demo123!',
      });
      const duration = Date.now() - start;

      if (response.status === 200 && response.data.token) {
        this.authTokens.staff = response.data.token;
        this.addResult('Demo Staff Login', true, 'Login successful', duration, {
          role: response.data.user?.role,
        });
      } else {
        this.addResult('Demo Staff Login', false, `Login failed: ${response.status}`, duration);
      }
    } catch (error: any) {
      this.addResult('Demo Staff Login', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 5: Demo admin login
   */
  private async testDemoAdminLogin(): Promise<void> {
    const start = Date.now();
    try {
      const response = await this.client.post('/api/v1/auth/login', {
        username: 'demo-admin',
        password: 'Demo123!',
      });
      const duration = Date.now() - start;

      if (response.status === 200 && response.data.token) {
        this.authTokens.admin = response.data.token;
        this.addResult('Demo Admin Login', true, 'Login successful', duration, {
          role: response.data.user?.role,
        });
      } else {
        this.addResult('Demo Admin Login', false, `Login failed: ${response.status}`, duration);
      }
    } catch (error: any) {
      this.addResult('Demo Admin Login', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 6: Check demo data exists
   */
  private async testDemoDataExists(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.authTokens.staff) {
        this.addResult('Demo Data Check', false, 'No staff token available');
        return;
      }

      const response = await this.client.get('/api/v1/applications', {
        headers: { Authorization: `Bearer ${this.authTokens.staff}` },
      });
      const duration = Date.now() - start;

      if (response.status === 200 && Array.isArray(response.data)) {
        const count = response.data.length;
        if (count > 0) {
          this.addResult('Demo Data Check', true, `Found ${count} applications`, duration);
        } else {
          this.addResult('Demo Data Check', false, 'No applications found', duration);
        }
      } else {
        this.addResult('Demo Data Check', false, `Unexpected response: ${response.status}`, duration);
      }
    } catch (error: any) {
      this.addResult('Demo Data Check', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 7: Test applicant can view their profile
   */
  private async testApplicantProfile(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.authTokens.applicant) {
        this.addResult('Applicant Profile', false, 'No applicant token available');
        return;
      }

      const response = await this.client.get('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${this.authTokens.applicant}` },
      });
      const duration = Date.now() - start;

      if (response.status === 200 && response.data.username === 'demo-applicant') {
        this.addResult('Applicant Profile', true, 'Profile retrieved successfully', duration);
      } else {
        this.addResult('Applicant Profile', false, `Unexpected response: ${response.status}`, duration);
      }
    } catch (error: any) {
      this.addResult('Applicant Profile', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 8: Test static files are served
   */
  private async testStaticFiles(): Promise<void> {
    const start = Date.now();
    try {
      const response = await this.client.get('/index.html');
      const duration = Date.now() - start;

      if (response.status === 200 && response.data.includes('Government Lending')) {
        this.addResult('Static Files', true, 'Homepage served successfully', duration);
      } else {
        this.addResult('Static Files', false, `Unexpected response: ${response.status}`, duration);
      }
    } catch (error: any) {
      this.addResult('Static Files', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 9: Test API documentation
   */
  private async testApiDocs(): Promise<void> {
    const start = Date.now();
    try {
      const response = await this.client.get('/api-docs');
      const duration = Date.now() - start;

      if (response.status === 200 || response.status === 301 || response.status === 302) {
        this.addResult('API Documentation', true, 'API docs accessible', duration);
      } else {
        this.addResult('API Documentation', false, `Unexpected response: ${response.status}`, duration);
      }
    } catch (error: any) {
      this.addResult('API Documentation', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 10: Test metrics endpoint (admin only)
   */
  private async testMetricsEndpoint(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.authTokens.admin) {
        this.addResult('Metrics Endpoint', false, 'No admin token available');
        return;
      }

      const response = await this.client.get('/api/v1/metrics/summary', {
        headers: { Authorization: `Bearer ${this.authTokens.admin}` },
      });
      const duration = Date.now() - start;

      if (response.status === 200) {
        this.addResult('Metrics Endpoint', true, 'Metrics accessible', duration);
      } else {
        this.addResult('Metrics Endpoint', false, `Unexpected response: ${response.status}`, duration);
      }
    } catch (error: any) {
      this.addResult('Metrics Endpoint', false, `Error: ${error.message}`);
    }
  }

  /**
   * Generate deployment report
   */
  private generateReport(): DeploymentReport {
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    const totalTests = this.results.length;

    let overallStatus: 'PASSED' | 'FAILED' | 'PARTIAL';
    if (failedTests === 0) {
      overallStatus = 'PASSED';
    } else if (passedTests === 0) {
      overallStatus = 'FAILED';
    } else {
      overallStatus = 'PARTIAL';
    }

    const summary = `${passedTests}/${totalTests} tests passed. ${failedTests} failed.`;

    return {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      environment: process.env.NODE_ENV || 'unknown',
      overallStatus,
      totalTests,
      passedTests,
      failedTests,
      results: this.results,
      summary,
    };
  }

  /**
   * Print report to console
   */
  private printReport(report: DeploymentReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('DEPLOYMENT VERIFICATION REPORT');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Base URL: ${report.baseUrl}`);
    console.log(`Environment: ${report.environment}`);
    console.log(`Overall Status: ${report.overallStatus}`);
    console.log(`Tests: ${report.passedTests}/${report.totalTests} passed, ${report.failedTests} failed`);
    console.log('='.repeat(80));
    console.log('\nTest Results:');
    console.log('-'.repeat(80));

    report.results.forEach((result, index) => {
      const status = result.passed ? ' PASS' : ' FAIL';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`${index + 1}. ${status} - ${result.test}${duration}`);
      console.log(`   ${result.message}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });

    console.log('-'.repeat(80));
    console.log(`\nSummary: ${report.summary}`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Run all verification tests
   */
  public async verify(): Promise<DeploymentReport> {
    logger.info(`Starting deployment verification for ${this.baseUrl}`);
    console.log(`\nVerifying deployment at: ${this.baseUrl}\n`);

    // Run all tests
    await this.testHealthCheck();
    await this.testDetailedHealth();
    await this.testDemoApplicantLogin();
    await this.testDemoStaffLogin();
    await this.testDemoAdminLogin();
    await this.testDemoDataExists();
    await this.testApplicantProfile();
    await this.testStaticFiles();
    await this.testApiDocs();
    await this.testMetricsEndpoint();

    // Generate and print report
    const report = this.generateReport();
    this.printReport(report);

    return report;
  }
}

// Export for use in other scripts
export default DeploymentVerification;

// Allow running as standalone script
if (require.main === module) {
  const baseUrl = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000';
  const verification = new DeploymentVerification(baseUrl);

  verification.verify()
    .then((report) => {
      process.exit(report.overallStatus === 'PASSED' ? 0 : 1);
    })
    .catch((error) => {
      logger.error('Verification failed with error', { error });
      console.error('Fatal error during verification:', error);
      process.exit(1);
    });
}
