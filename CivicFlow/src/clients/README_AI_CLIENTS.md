# AI Clients Documentation

## Overview
This directory contains client wrappers for AI services used in the document intelligence system. All clients implement circuit breaker patterns, retry logic, and comprehensive error handling.

## Available Clients

### 1. Azure Document Intelligence Client
**File**: `azureDocumentIntelligenceClient.ts`

**Purpose**: Analyzes documents using Azure AI Document Intelligence (formerly Form Recognizer) to extract text, entities, tables, and key-value pairs.

**Usage**:
```typescript
import azureDocumentIntelligenceClient from './clients/azureDocumentIntelligenceClient';

// Analyze document from buffer
const result = await azureDocumentIntelligenceClient.analyzeDocument(
  documentBuffer,
  {
    modelId: 'prebuilt-document', // or custom model ID
    pages: '1-5', // optional: specific pages
    locale: 'en-US' // optional: document locale
  }
);

// Analyze document from URL
const result = await azureDocumentIntelligenceClient.analyzeDocumentFromUrl(
  'https://example.com/document.pdf',
  { modelId: 'prebuilt-invoice' }
);

// Check health
const isHealthy = await azureDocumentIntelligenceClient.healthCheck();

// Get circuit breaker status
const status = azureDocumentIntelligenceClient.getCircuitBreakerStatus();
```

**Features**:
- Automatic retry with exponential backoff (up to 3 attempts)
- Circuit breaker protection (opens at 50% failure rate)
- Support for multiple document models
- Processing time tracking
- Comprehensive error handling

**Configuration**:
```env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-api-key
AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT=30000
```

### 2. LLM Client (OpenAI/Claude)
**File**: `llmClient.ts`

**Purpose**: Unified interface for Large Language Model services (OpenAI GPT-4, Claude) for summarization, analysis, and natural language processing.

**Usage**:
```typescript
import llmClient from './clients/llmClient';

// Complete a prompt
const result = await llmClient.complete(
  'Summarize this document...',
  {
    maxTokens: 2000,
    temperature: 0.7,
    systemPrompt: 'You are a document analyst...',
    stopSequences: ['\n\n']
  }
);

console.log(result.content); // Generated text
console.log(result.tokensUsed); // Token count
console.log(result.confidence); // Confidence score

// Check which provider is active
const provider = llmClient.getProvider(); // 'openai' or 'claude'

// Health check
const isHealthy = await llmClient.healthCheck();

// Get rate limit info
const rateLimits = llmClient.getRateLimitInfo();
```

**Features**:
- Multi-provider support (OpenAI, Claude)
- Automatic provider selection based on configuration
- Rate limiting awareness
- Token management
- Circuit breaker protection
- Retry logic with exponential backoff
- Response validation and sanitization

**Configuration**:
```env
# Provider selection
LLM_PROVIDER=openai  # or 'claude'

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
OPENAI_TIMEOUT=30000

# Claude Configuration
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-sonnet-20240229
CLAUDE_MAX_TOKENS=2000

# Retry Configuration
AI_MAX_RETRIES=3
AI_RETRY_DELAY=1000
```

## Prompt Templates

**File**: `../utils/promptTemplates.ts`

Pre-built prompt templates for common AI operations:

### Available Templates

1. **DOCUMENT_SUMMARIZATION_TEMPLATE**
   - Summarizes individual documents
   - Extracts key financial figures, dates, parties
   - Identifies critical conditions

2. **APPLICATION_SUMMARIZATION_TEMPLATE**
   - Summarizes entire loan applications
   - Analyzes multiple documents together
   - Provides comprehensive overview

3. **MISSING_DOCUMENT_TEMPLATE**
   - Identifies missing required documents
   - Prioritizes document needs
   - Provides specific guidance

4. **ANOMALY_DETECTION_TEMPLATE**
   - Detects inconsistencies between documents
   - Identifies potential fraud indicators
   - Assigns severity levels

5. **DECISION_SUPPORT_TEMPLATE**
   - Provides approval/rejection recommendations
   - Cites supporting evidence
   - Includes confidence scores

6. **DOCUMENT_QUALITY_TEMPLATE**
   - Assesses document quality
   - Provides improvement recommendations
   - Scores from 0-100

