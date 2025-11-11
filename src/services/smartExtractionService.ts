/**
 * Smart Extraction Service
 * Extracts structured data from unstructured documents using AI
 * Implements financial, personal, and business information extraction
 */

import azureDocumentIntelligenceClient from '../clients/azureDocumentIntelligenceClient';
import aiCacheService from './aiCacheService';
import documentRepository from '../repositories/documentRepository';
import logger from '../utils/logger';
import config from '../config';

export interface FinancialData {
  amounts: MonetaryAmount[];
  accounts: BankAccount[];
  transactions: Transaction[];
  balances: Balance[];
  confidence: number;
}

export interface MonetaryAmount {
  value: number;
  currency: string;
  context: string; // "revenue", "loan amount", "balance", etc.
  confidence: number;
  sourceLocation?: BoundingBox;
}

export interface BankAccount {
  accountNumber: string;
  routingNumber?: string;
  bankName?: string;
  accountType?: string; // "checking", "savings", etc.
  confidence: number;
}

export interface Transaction {
  date: Date;
  amount: number;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  confidence: number;
}

export interface Balance {
  type: string; // "current", "available", "closing", etc.
  amount: number;
  date?: Date;
  confidence: number;
}

export interface PersonalInfo {
  names: PersonName[];
  addresses: Address[];
  identificationNumbers: IdentificationNumber[];
  contactInfo: ContactInfo;
  dateOfBirth?: Date;
  confidence: number;
}

export interface PersonName {
  fullName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  confidence: number;
}

export interface Address {
  streetAddress: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  type?: string; // "residential", "business", "mailing"
  confidence: number;
}

export interface IdentificationNumber {
  type: 'SSN' | 'EIN' | 'DRIVER_LICENSE' | 'PASSPORT' | 'OTHER';
  value: string;
  issuingAuthority?: string;
  confidence: number;
}

export interface ContactInfo {
  phoneNumbers: PhoneNumber[];
  emailAddresses: EmailAddress[];
}

export interface PhoneNumber {
  number: string;
  type?: string; // "mobile", "home", "work"
  confidence: number;
}

export interface EmailAddress {
  email: string;
  confidence: number;
}

export interface BusinessInfo {
  businessName?: string;
  ein?: string;
  businessAddress?: Address;
  businessType?: string;
  industryCode?: string;
  yearEstablished?: number;
  numberOfEmployees?: number;
  annualRevenue?: number;
  confidence: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fieldsRequiringReview: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidationWarning {
  field: string;
  message: string;
}

class SmartExtractionService {
  private static instance: SmartExtractionService;
  private readonly CONFIDENCE_THRESHOLD = config.ai.confidenceThreshold;

  private constructor() {}

  public static getInstance(): SmartExtractionService {
    if (!SmartExtractionService.instance) {
      SmartExtractionService.instance = new SmartExtractionService();
    }
    return SmartExtractionService.instance;
  }

