/**
 * Inconsistency Detector
 * Detects inconsistencies and conflicts across multiple documents in an application
 * Compares extracted data to identify discrepancies with severity levels
 */

import smartExtractionService from './smartExtractionService';
import aiAnalysisRepository from '../repositories/aiAnalysisRepository';
import documentRepository from '../repositories/documentRepository';
import logger from '../utils/logger';

export interface InconsistencyResult {
  applicationId: string;
  inconsistencies: Inconsistency[];
  overallRiskScore: number;
  documentComparisons: DocumentComparison[];
}

export interface Inconsistency {
  type: InconsistencyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedDocuments: string[];
  conflictingValues: ConflictingValue[];
  evidence: string[];
  confidence: number;
}

export enum InconsistencyType {
  NAME_MISMATCH = 'NAME_MISMATCH',
  ADDRESS_MISMATCH = 'ADDRESS_MISMATCH',
  AMOUNT_DISCREPANCY = 'AMOUNT_DISCREPANCY',
  DATE_CONFLICT = 'DATE_CONFLICT',
  ID_NUMBER_MISMATCH = 'ID_NUMBER_MISMATCH',
  BUSINESS_INFO_CONFLICT = 'BUSINESS_INFO_CONFLICT',
  MISSING_CROSS_REFERENCE = 'MISSING_CROSS_REFERENCE',
}

export interface ConflictingValue {
  field: string;
  documentId: string;
  value: any;
  confidence: number;
}

export interface DocumentComparison {
  document1Id: string;
  document2Id: string;
  similarityScore: number;
  conflicts: number;
  matchingFields: string[];
  conflictingFields: string[];
}

export interface ComparisonResult {
  document1Id: string;
  document2Id: string;
  similarityScore: number;
  differences: Difference[];
  matchingFields: FieldMatch[];
}

export interface Difference {
  field: string;
  value1: any;
  value2: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface FieldMatch {
  field: string;
  value: any;
  confidence: number;
}

class InconsistencyDetector {
  private static instance: InconsistencyDetector;
  private readonly SIMILARITY_THRESHOLD = 0.85;
  private readonly NAME_SIMILARITY_THRESHOLD = 0.90;

  private constructor() {}

  public static getInstance(): InconsistencyDetector {
    if (!InconsistencyDetector.instance) {
      InconsistencyDetector.instance = new InconsistencyDetector();
    }
    return InconsistencyDetector.instance;
  }

