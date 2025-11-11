/**
 * Prompt Templates for LLM Operations
 * Reusable templates for document summarization, analysis, and recommendations
 */

export interface PromptTemplate {
  systemPrompt: string;
  userPromptTemplate: string;
}

/**
 * Document Summarization Template
 */
export const DOCUMENT_SUMMARIZATION_TEMPLATE: PromptTemplate = {
  systemPrompt: `You are an expert document analyst specializing in financial and legal documents for loan applications. 
Your task is to create concise, accurate summaries that highlight the most important information for loan officers.
Focus on key financial figures, dates, parties involved, and any critical conditions or requirements.
Always maintain objectivity and cite specific information from the document.`,
  userPromptTemplate: `Please analyze the following document and provide a concise summary (200-300 words).

Document Type: {{documentType}}
Document Content:
{{documentContent}}

Your summary should include:
1. Document purpose and type
2. Key financial figures (amounts, balances, revenues, etc.)
3. Important dates and deadlines
4. Parties involved (names, organizations)
5. Critical conditions, requirements, or obligations
6. Any red flags or items requiring attention

Format your response as a structured summary with clear sections.`,
};

/**
 * Application Summarization Template
 */
export const APPLICATION_SUMMARIZATION_TEMPLATE: PromptTemplate = {
  systemPrompt: `You are an expert loan application analyst. Your task is to create comprehensive summaries 
of loan applications by analyzing multiple documents and extracting the most relevant information.
Focus on applicant qualifications, financial health, compliance with requirements, and risk factors.`,
  userPromptTemplate: `Please analyze the following loan application and provide a comprehensive summary.

Application Type: {{applicationType}}
Applicant Information: {{applicantInfo}}

Documents Analyzed:
{{documentsList}}

Document Contents:
{{documentsContent}}

Your summary should include:
1. Applicant overview (business/individual profile)
2. Loan request details (amount, purpose, term)
3. Financial health assessment
4. Key strengths and qualifications
5. Potential concerns or risk factors
6. Compliance with program requirements
7. Overall recommendation context

Provide a balanced, objective analysis that helps loan officers make informed decisions.`,
};

/**
 * Missing Document Recommendation Template
 */
export const MISSING_DOCUMENT_TEMPLATE: PromptTemplate = {
  systemPrompt: `You are an expert in loan application requirements. Your task is to identify missing or 
incomplete documentation based on the application type and program requirements.
Provide specific, actionable recommendations for what documents are needed and why.`,
  userPromptTemplate: `Analyze the following loan application and identify missing or incomplete documentation.

Application Type: {{applicationType}}
Program Requirements: {{programRequirements}}

Currently Submitted Documents:
{{submittedDocuments}}

Applicant Profile:
{{applicantProfile}}

Please identify:
1. Required documents that are missing
2. Documents that may be incomplete or insufficient
3. Additional documents that would strengthen the application
4. Specific guidance on what each missing document should contain
5. Priority level for each missing document (HIGH, MEDIUM, LOW)

Format your response as a structured list with clear explanations.`,
};

/**
 * Anomaly Detection Analysis Template
 */
export const ANOMALY_DETECTION_TEMPLATE: PromptTemplate = {
  systemPrompt: `You are a fraud detection and compliance expert specializing in loan applications.
Your task is to identify inconsistencies, anomalies, and potential red flags in application documents.
Be thorough but fair, distinguishing between minor discrepancies and serious concerns.`,
  userPromptTemplate: `Analyze the following documents for inconsistencies, anomalies, or potential fraud indicators.

Documents to Compare:
{{documentsToAnalyze}}

Extracted Data:
{{extractedData}}

Please identify:
1. Inconsistencies between documents (conflicting information)
2. Unusual patterns or anomalies in financial data
3. Missing or suspicious information
4. Timeline inconsistencies
5. Potential fraud indicators
6. Compliance concerns

For each issue found, provide:
- Severity level (LOW, MEDIUM, HIGH, CRITICAL)
- Specific description of the issue
- Evidence from the documents
- Recommended action

Be specific and cite exact information from the documents.`,
};

/**
 * Decision Support Template
 */
