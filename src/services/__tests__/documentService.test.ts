/**
 * Document Service Unit Tests
 * Tests for file upload validation, classification, and data extraction
 */

import documentService from '../documentService';
import documentRepository from '../../repositories/documentRepository';
import auditLogRepository from '../../repositories/auditLogRepository';
import storageService from '../../utils/storage';
import classificationClient from '../../clients/classificationClient';
import extractionClient from '../../clients/extractionClient';
import { DocumentType, DocumentMetadata, ClassificationResult } from '../../models/document';

// Mock dependencies
jest.mock('../../repositories/documentRepository');
jest.mock('../../repositories/auditLogRepository');
jest.mock('../../utils/storage');
jest.mock('../../clients/classificationClient');
jest.mock('../../clients/extractionClient');
jest.mock('../../utils/logger');

describe('DocumentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocument - File Upload Validation', () => {
    const mockApplicationId = 'app-123';
    const mockUserId = 'user-456';

    it('should successfully upload a valid PDF file', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'document',
        originalname: 'w-9-form.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024 * 1024, // 1MB
        buffer: Buffer.from('mock file content'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      const mockStorageUrl = 'encrypted-storage-url';
      const mockDocument: DocumentMetadata = {
        id: 'doc-123',
        applicationId: mockApplicationId,
        fileName: mockFile.originalname,
        fileSize: mockFile.size,
        mimeType: mockFile.mimetype,
        storageUrl: mockStorageUrl,
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      (storageService.uploadFile as jest.Mock).mockResolvedValue(mockStorageUrl);
      (documentRepository.create as jest.Mock).mockResolvedValue(mockDocument);
      (auditLogRepository.create as jest.Mock).mockResolvedValue({});

      const result = await documentService.uploadDocument(mockFile, mockApplicationId, mockUserId);

      expect(result).toEqual(mockDocument);
      expect(storageService.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype
      );
      expect(documentRepository.create).toHaveBeenCalled();
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'DOCUMENT_UPLOADED',
          performedBy: mockUserId,
        })
      );
    });

    it('should reject file exceeding maximum size (10MB)', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'document',
        originalname: 'large-file.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024, // 11MB - exceeds limit
        buffer: Buffer.from('mock file content'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      await expect(
        documentService.uploadDocument(mockFile, mockApplicationId, mockUserId)
      ).rejects.toThrow('File validation failed');

      expect(storageService.uploadFile).not.toHaveBeenCalled();
      expect(documentRepository.create).not.toHaveBeenCalled();
    });

    it('should reject file with invalid MIME type', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'document',
        originalname: 'script.exe',
        encoding: '7bit',
        mimetype: 'application/x-msdownload',
        size: 1024,
        buffer: Buffer.from('mock file content'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      await expect(
        documentService.uploadDocument(mockFile, mockApplicationId, mockUserId)
      ).rejects.toThrow('File validation failed');

      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('should accept all allowed MIME types', async () => {
      const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/tiff',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      for (const mimeType of allowedMimeTypes) {
        const mockFile: Express.Multer.File = {
          fieldname: 'document',
          originalname: `test-file.${mimeType.split('/')[1]}`,
          encoding: '7bit',
          mimetype: mimeType,
          size: 1024,
          buffer: Buffer.from('mock file content'),
          stream: null as any,
          destination: '',
          filename: '',
          path: '',
        };

        const mockDocument: DocumentMetadata = {
          id: `doc-${mimeType}`,
          applicationId: mockApplicationId,
          fileName: mockFile.originalname,
          fileSize: mockFile.size,
          mimeType: mockFile.mimetype,
          storageUrl: 'mock-url',
          requiresManualReview: false,
          uploadedAt: new Date(),
        };

        (storageService.uploadFile as jest.Mock).mockResolvedValue('mock-url');
        (documentRepository.create as jest.Mock).mockResolvedValue(mockDocument);
        (auditLogRepository.create as jest.Mock).mockResolvedValue({});

        const result = await documentService.uploadDocument(mockFile, mockApplicationId, mockUserId);

        expect(result.mimeType).toBe(mimeType);
      }
    });

    it('should handle storage service errors gracefully', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'document',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('mock file content'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      (storageService.uploadFile as jest.Mock).mockRejectedValue(
        new Error('Storage service unavailable')
      );

      await expect(
        documentService.uploadDocument(mockFile, mockApplicationId, mockUserId)
      ).rejects.toThrow();

      expect(documentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('classifyDocument - Classification Confidence Score', () => {
    const mockDocumentId = 'doc-123';

    it('should classify document with high confidence (>= 80)', async () => {
      const mockDocument: DocumentMetadata = {
        id: mockDocumentId,
        applicationId: 'app-123',
        fileName: 'w-9-form.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'mock-url',
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      const mockClassification: ClassificationResult = {
        documentType: DocumentType.W9,
        confidenceScore: 95,
        requiresManualReview: false,
        timestamp: new Date(),
      };

      (documentRepository.findById as jest.Mock).mockResolvedValue(mockDocument);
      (classificationClient.classifyDocument as jest.Mock).mockResolvedValue(mockClassification);
      (documentRepository.updateClassification as jest.Mock).mockResolvedValue({
        ...mockDocument,
        documentType: mockClassification.documentType,
        classificationConfidence: mockClassification.confidenceScore,
      });
      (auditLogRepository.create as jest.Mock).mockResolvedValue({});

      const result = await documentService.classifyDocument(mockDocumentId);

      expect(result.confidenceScore).toBe(95);
      expect(result.requiresManualReview).toBe(false);
      expect(result.documentType).toBe(DocumentType.W9);
      expect(documentRepository.updateClassification).toHaveBeenCalledWith(
        mockDocumentId,
        expect.objectContaining({
          confidenceScore: 95,
          requiresManualReview: false,
        })
      );
    });

    it('should flag document for manual review when confidence < 80', async () => {
      const mockDocument: DocumentMetadata = {
        id: mockDocumentId,
        applicationId: 'app-123',
        fileName: 'unclear-document.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'mock-url',
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      const mockClassification: ClassificationResult = {
        documentType: DocumentType.OTHER,
        confidenceScore: 65,
        requiresManualReview: true,
        timestamp: new Date(),
      };

      (documentRepository.findById as jest.Mock).mockResolvedValue(mockDocument);
      (classificationClient.classifyDocument as jest.Mock).mockResolvedValue(mockClassification);
      (documentRepository.updateClassification as jest.Mock).mockResolvedValue({
        ...mockDocument,
        documentType: mockClassification.documentType,
        classificationConfidence: mockClassification.confidenceScore,
        requiresManualReview: true,
      });
      (auditLogRepository.create as jest.Mock).mockResolvedValue({});

      const result = await documentService.classifyDocument(mockDocumentId);

      expect(result.confidenceScore).toBe(65);
      expect(result.requiresManualReview).toBe(true);
      expect(documentRepository.updateClassification).toHaveBeenCalledWith(
        mockDocumentId,
        expect.objectContaining({
          requiresManualReview: true,
        })
      );
    });

    it('should handle classification service errors', async () => {
      const mockDocument: DocumentMetadata = {
        id: mockDocumentId,
        applicationId: 'app-123',
        fileName: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'mock-url',
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      (documentRepository.findById as jest.Mock).mockResolvedValue(mockDocument);
      (classificationClient.classifyDocument as jest.Mock).mockRejectedValue(
        new Error('Classification service error')
      );

      await expect(documentService.classifyDocument(mockDocumentId)).rejects.toThrow();
    });

    it('should throw error when document not found', async () => {
      (documentRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(documentService.classifyDocument(mockDocumentId)).rejects.toThrow(
        'Document not found'
      );

      expect(classificationClient.classifyDocument).not.toHaveBeenCalled();
    });

    it('should log classification with confidence score in audit log', async () => {
      const mockDocument: DocumentMetadata = {
        id: mockDocumentId,
        applicationId: 'app-123',
        fileName: 'w-9-form.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'mock-url',
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      const mockClassification: ClassificationResult = {
        documentType: DocumentType.W9,
        confidenceScore: 92,
        requiresManualReview: false,
        timestamp: new Date(),
      };

      (documentRepository.findById as jest.Mock).mockResolvedValue(mockDocument);
      (classificationClient.classifyDocument as jest.Mock).mockResolvedValue(mockClassification);
      (documentRepository.updateClassification as jest.Mock).mockResolvedValue(mockDocument);
      (auditLogRepository.create as jest.Mock).mockResolvedValue({});

      await documentService.classifyDocument(mockDocumentId);

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'DOCUMENT_CLASSIFIED',
          confidenceScore: 92,
          performedBy: 'SYSTEM',
        })
      );
    });
  });

  describe('extractData - Data Extraction Accuracy', () => {
    const mockDocumentId = 'doc-123';

    it('should extract W-9 form data with high accuracy', async () => {
      const mockDocument: DocumentMetadata = {
        id: mockDocumentId,
        applicationId: 'app-123',
        fileName: 'w-9-form.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'mock-url',
        documentType: DocumentType.W9,
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      const mockExtractedData = {
        fields: {
          businessName: 'Sample Business LLC',
          ein: '12-3456789',
          taxClassification: 'LLC',
          address: '123 Main St, City, ST 12345',
        },
        confidenceScores: {
          businessName: 92,
          ein: 95,
          taxClassification: 88,
          address: 90,
        },
      };

      (documentRepository.findById as jest.Mock).mockResolvedValue(mockDocument);
      (extractionClient.extractData as jest.Mock).mockResolvedValue(mockExtractedData);
      (documentRepository.updateExtractedData as jest.Mock).mockResolvedValue({
        ...mockDocument,
        extractedData: mockExtractedData.fields,
      });
      (auditLogRepository.create as jest.Mock).mockResolvedValue({});

      const result = await documentService.extractData(mockDocumentId);

      expect(result.documentId).toBe(mockDocumentId);
      expect(result.fields).toEqual(mockExtractedData.fields);
      expect(result.confidenceScores).toEqual(mockExtractedData.confidenceScores);
      expect(result.fields.ein).toBe('12-3456789');
      expect(result.fields.businessName).toBe('Sample Business LLC');
      expect(result.confidenceScores.ein).toBeGreaterThanOrEqual(95);
    });

    it('should extract bank statement data accurately', async () => {
      const mockDocument: DocumentMetadata = {
        id: mockDocumentId,
        applicationId: 'app-123',
        fileName: 'bank-statement.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'mock-url',
        documentType: DocumentType.BANK_STATEMENT,
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      const mockExtractedData = {
        fields: {
          accountNumber: '****1234',
          accountHolderName: 'Sample Business LLC',
          bankName: 'Sample Bank',
          statementDate: '2024-01-31',
          balance: 50000.0,
        },
        confidenceScores: {
          accountNumber: 85,
          accountHolderName: 90,
          bankName: 95,
          statementDate: 92,
          balance: 88,
        },
      };

      (documentRepository.findById as jest.Mock).mockResolvedValue(mockDocument);
      (extractionClient.extractData as jest.Mock).mockResolvedValue(mockExtractedData);
      (documentRepository.updateExtractedData as jest.Mock).mockResolvedValue({
        ...mockDocument,
        extractedData: mockExtractedData.fields,
      });
      (auditLogRepository.create as jest.Mock).mockResolvedValue({});

      const result = await documentService.extractData(mockDocumentId);

      expect(result.fields.accountNumber).toBe('****1234');
      expect(result.fields.balance).toBe(50000.0);
      expect(result.confidenceScores.bankName).toBeGreaterThanOrEqual(85);
    });

    it('should extract EIN verification data', async () => {
      const mockDocument: DocumentMetadata = {
        id: mockDocumentId,
        applicationId: 'app-123',
        fileName: 'ein-verification.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'mock-url',
        documentType: DocumentType.EIN_VERIFICATION,
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      const mockExtractedData = {
        fields: {
          ein: '12-3456789',
          businessName: 'Sample Business LLC',
          verificationDate: '2024-01-15',
        },
        confidenceScores: {
          ein: 98,
          businessName: 95,
          verificationDate: 90,
        },
      };

      (documentRepository.findById as jest.Mock).mockResolvedValue(mockDocument);
      (extractionClient.extractData as jest.Mock).mockResolvedValue(mockExtractedData);
      (documentRepository.updateExtractedData as jest.Mock).mockResolvedValue({
        ...mockDocument,
        extractedData: mockExtractedData.fields,
      });
      (auditLogRepository.create as jest.Mock).mockResolvedValue({});

      const result = await documentService.extractData(mockDocumentId);

      expect(result.fields.ein).toBe('12-3456789');
      expect(result.fields.businessName).toBe('Sample Business LLC');
      expect(result.confidenceScores.ein).toBeGreaterThanOrEqual(95);
    });

    it('should throw error when document is not classified before extraction', async () => {
      const mockDocument: DocumentMetadata = {
        id: mockDocumentId,
        applicationId: 'app-123',
        fileName: 'unclassified.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'mock-url',
        documentType: undefined,
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      (documentRepository.findById as jest.Mock).mockResolvedValue(mockDocument);

      await expect(documentService.extractData(mockDocumentId)).rejects.toThrow(
        'Document must be classified before data extraction'
      );

      expect(extractionClient.extractData).not.toHaveBeenCalled();
    });

    it('should throw error when document not found', async () => {
      (documentRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(documentService.extractData(mockDocumentId)).rejects.toThrow(
        'Document not found'
      );

      expect(extractionClient.extractData).not.toHaveBeenCalled();
    });

    it('should update document with extracted data', async () => {
      const mockDocument: DocumentMetadata = {
        id: mockDocumentId,
        applicationId: 'app-123',
        fileName: 'w-9-form.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'mock-url',
        documentType: DocumentType.W9,
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      const mockExtractedData = {
        fields: {
          businessName: 'Test Business',
          ein: '98-7654321',
        },
        confidenceScores: {
          businessName: 90,
          ein: 95,
        },
      };

      (documentRepository.findById as jest.Mock).mockResolvedValue(mockDocument);
      (extractionClient.extractData as jest.Mock).mockResolvedValue(mockExtractedData);
      (documentRepository.updateExtractedData as jest.Mock).mockResolvedValue({
        ...mockDocument,
        extractedData: mockExtractedData.fields,
      });
      (auditLogRepository.create as jest.Mock).mockResolvedValue({});

      await documentService.extractData(mockDocumentId);

      expect(documentRepository.updateExtractedData).toHaveBeenCalledWith(
        mockDocumentId,
        mockExtractedData.fields
      );
    });

    it('should log extraction action in audit log', async () => {
      const mockDocument: DocumentMetadata = {
        id: mockDocumentId,
        applicationId: 'app-123',
        fileName: 'w-9-form.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'mock-url',
        documentType: DocumentType.W9,
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      const mockExtractedData = {
        fields: {
          businessName: 'Test Business',
          ein: '98-7654321',
        },
        confidenceScores: {
          businessName: 90,
          ein: 95,
        },
      };

      (documentRepository.findById as jest.Mock).mockResolvedValue(mockDocument);
      (extractionClient.extractData as jest.Mock).mockResolvedValue(mockExtractedData);
      (documentRepository.updateExtractedData as jest.Mock).mockResolvedValue(mockDocument);
      (auditLogRepository.create as jest.Mock).mockResolvedValue({});

      await documentService.extractData(mockDocumentId);

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'DOCUMENT_DATA_EXTRACTED',
          performedBy: 'SYSTEM',
          details: expect.objectContaining({
            documentType: DocumentType.W9,
            fieldsExtracted: ['businessName', 'ein'],
          }),
        })
      );
    });
  });

  describe('getDocument', () => {
    it('should retrieve document by ID', async () => {
      const mockDocument: DocumentMetadata = {
        id: 'doc-123',
        applicationId: 'app-123',
        fileName: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'mock-url',
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      (documentRepository.findById as jest.Mock).mockResolvedValue(mockDocument);

      const result = await documentService.getDocument('doc-123');

      expect(result).toEqual(mockDocument);
      expect(documentRepository.findById).toHaveBeenCalledWith('doc-123');
    });

    it('should throw error when document not found', async () => {
      (documentRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(documentService.getDocument('non-existent')).rejects.toThrow(
        'Document not found'
      );
    });
  });

  describe('getApplicationDocuments', () => {
    it('should retrieve all documents for an application', async () => {
      const mockDocuments: DocumentMetadata[] = [
        {
          id: 'doc-1',
          applicationId: 'app-123',
          fileName: 'w-9.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          storageUrl: 'mock-url-1',
          requiresManualReview: false,
          uploadedAt: new Date(),
        },
        {
          id: 'doc-2',
          applicationId: 'app-123',
          fileName: 'bank-statement.pdf',
          fileSize: 2048,
          mimeType: 'application/pdf',
          storageUrl: 'mock-url-2',
          requiresManualReview: false,
          uploadedAt: new Date(),
        },
      ];

      (documentRepository.findByApplicationId as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await documentService.getApplicationDocuments('app-123');

      expect(result).toEqual(mockDocuments);
      expect(result).toHaveLength(2);
      expect(documentRepository.findByApplicationId).toHaveBeenCalledWith('app-123');
    });
  });

  describe('deleteDocument', () => {
    it('should delete document and log action', async () => {
      const mockDocument: DocumentMetadata = {
        id: 'doc-123',
        applicationId: 'app-123',
        fileName: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'mock-url',
        requiresManualReview: false,
        uploadedAt: new Date(),
      };

      (documentRepository.findById as jest.Mock).mockResolvedValue(mockDocument);
      (storageService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (documentRepository.delete as jest.Mock).mockResolvedValue(undefined);
      (auditLogRepository.create as jest.Mock).mockResolvedValue({});

      await documentService.deleteDocument('doc-123', 'user-456');

      expect(storageService.deleteFile).toHaveBeenCalledWith('mock-url');
      expect(documentRepository.delete).toHaveBeenCalledWith('doc-123');
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'DOCUMENT_DELETED',
          performedBy: 'user-456',
        })
      );
    });

    it('should throw error when document not found', async () => {
      (documentRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(documentService.deleteDocument('non-existent', 'user-456')).rejects.toThrow(
        'Document not found'
      );

      expect(storageService.deleteFile).not.toHaveBeenCalled();
      expect(documentRepository.delete).not.toHaveBeenCalled();
    });
  });
});
