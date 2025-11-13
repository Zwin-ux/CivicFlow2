/**
 * LLM Client
 * Unified client for Large Language Model services (OpenAI, Claude)
 * with rate limiting, token management, and circuit breaker
 */

import OpenAI from 'openai';
import axios, { AxiosInstance } from 'axios';
import config from '../config';
import logger from '../utils/logger';
import { createCircuitBreaker, CircuitBreakerOptions } from '../utils/circuitBreaker';
import { ExternalServiceError } from '../utils/errors';
import CircuitBreaker from 'opossum';

export interface LLMCompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stopSequences?: string[];
}

export interface LLMCompletionResult {
  content: string;
  tokensUsed: number;
  model: string;
  finishReason: string;
  processingTime: number;
}

export interface RateLimitInfo {
  requestsRemaining: number;
  tokensRemaining: number;
  resetTime: Date;
}

class LLMClient {
  private openaiClient?: OpenAI;
  private claudeClient?: AxiosInstance;
  private provider: 'openai' | 'claude';
  private circuitBreaker: CircuitBreaker<any, LLMCompletionResult>;
  private rateLimitInfo: RateLimitInfo | null = null;
  private static instance: LLMClient;

  private constructor() {
    this.provider = config.ai.llm.provider;

    // Initialize OpenAI client
    if (this.provider === 'openai' && config.ai.llm.openai.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: config.ai.llm.openai.apiKey,
        timeout: config.ai.llm.openai.timeout,
      });
      logger.info('OpenAI client initialized');
    }

    // Initialize Claude client
    if (this.provider === 'claude' && config.ai.llm.claude.apiKey) {
      this.claudeClient = axios.create({
        baseURL: 'https://api.anthropic.com/v1',
        headers: {
          'x-api-key': config.ai.llm.claude.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        timeout: config.ai.llm.openai.timeout, // Reuse timeout config
      });
      logger.info('Claude client initialized');
    }

    if (!this.openaiClient && !this.claudeClient) {
      logger.warn('No LLM provider configured. Client will not be functional.');
    }

    // Circuit breaker configuration
    const circuitBreakerOptions: CircuitBreakerOptions = {
      timeout: config.ai.llm.openai.timeout,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name: `LLM-${this.provider}`,
    };

    // Wrap completion method with circuit breaker
    this.circuitBreaker = createCircuitBreaker(
      this.completeInternal.bind(this),
      circuitBreakerOptions
    );

    // Add fallback
    this.circuitBreaker.fallback(() => {
      throw new ExternalServiceError(
        `LLM-${this.provider}`,
        'LLM service is temporarily unavailable. Please try again later.',
        { circuitBreakerOpen: true }
      );
    });
  }

  public static getInstance(): LLMClient {
    if (!LLMClient.instance) {
      LLMClient.instance = new LLMClient();
    }
    return LLMClient.instance;
  }

  /**
   * Internal completion method (wrapped by circuit breaker)
   */
  private async completeInternal(
    prompt: string,
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    const startTime = Date.now();

    try {
      if (this.provider === 'openai') {
        return await this.completeWithOpenAI(prompt, options, startTime);
      } else {
        return await this.completeWithClaude(prompt, options, startTime);
      }
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('LLM completion failed', {
        provider: this.provider,
        processingTime,
        error: error.message,
      });

      throw new ExternalServiceError(
        `LLM-${this.provider}`,
        `Failed to complete LLM request: ${error.message}`,
        { originalError: error, provider: this.provider }
      );
    }
  }

  /**
   * Complete with OpenAI
   */
  private async completeWithOpenAI(
    prompt: string,
    options: LLMCompletionOptions,
    startTime: number
  ): Promise<LLMCompletionResult> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await this.openaiClient.chat.completions.create({
      model: config.ai.llm.openai.model,
      messages,
      max_tokens: options.maxTokens || config.ai.llm.openai.maxTokens,
      temperature: options.temperature ?? config.ai.llm.openai.temperature,
      stop: options.stopSequences,
    });

    // Update rate limit info from headers (if available)
    this.updateRateLimitInfo(response);

    const processingTime = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || '';

    logger.info('OpenAI completion successful', {
      model: response.model,
      tokensUsed: response.usage?.total_tokens || 0,
      processingTime,
    });

    return {
      content,
      tokensUsed: response.usage?.total_tokens || 0,
      model: response.model,
      finishReason: response.choices[0]?.finish_reason || 'unknown',
      processingTime,
    };
  }

  /**
   * Complete with Claude
   */
  private async completeWithClaude(
    prompt: string,
    options: LLMCompletionOptions,
    startTime: number
  ): Promise<LLMCompletionResult> {
    if (!this.claudeClient) {
      throw new Error('Claude client not initialized');
    }

    const requestBody: any = {
      model: config.ai.llm.claude.model,
      max_tokens: options.maxTokens || config.ai.llm.claude.maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    if (options.systemPrompt) {
      requestBody.system = options.systemPrompt;
    }

    if (options.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }

    if (options.stopSequences) {
      requestBody.stop_sequences = options.stopSequences;
    }

    const response = await this.claudeClient.post('/messages', requestBody);

    const processingTime = Date.now() - startTime;
    const content = response.data.content[0]?.text || '';

    logger.info('Claude completion successful', {
      model: response.data.model,
      tokensUsed: response.data.usage?.input_tokens + response.data.usage?.output_tokens || 0,
      processingTime,
    });

    return {
      content,
      tokensUsed: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0),
      model: response.data.model,
      finishReason: response.data.stop_reason || 'unknown',
      processingTime,
    };
  }

  /**
   * Complete with retry logic
   */
  public async complete(
    prompt: string,
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    // Check rate limits before making request
    if (this.rateLimitInfo && this.rateLimitInfo.requestsRemaining <= 0) {
      const waitTime = this.rateLimitInfo.resetTime.getTime() - Date.now();
      if (waitTime > 0) {
        logger.warn('Rate limit reached, waiting before retry', {
          waitTime,
          resetTime: this.rateLimitInfo.resetTime,
        });
        await this.sleep(Math.min(waitTime, 60000)); // Max 1 minute wait
      }
    }

    return await this.retryWithBackoff(
      () => this.circuitBreaker.fire(prompt, options),
      config.ai.maxRetries,
      config.ai.retryDelay
    );
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(_response: any): void {
    // Parameter intentionally unused in placeholder
    void _response;

    // OpenAI rate limit headers (if available in future)
    // For now, this is a placeholder for future implementation
    // Rate limit info would typically come from response headers
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    baseDelay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry if circuit breaker is open
        if (error.metadata?.circuitBreakerOpen) {
          throw error;
        }

        // Don't retry on client errors (4xx) except rate limits (429)
        if (error.code && error.code >= 400 && error.code < 500 && error.code !== 429) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          logger.warn(`Retrying LLM request after ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries,
            error: error.message,
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (this.provider === 'openai') {
        return !!this.openaiClient && !!config.ai.llm.openai.apiKey;
      } else {
        return !!this.claudeClient && !!config.ai.llm.claude.apiKey;
      }
    } catch (error) {
      logger.error('LLM health check failed', { error });
      return false;
    }
  }

  /**
   * Get circuit breaker status
   */
  public getCircuitBreakerStatus() {
    return {
      name: this.circuitBreaker.name,
      state: this.circuitBreaker.opened ? 'OPEN' : this.circuitBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: this.circuitBreaker.stats,
    };
  }

  /**
   * Get current provider
   */
  public getProvider(): string {
    return this.provider;
  }

  /**
   * Get rate limit info
   */
  public getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }
}

export default LLMClient.getInstance();