  /**
   * Extract financial data from document
   */
  async extractFinancialData(documentId: string): Promise<FinancialData> {
    try {
      logger.info('Extracting financial data', { documentId });

      // Check cache first
      const cached = await aiCacheService.getExtractedData(documentId);
      if (cached?.financial) {
        logger.info('Returning cached financial data', { documentId });
        return cached.financial;
      }

      // Get document
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Analyze document with financial model
      const analysisResult = await azureDocumentIntelligenceClient.analyzeDocumentFromUrl(
        document.storageUrl,
        { modelId: 'prebuilt-document' }
      );

      const result = analysisResult.result;

      // Extract monetary amounts
      const amounts = this.extractMonetaryAmounts(result);

      // Extract bank accounts
      const accounts = this.extractBankAccounts(result);

      // Extract transactions
      const transactions = this.extractTransactions(result);

      // Extract balances
      const balances = this.extractBalances(result);

      // Calculate overall confidence
      const confidence = this.calculateFinancialConfidence(amounts, accounts, transactions, balances);

      const financialData: FinancialData = {
        amounts,
        accounts,
        transactions,
        balances,
        confidence,
      };

      // Cache the result
      await aiCacheService.cacheExtractedData(documentId, { financial: financialData });

      logger.info('Financial data extracted', {
        documentId,
        amountsCount: amounts.length,
        accountsCount: accounts.length,
        transactionsCount: transactions.length,
        confidence,
      });

      return financialData;
    } catch (error: any) {
      logger.error('Failed to extract financial data', {
        documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Extract personal information from document
   */
  async extractPersonalInfo(documentId: string): Promise<PersonalInfo> {
    try {
      logger.info('Extracting personal information', { documentId });

      // Check cache first
      const cached = await aiCacheService.getExtractedData(documentId);
      if (cached?.personal) {
        logger.info('Returning cached personal info', { documentId });
        return cached.personal;
      }

      // Get document
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Analyze document
      const analysisResult = await azureDocumentIntelligenceClient.analyzeDocumentFromUrl(
        document.storageUrl,
        { modelId: 'prebuilt-document' }
      );

      const result = analysisResult.result;

      // Extract names
      const names = this.extractNames(result);

      // Extract addresses
      const addresses = this.extractAddresses(result);

      // Extract identification numbers
      const identificationNumbers = this.extractIdentificationNumbers(result);

      // Extract contact info
      const contactInfo = this.extractContactInfo(result);

      // Extract date of birth
      const dateOfBirth = this.extractDateOfBirth(result);

      // Calculate overall confidence
      const confidence = this.calculatePersonalInfoConfidence(
        names,
        addresses,
        identificationNumbers,
        contactInfo
      );

      const personalInfo: PersonalInfo = {
        names,
        addresses,
        identificationNumbers,
        contactInfo,
        dateOfBirth,
        confidence,
      };

      // Cache the result
      await aiCacheService.cacheExtractedData(documentId, { personal: personalInfo });

      logger.info('Personal information extracted', {
        documentId,
        namesCount: names.length,
        addressesCount: addresses.length,
        confidence,
      });

      return personalInfo;
    } catch (error: any) {
      logger.error('Failed to extract personal info', {
        documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Extract business information from document
   */
  async extractBusinessInfo(documentId: string): Promise<BusinessInfo> {
    try {
      logger.info('Extracting business information', { documentId });

      // Check cache first
      const cached = await aiCacheService.getExtractedData(documentId);
      if (cached?.business) {
        logger.info('Returning cached business info', { documentId });
        return cached.business;
      }

      // Get document
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Analyze document
      const analysisResult = await azureDocumentIntelligenceClient.analyzeDocumentFromUrl(
        document.storageUrl,
        { modelId: 'prebuilt-document' }
      );

      const result = analysisResult.result;

      // Extract business information
      const businessName = this.extractBusinessName(result);
      const ein = this.extractEIN(result);
      const businessAddress = this.extractBusinessAddress(result);
      const businessType = this.extractBusinessType(result);
      const annualRevenue = this.extractAnnualRevenue(result);

      // Calculate confidence
      const confidence = this.calculateBusinessInfoConfidence(businessName, ein, businessAddress);

      const businessInfo: BusinessInfo = {
        businessName: businessName?.value,
        ein: ein?.value,
        businessAddress: businessAddress || undefined,
        businessType: businessType?.value,
        annualRevenue: annualRevenue?.value,
        confidence,
      };

      // Cache the result
      await aiCacheService.cacheExtractedData(documentId, { business: businessInfo });

      logger.info('Business information extracted', {
        documentId,
        hasBusinessName: !!businessName,
        hasEIN: !!ein,
        confidence,
      });

      return businessInfo;
    } catch (error: any) {
      logger.error('Failed to extract business info', {
        documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate extracted data
   */
  validateExtraction(extractedData: any, documentType: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fieldsRequiringReview: string[] = [];

    // Validate based on document type
    if (documentType === 'BANK_STATEMENT') {
      this.validateBankStatement(extractedData, errors, warnings, fieldsRequiringReview);
    } else if (documentType === 'TAX_RETURN') {
      this.validateTaxReturn(extractedData, errors, warnings, fieldsRequiringReview);
    } else if (documentType === 'W9') {
      this.validateW9(extractedData, errors, warnings, fieldsRequiringReview);
    }

    // Check confidence thresholds
    if (extractedData.confidence && extractedData.confidence < this.CONFIDENCE_THRESHOLD) {
      warnings.push({
        field: 'overall',
        message: `Extraction confidence (${(extractedData.confidence * 100).toFixed(1)}%) is below threshold`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fieldsRequiringReview,
    };
  }

  // ==================== Private Helper Methods ====================

  /**
   * Extract monetary amounts from analysis result
   */
  private extractMonetaryAmounts(result: any): MonetaryAmount[] {
    const amounts: MonetaryAmount[] = [];

    // Extract from key-value pairs
    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        if (kvp.value?.content) {
          const amount = this.parseMonetaryValue(kvp.value.content);
          if (amount !== null) {
            amounts.push({
              value: amount,
              currency: 'USD',
              context: kvp.key?.content || 'unknown',
              confidence: kvp.confidence || 0,
            });
          }
        }
      }
    }

    // Extract from document fields
    if (result.documents) {
      for (const doc of result.documents) {
        if (doc.fields) {
          for (const [fieldName, field] of Object.entries(doc.fields)) {
            if (field && typeof field === 'object' && 'content' in field) {
              const amount = this.parseMonetaryValue((field as any).content);
              if (amount !== null) {
                amounts.push({
                  value: amount,
                  currency: 'USD',
                  context: fieldName,
                  confidence: (field as any).confidence || 0,
                });
              }
            }
          }
        }
      }
    }

    return amounts;
  }

  /**
   * Parse monetary value from string
   */
  private parseMonetaryValue(text: string): number | null {
    // Remove currency symbols and commas
    const cleaned = text.replace(/[$,]/g, '').trim();

    // Try to parse as number
    const value = parseFloat(cleaned);

    if (!isNaN(value) && value > 0) {
      return value;
    }

    return null;
  }

  /**
   * Extract bank accounts
   */
  private extractBankAccounts(result: any): BankAccount[] {
    const accounts: BankAccount[] = [];

    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        const key = kvp.key?.content?.toLowerCase() || '';
        const value = kvp.value?.content || '';

        if (key.includes('account') && key.includes('number')) {
          accounts.push({
            accountNumber: value,
            confidence: kvp.confidence || 0,
          });
        }

        if (key.includes('routing') && key.includes('number')) {
          // Try to associate with last account
          if (accounts.length > 0) {
            accounts[accounts.length - 1].routingNumber = value;
          }
        }
      }
    }

    return accounts;
  }

  /**
   * Extract transactions
   */
  private extractTransactions(result: any): Transaction[] {
    const transactions: Transaction[] = [];

    // Extract from tables (common in bank statements)
    if (result.tables) {
      for (const table of result.tables) {
        // Look for transaction-like patterns in tables
        // This is a simplified implementation
        const rows = this.groupTableCellsByRow(table.cells);

        for (const row of rows) {
          if (row.length >= 3) {
            const dateCell = row.find((cell) => this.isDateLike(cell.content));
            const amountCell = row.find((cell) => this.parseMonetaryValue(cell.content) !== null);
            const descCell = row.find((cell) => cell !== dateCell && cell !== amountCell);

            if (dateCell && amountCell && descCell) {
              const amount = this.parseMonetaryValue(amountCell.content);
              if (amount !== null) {
                transactions.push({
                  date: new Date(dateCell.content),
                  amount: Math.abs(amount),
                  description: descCell.content,
                  type: amount < 0 ? 'DEBIT' : 'CREDIT',
                  confidence: 0.8,
                });
              }
            }
          }
        }
      }
    }

    return transactions;
  }

  /**
   * Group table cells by row
   */
  private groupTableCellsByRow(cells: any[]): any[][] {
    const rows: Map<number, any[]> = new Map();

    for (const cell of cells) {
      if (!rows.has(cell.rowIndex)) {
        rows.set(cell.rowIndex, []);
      }
      rows.get(cell.rowIndex)!.push(cell);
    }

    return Array.from(rows.values());
  }

  /**
   * Check if text looks like a date
   */
  private isDateLike(text: string): boolean {
    // Simple date pattern matching
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{2,4}/,
      /\d{4}-\d{2}-\d{2}/,
      /\w{3}\s+\d{1,2},?\s+\d{4}/,
    ];

    return datePatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Extract balances
   */
  private extractBalances(result: any): Balance[] {
    const balances: Balance[] = [];

    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        const key = kvp.key?.content?.toLowerCase() || '';
        const value = kvp.value?.content || '';

        if (key.includes('balance') || key.includes('total')) {
          const amount = this.parseMonetaryValue(value);
          if (amount !== null) {
            balances.push({
              type: key,
              amount,
              confidence: kvp.confidence || 0,
            });
          }
        }
      }
    }

    return balances;
  }

  /**
   * Extract names
   */
  private extractNames(result: any): PersonName[] {
    const names: PersonName[] = [];

    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        const key = kvp.key?.content?.toLowerCase() || '';
        const value = kvp.value?.content || '';

        if (key.includes('name') && !key.includes('business') && !key.includes('company')) {
          names.push({
            fullName: value,
            confidence: kvp.confidence || 0,
          });
        }
      }
    }

    return names;
  }

  /**
   * Extract addresses
   */
  private extractAddresses(result: any): Address[] {
    const addresses: Address[] = [];

    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        const key = kvp.key?.content?.toLowerCase() || '';
        const value = kvp.value?.content || '';

        if (key.includes('address')) {
          addresses.push({
            streetAddress: value,
            confidence: kvp.confidence || 0,
          });
        }
      }
    }

    return addresses;
  }

  /**
   * Extract identification numbers
   */
  private extractIdentificationNumbers(result: any): IdentificationNumber[] {
    const ids: IdentificationNumber[] = [];

    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        const key = kvp.key?.content?.toLowerCase() || '';
        const value = kvp.value?.content || '';

        if (key.includes('ssn') || key.includes('social security')) {
          ids.push({
            type: 'SSN',
            value,
            confidence: kvp.confidence || 0,
          });
        } else if (key.includes('ein') || key.includes('employer identification')) {
          ids.push({
            type: 'EIN',
            value,
            confidence: kvp.confidence || 0,
          });
        }
      }
    }

    return ids;
  }

  /**
   * Extract contact information
   */
  private extractContactInfo(result: any): ContactInfo {
    const phoneNumbers: PhoneNumber[] = [];
    const emailAddresses: EmailAddress[] = [];

    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        const key = kvp.key?.content?.toLowerCase() || '';
        const value = kvp.value?.content || '';

        if (key.includes('phone') || key.includes('tel')) {
          phoneNumbers.push({
            number: value,
            confidence: kvp.confidence || 0,
          });
        } else if (key.includes('email')) {
          emailAddresses.push({
            email: value,
            confidence: kvp.confidence || 0,
          });
        }
      }
    }

    return { phoneNumbers, emailAddresses };
  }