  /**
   * Detect inconsistencies across all documents in an application
   */
  async detectInconsistencies(applicationId: string): Promise<InconsistencyResult> {
    try {
      logger.info('Starting inconsistency detection', { applicationId });

      // Get all documents for the application
      const documents = await documentRepository.findByApplicationId(applicationId);

      if (documents.length < 2) {
        logger.info('Not enough documents for inconsistency detection', {
          applicationId,
          documentCount: documents.length,
        });

        return {
          applicationId,
          inconsistencies: [],
          overallRiskScore: 0,
          documentComparisons: [],
        };
      }

      // Extract data from all documents
      const extractedDataMap = new Map<string, any>();

      for (const document of documents) {
        try {
          const [financial, personal, business] = await Promise.all([
            smartExtractionService.extractFinancialData(document.id).catch(() => null),
            smartExtractionService.extractPersonalInfo(document.id).catch(() => null),
            smartExtractionService.extractBusinessInfo(document.id).catch(() => null),
          ]);

          extractedDataMap.set(document.id, {
            documentId: document.id,
            documentType: document.documentType,
            financial,
            personal,
            business,
          });
        } catch (error: any) {
          logger.warn('Failed to extract data from document', {
            documentId: document.id,
            error: error.message,
          });
        }
      }

      // Compare documents pairwise
      const documentComparisons: DocumentComparison[] = [];
      const inconsistencies: Inconsistency[] = [];

      const documentIds = Array.from(extractedDataMap.keys());

      for (let i = 0; i < documentIds.length; i++) {
        for (let j = i + 1; j < documentIds.length; j++) {
          const doc1Id = documentIds[i];
          const doc2Id = documentIds[j];

          const comparison = this.compareDocuments(
            extractedDataMap.get(doc1Id),
            extractedDataMap.get(doc2Id)
          );

          documentComparisons.push(comparison);

          // Extract inconsistencies from comparison
          const comparisonInconsistencies = this.extractInconsistencies(
            comparison,
            extractedDataMap.get(doc1Id),
            extractedDataMap.get(doc2Id)
          );

          inconsistencies.push(...comparisonInconsistencies);
        }
      }

      // Calculate overall risk score
      const overallRiskScore = this.calculateOverallRiskScore(inconsistencies);

      logger.info('Inconsistency detection completed', {
        applicationId,
        inconsistencyCount: inconsistencies.length,
        overallRiskScore,
      });

      return {
        applicationId,
        inconsistencies,
        overallRiskScore,
        documentComparisons,
      };
    } catch (error: any) {
      logger.error('Inconsistency detection failed', {
        applicationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Compare two documents for inconsistencies
   */
  compareDocuments(doc1Data: any, doc2Data: any): DocumentComparison {
    const matchingFields: string[] = [];
    const conflictingFields: string[] = [];
    let totalFields = 0;
    let matchingCount = 0;

    // Compare personal information
    if (doc1Data.personal && doc2Data.personal) {
      const personalComparison = this.comparePersonalInfo(doc1Data.personal, doc2Data.personal);
      matchingFields.push(...personalComparison.matching);
      conflictingFields.push(...personalComparison.conflicting);
      totalFields += personalComparison.total;
      matchingCount += personalComparison.matchingCount;
    }

    // Compare business information
    if (doc1Data.business && doc2Data.business) {
      const businessComparison = this.compareBusinessInfo(doc1Data.business, doc2Data.business);
      matchingFields.push(...businessComparison.matching);
      conflictingFields.push(...businessComparison.conflicting);
      totalFields += businessComparison.total;
      matchingCount += businessComparison.matchingCount;
    }

    // Compare financial information
    if (doc1Data.financial && doc2Data.financial) {
      const financialComparison = this.compareFinancialInfo(doc1Data.financial, doc2Data.financial);
      matchingFields.push(...financialComparison.matching);
      conflictingFields.push(...financialComparison.conflicting);
      totalFields += financialComparison.total;
      matchingCount += financialComparison.matchingCount;
    }

    const similarityScore = totalFields > 0 ? matchingCount / totalFields : 0;

    return {
      document1Id: doc1Data.documentId,
      document2Id: doc2Data.documentId,
      similarityScore,
      conflicts: conflictingFields.length,
      matchingFields,
      conflictingFields,
    };
  }

  /**
   * Compare personal information between documents
   */
  private comparePersonalInfo(personal1: any, personal2: any): any {
    const matching: string[] = [];
    const conflicting: string[] = [];
    let total = 0;
    let matchingCount = 0;

    // Compare names
    if (personal1.names && personal1.names.length > 0 && personal2.names && personal2.names.length > 0) {
      total++;
      const name1 = personal1.names[0].fullName.toLowerCase().trim();
      const name2 = personal2.names[0].fullName.toLowerCase().trim();

      if (this.calculateStringSimilarity(name1, name2) >= this.NAME_SIMILARITY_THRESHOLD) {
        matching.push('name');
        matchingCount++;
      } else {
        conflicting.push('name');
      }
    }

    // Compare addresses
    if (personal1.addresses && personal1.addresses.length > 0 && personal2.addresses && personal2.addresses.length > 0) {
      total++;
      const addr1 = personal1.addresses[0].streetAddress.toLowerCase().trim();
      const addr2 = personal2.addresses[0].streetAddress.toLowerCase().trim();

      if (this.calculateStringSimilarity(addr1, addr2) >= this.SIMILARITY_THRESHOLD) {
        matching.push('address');
        matchingCount++;
      } else {
        conflicting.push('address');
      }
    }

    // Compare identification numbers
    if (personal1.identificationNumbers && personal1.identificationNumbers.length > 0 &&
        personal2.identificationNumbers && personal2.identificationNumbers.length > 0) {
      total++;
      const id1 = personal1.identificationNumbers[0].value.replace(/\D/g, '');
      const id2 = personal2.identificationNumbers[0].value.replace(/\D/g, '');

      if (id1 === id2) {
        matching.push('identification_number');
        matchingCount++;
      } else {
        conflicting.push('identification_number');
      }
    }

    return { matching, conflicting, total, matchingCount };
  }

  /**
   * Compare business information between documents
   */
  private compareBusinessInfo(business1: any, business2: any): any {
    const matching: string[] = [];
    const conflicting: string[] = [];
    let total = 0;
    let matchingCount = 0;

    // Compare business names
    if (business1.businessName && business2.businessName) {
      total++;
      const name1 = business1.businessName.toLowerCase().trim();
      const name2 = business2.businessName.toLowerCase().trim();

      if (this.calculateStringSimilarity(name1, name2) >= this.NAME_SIMILARITY_THRESHOLD) {
        matching.push('business_name');
        matchingCount++;
      } else {
        conflicting.push('business_name');
      }
    }

    // Compare EINs
    if (business1.ein && business2.ein) {
      total++;
      const ein1 = business1.ein.replace(/\D/g, '');
      const ein2 = business2.ein.replace(/\D/g, '');

      if (ein1 === ein2) {
        matching.push('ein');
        matchingCount++;
      } else {
        conflicting.push('ein');
      }
    }

    // Compare business addresses
    if (business1.businessAddress && business2.businessAddress) {
      total++;
      const addr1 = business1.businessAddress.streetAddress.toLowerCase().trim();
      const addr2 = business2.businessAddress.streetAddress.toLowerCase().trim();

      if (this.calculateStringSimilarity(addr1, addr2) >= this.SIMILARITY_THRESHOLD) {
        matching.push('business_address');
        matchingCount++;
      } else {
        conflicting.push('business_address');
      }
    }

    return { matching, conflicting, total, matchingCount };
  }

  /**
   * Compare financial information between documents
   */
  private compareFinancialInfo(financial1: any, financial2: any): any {
    const matching: string[] = [];
    const conflicting: string[] = [];
    let total = 0;
    let matchingCount = 0;

    // Compare account numbers
    if (financial1.accounts && financial1.accounts.length > 0 &&
        financial2.accounts && financial2.accounts.length > 0) {
      total++;
      const account1 = financial1.accounts[0].accountNumber.replace(/\D/g, '');
      const account2 = financial2.accounts[0].accountNumber.replace(/\D/g, '');

      if (account1 === account2) {
        matching.push('account_number');
        matchingCount++;
      } else {
        // Check if they're similar (last 4 digits match)
        if (account1.slice(-4) === account2.slice(-4)) {
          matching.push('account_number_partial');
          matchingCount += 0.5;
        } else {
          conflicting.push('account_number');
        }
      }
    }

    // Compare amounts (look for similar amounts)
    if (financial1.amounts && financial1.amounts.length > 0 &&
        financial2.amounts && financial2.amounts.length > 0) {
      total++;
      const amounts1 = financial1.amounts.map((a: any) => a.value);
      const amounts2 = financial2.amounts.map((a: any) => a.value);

      // Check if any amounts match
      const hasMatchingAmount = amounts1.some((amt1: number) =>
        amounts2.some((amt2: number) => Math.abs(amt1 - amt2) < 0.01)
      );

      if (hasMatchingAmount) {
        matching.push('financial_amounts');
        matchingCount++;
      }
    }

    return { matching, conflicting, total, matchingCount };
  }

  /**
   * Extract inconsistencies from document comparison
   */
  private extractInconsistencies(
    comparison: DocumentComparison,
    doc1Data: any,
    doc2Data: any
  ): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    // Check for name mismatches
    if (comparison.conflictingFields.includes('name')) {
      inconsistencies.push({
        type: InconsistencyType.NAME_MISMATCH,
        severity: 'HIGH',
        description: 'Name mismatch detected across documents',
        affectedDocuments: [doc1Data.documentId, doc2Data.documentId],
        conflictingValues: [
          {
            field: 'name',
            documentId: doc1Data.documentId,
            value: doc1Data.personal?.names?.[0]?.fullName,
            confidence: doc1Data.personal?.names?.[0]?.confidence || 0,
          },
          {
            field: 'name',
            documentId: doc2Data.documentId,
            value: doc2Data.personal?.names?.[0]?.fullName,
            confidence: doc2Data.personal?.names?.[0]?.confidence || 0,
          },
        ],
        evidence: ['Names do not match across documents'],
        confidence: 0.9,
      });
    }

    // Check for address mismatches
    if (comparison.conflictingFields.includes('address')) {
      inconsistencies.push({
        type: InconsistencyType.ADDRESS_MISMATCH,
        severity: 'MEDIUM',
        description: 'Address mismatch detected across documents',
        affectedDocuments: [doc1Data.documentId, doc2Data.documentId],
        conflictingValues: [
          {
            field: 'address',
            documentId: doc1Data.documentId,
            value: doc1Data.personal?.addresses?.[0]?.streetAddress,
            confidence: doc1Data.personal?.addresses?.[0]?.confidence || 0,
          },
          {
            field: 'address',
            documentId: doc2Data.documentId,
            value: doc2Data.personal?.addresses?.[0]?.streetAddress,
            confidence: doc2Data.personal?.addresses?.[0]?.confidence || 0,
          },
        ],
        evidence: ['Addresses do not match across documents'],
        confidence: 0.85,
      });
    }

    // Check for ID number mismatches
    if (comparison.conflictingFields.includes('identification_number')) {
      inconsistencies.push({
        type: InconsistencyType.ID_NUMBER_MISMATCH,
        severity: 'CRITICAL',
        description: 'Identification number mismatch detected',
        affectedDocuments: [doc1Data.documentId, doc2Data.documentId],
        conflictingValues: [
          {
            field: 'identification_number',
            documentId: doc1Data.documentId,
            value: doc1Data.personal?.identificationNumbers?.[0]?.value,
            confidence: doc1Data.personal?.identificationNumbers?.[0]?.confidence || 0,
          },
          {
            field: 'identification_number',
            documentId: doc2Data.documentId,
            value: doc2Data.personal?.identificationNumbers?.[0]?.value,
            confidence: doc2Data.personal?.identificationNumbers?.[0]?.confidence || 0,
          },
        ],
        evidence: ['SSN/EIN does not match across documents'],
        confidence: 0.95,
      });
    }

    // Check for business info conflicts
    if (comparison.conflictingFields.includes('business_name') || comparison.conflictingFields.includes('ein')) {
      inconsistencies.push({
        type: InconsistencyType.BUSINESS_INFO_CONFLICT,
        severity: 'HIGH',
        description: 'Business information conflict detected',
        affectedDocuments: [doc1Data.documentId, doc2Data.documentId],
        conflictingValues: [
          {
            field: 'business_info',
            documentId: doc1Data.documentId,
            value: {
              name: doc1Data.business?.businessName,
              ein: doc1Data.business?.ein,
            },
            confidence: doc1Data.business?.confidence || 0,
          },
          {
            field: 'business_info',
            documentId: doc2Data.documentId,
            value: {
              name: doc2Data.business?.businessName,
              ein: doc2Data.business?.ein,
            },
            confidence: doc2Data.business?.confidence || 0,
          },
        ],
        evidence: ['Business name or EIN does not match across documents'],
        confidence: 0.9,
      });
    }

    // Check for account number conflicts
    if (comparison.conflictingFields.includes('account_number')) {
      inconsistencies.push({
        type: InconsistencyType.AMOUNT_DISCREPANCY,
        severity: 'MEDIUM',
        description: 'Account number mismatch detected',
        affectedDocuments: [doc1Data.documentId, doc2Data.documentId],
        conflictingValues: [
          {
            field: 'account_number',
            documentId: doc1Data.documentId,
            value: doc1Data.financial?.accounts?.[0]?.accountNumber,
            confidence: doc1Data.financial?.accounts?.[0]?.confidence || 0,
          },
          {
            field: 'account_number',
            documentId: doc2Data.documentId,
            value: doc2Data.financial?.accounts?.[0]?.accountNumber,
            confidence: doc2Data.financial?.accounts?.[0]?.confidence || 0,
          },
        ],
        evidence: ['Account numbers do not match'],
        confidence: 0.8,
      });
    }

    return inconsistencies;
  }

  /**
   * Calculate overall risk score based on inconsistencies
   */
  private calculateOverallRiskScore(inconsistencies: Inconsistency[]): number {
    if (inconsistencies.length === 0) {
      return 0;
    }

    let totalScore = 0;
    const weights = {
      CRITICAL: 0.4,
      HIGH: 0.3,
      MEDIUM: 0.2,
      LOW: 0.1,
    };

    for (const inconsistency of inconsistencies) {
      const weight = weights[inconsistency.severity];
      totalScore += weight * inconsistency.confidence;
    }

    // Normalize to 0-100 scale
    const normalizedScore = Math.min(100, (totalScore / inconsistencies.length) * 100);

    return normalizedScore;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const maxLength = Math.max(str1.length, str2.length);
    const distance = this.levenshteinDistance(str1, str2);

    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate discrepancy report
   */
  async generateDiscrepancyReport(applicationId: string): Promise<string> {
    const result = await this.detectInconsistencies(applicationId);

    let report = `# Discrepancy Report for Application ${applicationId}\n\n`;
    report += `**Overall Risk Score:** ${result.overallRiskScore.toFixed(1)}/100\n\n`;
    report += `**Total Inconsistencies:** ${result.inconsistencies.length}\n\n`;

    if (result.inconsistencies.length === 0) {
      report += 'No inconsistencies detected across documents.\n';
      return report;
    }

    // Group by severity
    const bySeverity = {
      CRITICAL: result.inconsistencies.filter(i => i.severity === 'CRITICAL'),
      HIGH: result.inconsistencies.filter(i => i.severity === 'HIGH'),
      MEDIUM: result.inconsistencies.filter(i => i.severity === 'MEDIUM'),
      LOW: result.inconsistencies.filter(i => i.severity === 'LOW'),
    };

    for (const [severity, items] of Object.entries(bySeverity)) {
      if (items.length > 0) {
        report += `## ${severity} Severity (${items.length})\n\n`;

        for (const item of items) {
          report += `### ${item.type}\n`;
          report += `**Description:** ${item.description}\n`;
          report += `**Confidence:** ${(item.confidence * 100).toFixed(1)}%\n`;
          report += `**Affected Documents:** ${item.affectedDocuments.join(', ')}\n`;
          report += `**Evidence:**\n`;
          item.evidence.forEach(e => report += `- ${e}\n`);
          report += '\n';
        }
      }
    }

    return report;
  }
}

export default InconsistencyDetector.getInstance();