7. **QUESTION_ANSWERING_TEMPLATE**
   - Answers questions about documents
   - Cites sources
   - Provides confidence levels

### Using Templates

```typescript
import {
  DOCUMENT_SUMMARIZATION_TEMPLATE,
  fillTemplate,
  sanitizeLLMResponse,
  extractConfidenceScore
} from '../utils/promptTemplates';
import llmClient from './llmClient';

// Fill template with data
const prompt = fillTemplate(
  DOCUMENT_SUMMARIZATION_TEMPLATE.userPromptTemplate,
  {
    documentType: 'Bank Statement',
    documentContent: extractedText
  }
);

// Get completion
const result = await llmClient.complete(prompt, {
  systemPrompt: DOCUMENT_SUMMARIZATION_TEMPLATE.systemPrompt,
  maxTokens: 500
});

// Sanitize response
const sanitized = sanitizeLLMResponse(result.content);

// Extract confidence
const confidence = extractConfidenceScore(result.content);
```

## Error Handling

All clients throw `ExternalServiceError` with detailed metadata:

```typescript
try {
  const result = await azureDocumentIntelligenceClient.analyzeDocument(buffer);
} catch (error) {
  if (error instanceof ExternalServiceError) {
    console.error('Service:', error.serviceName);
    console.error('Message:', error.message);
    console.error('Metadata:', error.metadata);
    
    // Check if circuit breaker is open
    if (error.metadata?.circuitBreakerOpen) {
      // Service is temporarily unavailable
      // Use fallback or queue for later
    }
  }
}
```

## Circuit Breaker Behavior

### States
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Service is failing, requests are rejected immediately
- **HALF_OPEN**: Testing if service has recovered

### Configuration
- Opens at 50% failure rate
- Resets after 30 seconds
- 10-second rolling window
- Automatic fallback responses

### Monitoring
```typescript
const status = client.getCircuitBreakerStatus();
console.log(status.state); // 'OPEN', 'CLOSED', or 'HALF_OPEN'
console.log(status.stats); // Detailed statistics
```

## Best Practices

1. **Always handle errors**: AI services can fail, implement proper error handling
2. **Use caching**: Cache AI results to reduce costs and improve performance
3. **Monitor circuit breakers**: Track circuit breaker states to detect service issues
4. **Set appropriate timeouts**: Balance between waiting for results and user experience
5. **Validate responses**: Always sanitize and validate LLM responses
6. **Track costs**: Monitor token usage and API calls
7. **Use appropriate models**: Choose models based on task complexity
8. **Implement fallbacks**: Have manual review options when AI fails

## Performance Considerations

- **Azure Document Intelligence**: ~5-15 seconds per document
- **LLM Completions**: ~2-10 seconds depending on length
- **Circuit Breaker Overhead**: Minimal (<1ms)
- **Retry Delays**: 1s, 2s, 4s (exponential backoff)

## Cost Optimization

1. **Cache aggressively**: Use `aiCacheService` to cache results
2. **Batch operations**: Process multiple documents together when possible
3. **Use appropriate models**: Don't use GPT-4 when GPT-3.5 suffices
4. **Limit token usage**: Set reasonable `maxTokens` limits
5. **Implement rate limiting**: Prevent excessive API calls

## Security

- API keys stored in environment variables
- Keys never logged or exposed in errors
- Response sanitization prevents injection attacks
- All requests use HTTPS
- Audit logging for all AI operations

## Testing

```typescript
// Mock for testing
jest.mock('./clients/azureDocumentIntelligenceClient', () => ({
  analyzeDocument: jest.fn().mockResolvedValue({
    result: mockAnalysisResult,
    processingTime: 5000,
    modelId: 'prebuilt-document'
  }),
  healthCheck: jest.fn().mockResolvedValue(true)
}));
```

## Troubleshooting

### Circuit Breaker Opens Frequently
- Check service health and API quotas
- Verify network connectivity
- Review error logs for patterns
- Consider increasing timeout values

### High Latency
- Check network conditions
- Verify service region matches your location
- Consider caching more aggressively
- Review document sizes (large documents take longer)

### Rate Limiting
- Implement request queuing
- Spread requests over time
- Upgrade API tier if needed
- Use caching to reduce requests

### Low Confidence Scores
- Improve document quality
- Use more specific prompts
- Try different models
- Provide more context in prompts