  /**
   * Extract date of birth
   */
  private extractDateOfBirth(result: any): Date | undefined {
    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        const key = kvp.key?.content?.toLowerCase() || '';
        const value = kvp.value?.content || '';

        if (key.includes('birth') || key.includes('dob')) {
          try {
            return new Date(value);
          } catch {
            return undefined;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Extract business name
   */
  private extractBusinessName(result: any): { value: string; confidence: number } | null {
    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        const key = kvp.key?.content?.toLowerCase() || '';
        const value = kvp.value?.content || '';

        if (key.includes('business') && key.includes('name') || key.includes('company')) {
          return { value, confidence: kvp.confidence || 0 };
        }
      }
    }

    return null;
  }

  /**
   * Extract EIN
   */
  private extractEIN(result: any): { value: string; confidence: number } | null {
    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        const key = kvp.key?.content?.toLowerCase() || '';
        const value = kvp.value?.content || '';

        if (key.includes('ein') || key.includes('employer identification')) {
          return { value, confidence: kvp.confidence || 0 };
        }
      }
    }

    return null;
  }

  /**
   * Extract business address
   */
  private extractBusinessAddress(result: any): Address | null {
    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        const key = kvp.key?.content?.toLowerCase() || '';
        const value = kvp.value?.content || '';

        if (key.includes('business') && key.includes('address')) {
          return {
            streetAddress: value,
            confidence: kvp.confidence || 0,
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract business type
   */
  private extractBusinessType(result: any): { value: string; confidence: number } | null {
    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        const key = kvp.key?.content?.toLowerCase() || '';
        const value = kvp.value?.content || '';

        if (key.includes('business') && key.includes('type') || key.includes('entity type')) {
          return { value, confidence: kvp.confidence || 0 };
        }
      }
    }

    return null;
  }

  /**
   * Extract annual revenue
   */
  private extractAnnualRevenue(result: any): { value: number; confidence: number } | null {
    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        const key = kvp.key?.content?.toLowerCase() || '';
        const value = kvp.value?.content || '';

        if (key.includes('revenue') || key.includes('income')) {
          const amount = this.parseMonetaryValue(value);
          if (amount !== null) {
            return { value: amount, confidence: kvp.confidence || 0 };
          }
        }
      }
    }

