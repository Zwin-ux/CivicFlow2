/**
 * AI Services Verification Script
 * Tests LLM client, Azure Document Intelligence, and AI-powered features
 */

import llmClient from '../clients/llmClient';
import azureDocumentIntelligenceClient from '../clients/azureDocumentIntelligenceClient';
import config from '../config';

interface VerificationResult {
  service: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

class AIServicesVerifier {
  private results: VerificationResult[] = [];

  /**
   * Run all verification tests
   */
  async verify(): Promise<void> {
    console.log('='.repeat(60));
    console.log('AI Services Verification');
    console.log('='.repeat(60));
    console.log('');

    // Verify LLM service
    await this.verifyLLMService();

    // Verify Azure Document Intelligence
    await this.verifyAzureDocumentIntelligence();

    // Print summary
    this.printSummary();
  }

  /**
   * Verify LLM service (OpenAI or Claude)
   */
  private async verifyLLMService(): Promise<void> {
    console.log('Testing LLM Service...');
    console.log(`Provider: ${config.ai.llm.provider}`);

    try {
      // Check if API key is configured
      const provider = config.ai.llm.provider;
      const apiKey = provider === 'openai' 
        ? config.ai.llm.openai.apiKey 
        : config.ai.llm.claude.apiKey;

      if (!apiKey) {
        this.results.push({
          service: 'LLM Service',
          status: 'FAIL',
          message: `${provider.toUpperCase()} API key not configured`,
        });
        console.log('❌ FAIL: API key not configured\n');
        return;
      }

      // Test basic completion
      console.log('  - Testing basic completion...');
      const result = await llmClient.complete(
        'Say "Hello, AI services are working!" in exactly those words.',
        {
          maxTokens: 50,
          temperature: 0,
        }
      );

      if (result.content && result.content.length > 0) {
        this.results.push({
          service: 'LLM Service',
          status: 'PASS',
          message: 'LLM service is working correctly',
          details: {
            provider: config.ai.llm.provider,
            model: result.model,
            tokensUsed: result.tokensUsed,
            processingTime: result.processingTime,
            response: result.content.substring(0, 100),
          },
        });
        console.log('✅ PASS: LLM service is working');
        console.log(`  Model: ${result.model}`);
        console.log(`  Tokens used: ${result.tokensUsed}`);
        console.log(`  Processing time: ${result.processingTime}ms`);
        console.log(`  Response: ${result.content.substring(0, 100)}...\n`);
      } else {
        this.results.push({
          service: 'LLM Service',
          status: 'FAIL',
          message: 'LLM returned empty response',
        });
        console.log('❌ FAIL: Empty response\n');
      }
    } catch (error: any) {
      this.results.push({
        service: 'LLM Service',
        status: 'FAIL',
        message: `LLM service error: ${error.message}`,
        details: { error: error.message },
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  /**
   * Verify Azure Document Intelligence
   */
  private async verifyAzureDocumentIntelligence(): Promise<void> {
    console.log('Testing Azure Document Intelligence...');

    try {
      // Check if credentials are configured
      const { endpoint, key } = config.ai.azureDocumentIntelligence;

      if (!endpoint || !key) {
        this.results.push({
          service: 'Azure Document Intelligence',
          status: 'SKIP',
          message: 'Azure Document Intelligence not configured (optional)',
        });
        console.log('⚠️  SKIP: Not configured (optional service)\n');
        return;
      }

      // Test health check
      console.log('  - Testing health check...');
      const isHealthy = await azureDocumentIntelligenceClient.healthCheck();

      if (isHealthy) {
        this.results.push({
          service: 'Azure Document Intelligence',
          status: 'PASS',
          message: 'Azure Document Intelligence is configured',
          details: {
            endpoint,
          },
        });
        console.log('✅ PASS: Azure Document Intelligence is configured');
        console.log(`  Endpoint: ${endpoint}\n`);
      } else {
        this.results.push({
          service: 'Azure Document Intelligence',
          status: 'FAIL',
          message: 'Azure Document Intelligence health check failed',
        });
        console.log('❌ FAIL: Health check failed\n');
      }
    } catch (error: any) {
      this.results.push({
        service: 'Azure Document Intelligence',
        status: 'FAIL',
        message: `Azure Document Intelligence error: ${error.message}`,
        details: { error: error.message },
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  /**
   * Print verification summary
   */
  private printSummary(): void {
    console.log('='.repeat(60));
    console.log('Verification Summary');
    console.log('='.repeat(60));
    console.log('');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;

    console.log(`Total tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log('');

    if (failed > 0) {
      console.log('Failed tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - ${r.service}: ${r.message}`);
        });
      console.log('');
    }

    // Exit with error code if any tests failed
    if (failed > 0) {
      console.log('⚠️  Some AI services are not working correctly.');
      console.log('Please check your environment variables and API keys.');
      process.exit(1);
    } else {
      console.log('✅ All AI services are working correctly!');
      process.exit(0);
    }
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new AIServicesVerifier();
  verifier.verify().catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}

export default AIServicesVerifier;