export const DECISION_SUPPORT_TEMPLATE: PromptTemplate = {
  systemPrompt: `You are an expert loan underwriter with extensive experience in government lending programs.
Your task is to provide decision recommendations based on comprehensive analysis of loan applications.
Consider financial viability, compliance, risk factors, and program requirements.
Provide balanced recommendations with clear supporting evidence.`,
  userPromptTemplate: `Provide a decision recommendation for the following loan application.

Application Details:
{{applicationDetails}}

Financial Analysis:
{{financialAnalysis}}

Document Quality Assessment:
{{documentQuality}}

Anomalies and Risk Factors:
{{anomaliesAndRisks}}

Program Requirements:
{{programRequirements}}

Please provide:
1. Recommendation (APPROVE, REJECT, REQUEST_MORE_INFO)
2. Confidence level (0-100%)
3. Key factors supporting your recommendation
4. Risk assessment summary
5. Conditions for approval (if applicable)
6. Specific concerns that need addressing (if applicable)
7. Policy or compliance considerations

Your recommendation should be data-driven and cite specific evidence from the application.`,
};

/**
 * Document Quality Assessment Template
 */
export const DOCUMENT_QUALITY_TEMPLATE: PromptTemplate = {
  systemPrompt: `You are a document quality expert. Your task is to assess the quality, completeness, 
and usability of uploaded documents for loan processing.
Provide specific, actionable feedback on how to improve document quality.`,
  userPromptTemplate: `Assess the quality of the following document.

Document Type: {{documentType}}
Document Metadata: {{documentMetadata}}
Extracted Content Quality: {{contentQuality}}
Technical Analysis: {{technicalAnalysis}}

Please evaluate:
1. Image/scan quality (resolution, clarity, readability)
2. Completeness (all pages present, no missing information)
3. Legibility (text is clear and readable)
4. Format appropriateness
5. Information completeness (all required fields present)

Provide:
- Overall quality score (0-100)
- Specific issues identified
- Actionable recommendations for improvement
- Priority level for each issue

Be specific and helpful in your recommendations.`,
};

/**
 * Question Answering Template
 */
export const QUESTION_ANSWERING_TEMPLATE: PromptTemplate = {
  systemPrompt: `You are a helpful assistant that answers questions about loan application documents.
Provide accurate, specific answers based solely on the information in the documents.
If information is not available in the documents, clearly state that.
Always cite the source of your information.`,
  userPromptTemplate: `Answer the following question based on the provided documents.

Question: {{question}}

Available Documents:
{{documentsList}}

Document Contents:
{{documentsContent}}

Please provide:
1. A clear, direct answer to the question
2. Specific citations from the documents (document name and relevant section)
3. Confidence level in your answer (0-100%)
4. Any relevant context or caveats

If the information is not available in the documents, clearly state that and suggest what documents might contain the answer.`,
};

/**
 * Utility function to fill template with data
 */
export function fillTemplate(template: string, data: Record<string, any>): string {
  let filled = template;
  
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    const replacement = value !== null && value !== undefined ? String(value) : '';
    filled = filled.replace(new RegExp(placeholder, 'g'), replacement);
  }
  
  return filled;
}

/**
 * Validate and sanitize LLM response
 */
export function sanitizeLLMResponse(response: string): string {
  // Remove any potential injection attempts or malicious content
  let sanitized = response.trim();
  
  // Remove any script tags or HTML
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]+>/g, '');
  
  // Remove any potential SQL injection patterns
  sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '');
  
  // Limit length to prevent abuse
  const MAX_LENGTH = 10000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH) + '... [truncated]';
  }
  
  return sanitized;
}

/**
 * Extract confidence score from LLM response
 */
export function extractConfidenceScore(response: string): number {
  // Look for confidence patterns like "Confidence: 85%" or "85% confident"
  const patterns = [
    /confidence[:\s]+(\d+)%/i,
    /(\d+)%\s+confidence/i,
    /confidence[:\s]+(\d+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match && match[1]) {
      const score = parseInt(match[1], 10);
      if (score >= 0 && score <= 100) {
        return score / 100;
      }
    }
  }
  
  // Default confidence if not found
  return 0.7;
}