    return null;
  }

  /**
   * Calculate financial data confidence
   */
  private calculateFinancialConfidence(
    amounts: MonetaryAmount[],
    accounts: BankAccount[],
    transactions: Transaction[],
    balances: Balance[]
  ): number {
    const confidences: number[] = [];

    amounts.forEach((a) => confidences.push(a.confidence));
    accounts.forEach((a) => confidences.push(a.confidence));
    transactions.forEach((t) => confidences.push(t.confidence));
    balances.forEach((b) => confidences.push(b.confidence));

    if (confidences.length === 0) return 0;

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  /**
   * Calculate personal info confidence
   */
  private calculatePersonalInfoConfidence(
    names: PersonName[],
    addresses: Address[],
    ids: IdentificationNumber[],
    contact: ContactInfo
  ): number {
    const confidences: number[] = [];

    names.forEach((n) => confidences.push(n.confidence));
    addresses.forEach((a) => confidences.push(a.confidence));
    ids.forEach((id) => confidences.push(id.confidence));
    contact.phoneNumbers.forEach((p) => confidences.push(p.confidence));
    contact.emailAddresses.forEach((e) => confidences.push(e.confidence));

    if (confidences.length === 0) return 0;

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  /**
   * Calculate business info confidence
   */
  private calculateBusinessInfoConfidence(
    businessName: any,
    ein: any,
    address: Address | null
  ): number {
    const confidences: number[] = [];

    if (businessName) confidences.push(businessName.confidence);
    if (ein) confidences.push(ein.confidence);
    if (address) confidences.push(address.confidence);

    if (confidences.length === 0) return 0;

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  /**
   * Validate bank statement data
   */
  private validateBankStatement(
    data: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fieldsRequiringReview: string[]
  ): void {
    if (!data.accounts || data.accounts.length === 0) {
      errors.push({
        field: 'accounts',
        message: 'No bank account information found',
        severity: 'ERROR',
      });
    }

    if (!data.balances || data.balances.length === 0) {
      warnings.push({
        field: 'balances',
        message: 'No balance information found',
      });
    }
  }

  /**
   * Validate tax return data
   */
  private validateTaxReturn(
    data: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fieldsRequiringReview: string[]
  ): void {
    if (!data.amounts || data.amounts.length === 0) {
      errors.push({
        field: 'amounts',
        message: 'No financial amounts found in tax return',
        severity: 'ERROR',
      });
    }
  }

  /**
   * Validate W9 data
   */
  private validateW9(
    data: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fieldsRequiringReview: string[]
  ): void {
    if (!data.names || data.names.length === 0) {
      errors.push({
        field: 'names',
        message: 'No name information found',
        severity: 'ERROR',
      });
    }

    if (!data.identificationNumbers || data.identificationNumbers.length === 0) {
      errors.push({
        field: 'identificationNumbers',
        message: 'No SSN or EIN found',
        severity: 'ERROR',
      });
    }
  }
}

export default SmartExtractionService.getInstance();
