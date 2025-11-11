/**
 * Image Manipulation Detector
 * Detects potential image manipulation and forensic anomalies in documents
 * Implements forensic analysis algorithms, metadata checks, and artifact detection
 */

import azureDocumentIntelligenceClient from '../clients/azureDocumentIntelligenceClient';
import documentRepository from '../repositories/documentRepository';
import logger from '../utils/logger';
import { BoundingBox } from './aiDocumentAnalyzerService';

export interface ManipulationResult {
  isManipulated: boolean;
  confidence: number;
  indicators: ManipulationIndicator[];
  forensicData: ForensicData;
}

export interface ManipulationIndicator {
  type: 'CLONE_DETECTION' | 'METADATA_INCONSISTENCY' | 'COMPRESSION_ARTIFACTS' | 'FONT_ANOMALY' | 'QUALITY_INCONSISTENCY';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location?: BoundingBox;
  evidence: string[];
}

export interface ForensicData {
  metadata: DocumentForensicMetadata;
  qualityMetrics: QualityMetrics;
  textAnalysis: TextAnalysis;
  structuralAnalysis: StructuralAnalysis;
}

export interface DocumentForensicMetadata {
  creationDate?: Date;
  modificationDate?: Date;
  software?: string;
  author?: string;
  producer?: string;
  hasInconsistencies: boolean;
  inconsistencyDetails: string[];
}

export interface QualityMetrics {
  overallQuality: number; // 0-100
  hasQualityInconsistencies: boolean;
  regions: QualityRegion[];
}

export interface QualityRegion {
  area: BoundingBox;
  quality: number;
  anomalyScore: number;
}

export interface TextAnalysis {
  hasFontInconsistencies: boolean;
  fontVariations: FontVariation[];
  suspiciousTextPatterns: string[];
}

export interface FontVariation {
  fontName?: string;
  fontSize?: number;
  location: BoundingBox;
  isAnomalous: boolean;
}

export interface StructuralAnalysis {
  hasStructuralAnomalies: boolean;
  compressionArtifacts: CompressionArtifact[];
  cloneDetections: CloneDetection[];
}

export interface CompressionArtifact {
  type: 'JPEG_ARTIFACTS' | 'RECOMPRESSION' | 'QUALITY_MISMATCH';
  location: BoundingBox;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface CloneDetection {
  sourceRegion: BoundingBox;
  clonedRegion: BoundingBox;
  similarity: number; // 0-1
  confidence: number;
}

class ImageManipulationDetector {
  private static instance: ImageManipulationDetector;
  private readonly MANIPULATION_THRESHOLD = 0.7;
  private readonly METADATA_WEIGHT = 0.25;
  private readonly QUALITY_WEIGHT = 0.30;
  private readonly TEXT_WEIGHT = 0.20;
  private readonly STRUCTURAL_WEIGHT = 0.25;

  private constructor() {}

  public static getInstance(): ImageManipulationDetector {
    if (!ImageManipulationDetector.instance) {
      ImageManipulationDetector.instance = new ImageManipulationDetector();
    }
    return ImageManipulationDetector.instance;
  }

  /**
   * Detect image manipulation in a document
   */
  async detectManipulation(documentId: string): Promise<ManipulationResult> {
    try {
      logger.info('Starting image manipulation detection', { documentId });

      // Get document
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Analyze document with Azure AI
      const analysisResult = await azureDocumentIntelligenceClient.analyzeDocumentFromUrl(
        document.storageUrl,
        { modelId: 'prebuilt-document' }
      );

      // Perform forensic analysis
      const forensicData = await this.performForensicAnalysis(analysisResult.result, document);

      // Detect manipulation indicators
      const indicators = this.detectManipulationIndicators(forensicData);

      // Calculate manipulation confidence
      const confidence = this.calculateManipulationConfidence(forensicData, indicators);

      // Determine if document is manipulated
      const isManipulated = confidence >= this.MANIPULATION_THRESHOLD;

      const result: ManipulationResult = {
        isManipulated,
        confidence,
        indicators,
        forensicData,
      };

      logger.info('Image manipulation detection completed', {
        documentId,
        isManipulated,
        confidence,
        indicatorCount: indicators.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Image manipulation detection failed', {
        documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Perform comprehensive forensic analysis
   */
  private async performForensicAnalysis(analysisResult: any, document: any): Promise<ForensicData> {
    // Analyze metadata
    const metadata = this.analyzeMetadata(analysisResult, document);

    // Analyze quality metrics
    const qualityMetrics = this.analyzeQuality(analysisResult);

    // Analyze text patterns
    const textAnalysis = this.analyzeText(analysisResult);

    // Analyze structural properties
    const structuralAnalysis = this.analyzeStructure(analysisResult);

    return {
      metadata,
      qualityMetrics,
      textAnalysis,
      structuralAnalysis,
    };
  }

  /**
   * Analyze document metadata for inconsistencies
   */
  private analyzeMetadata(analysisResult: any, document: any): DocumentForensicMetadata {
    const inconsistencies: string[] = [];
    let hasInconsistencies = false;

    // Check for metadata presence
    const metadata = analysisResult.metadata || {};

    // Check creation vs modification dates
    if (metadata.createdDate && metadata.modifiedDate) {
      const created = new Date(metadata.createdDate);
      const modified = new Date(metadata.modifiedDate);

      if (modified < created) {
        inconsistencies.push('Modification date is before creation date');
        hasInconsistencies = true;
      }
    }

    // Check for suspicious software patterns
    if (metadata.producer) {
      const suspiciousSoftware = ['photoshop', 'gimp', 'paint.net', 'pixlr'];
      const producer = metadata.producer.toLowerCase();

      if (suspiciousSoftware.some(sw => producer.includes(sw))) {
        inconsistencies.push(`Document created/modified with image editing software: ${metadata.producer}`);
        hasInconsistencies = true;
      }
    }

    // Check document upload date vs creation date
    if (metadata.createdDate && document.uploadedAt) {
      const created = new Date(metadata.createdDate);
      const uploaded = new Date(document.uploadedAt);

      // If document was "created" after it was uploaded, that's suspicious
      if (created > uploaded) {
        inconsistencies.push('Document creation date is after upload date');
        hasInconsistencies = true;
      }
    }

    return {
      creationDate: metadata.createdDate ? new Date(metadata.createdDate) : undefined,
      modificationDate: metadata.modifiedDate ? new Date(metadata.modifiedDate) : undefined,
      software: metadata.producer,
      author: metadata.author,
      producer: metadata.producer,
      hasInconsistencies,
      inconsistencyDetails: inconsistencies,
    };
  }

  /**
   * Analyze document quality for inconsistencies
   */
  private analyzeQuality(analysisResult: any): QualityMetrics {
    const regions: QualityRegion[] = [];
    let hasQualityInconsistencies = false;

    if (analysisResult.pages) {
      for (const page of analysisResult.pages) {
        // Analyze each page for quality metrics
        const pageQuality = this.calculatePageQuality(page);

        // Check for regions with significantly different quality
        if (page.lines) {
          const lineQualities = page.lines.map((line: any) => 
            this.calculateLineQuality(line)
          );

          // Detect quality variations
          const avgQuality = lineQualities.reduce((sum: number, q: number) => sum + q, 0) / lineQualities.length;
          const variance = lineQualities.reduce((sum: number, q: number) => 
            sum + Math.pow(q - avgQuality, 2), 0
          ) / lineQualities.length;

          // High variance indicates quality inconsistencies
          if (variance > 400) { // threshold for significant variance
            hasQualityInconsistencies = true;
          }

          // Create quality regions for areas with low quality
          page.lines.forEach((line: any, index: number) => {
            const quality = lineQualities[index];
            if (quality < 60) {
              regions.push({
                area: this.extractBoundingBox(line, page.pageNumber),
                quality,
                anomalyScore: (100 - quality) / 100,
              });
            }
          });
        }
      }
    }

    return {
      overallQuality: this.calculateOverallQuality(analysisResult),
      hasQualityInconsistencies,
      regions,
    };
  }

  /**
   * Calculate page quality score
   */
  private calculatePageQuality(page: any): number {
    let quality = 100;

    // Deduct for low line count
    if (page.lines && page.lines.length < 5) {
      quality -= 20;
    }

    // Deduct for low confidence
    if (page.lines) {
      const avgConfidence = page.lines.reduce((sum: number, line: any) => 
        sum + (line.confidence || 0), 0
      ) / page.lines.length;

      if (avgConfidence < 0.7) {
        quality -= 30;
      } else if (avgConfidence < 0.85) {
        quality -= 15;
      }
    }

    return Math.max(0, quality);
  }

  /**
   * Calculate line quality score
   */
  private calculateLineQuality(line: any): number {
    const confidence = line.confidence || 0;
    return confidence * 100;
  }

  /**
   * Calculate overall document quality
   */
  private calculateOverallQuality(analysisResult: any): number {
    if (!analysisResult.pages || analysisResult.pages.length === 0) {
      return 0;
    }

    const pageQualities = analysisResult.pages.map((page: any) => 
      this.calculatePageQuality(page)
    );

    return pageQualities.reduce((sum: number, q: number) => sum + q, 0) / pageQualities.length;
  }

  /**
   * Analyze text for font inconsistencies and suspicious patterns
   */
  private analyzeText(analysisResult: any): TextAnalysis {
    const fontVariations: FontVariation[] = [];
    const suspiciousTextPatterns: string[] = [];
    let hasFontInconsistencies = false;

    if (analysisResult.pages) {
      const fontSizes = new Set<number>();
      const fontStyles = new Set<string>();

      for (const page of analysisResult.pages) {
        if (page.lines) {
          for (const line of page.lines) {
            // Detect font variations (simplified - Azure doesn't provide detailed font info)
            // We use confidence and appearance as proxies
            if (line.appearance) {
              const style = JSON.stringify(line.appearance.style);
              fontStyles.add(style);
            }

            // Check for suspicious text patterns
            if (line.content) {
              // Check for repeated identical text (possible cloning)
              const content = line.content.trim();
              if (content.length > 10) {
                const pattern = content.substring(0, 20);
                if (suspiciousTextPatterns.includes(pattern)) {
                  hasFontInconsistencies = true;
                } else {
                  suspiciousTextPatterns.push(pattern);
                }
              }

              // Check for unusual character patterns
              if (this.hasUnusualCharacterPattern(content)) {
                suspiciousTextPatterns.push(`Unusual pattern: ${content.substring(0, 30)}`);
              }
            }
          }
        }
      }

      // Multiple font styles might indicate manipulation
      if (fontStyles.size > 5) {
        hasFontInconsistencies = true;
      }
    }

    return {
      hasFontInconsistencies,
      fontVariations,
      suspiciousTextPatterns: suspiciousTextPatterns.slice(0, 10), // Limit to first 10
    };
  }

  /**
   * Check for unusual character patterns
   */
  private hasUnusualCharacterPattern(text: string): boolean {
    // Check for excessive special characters
    const specialCharCount = (text.match(/[^a-zA-Z0-9\s.,;:!?-]/g) || []).length;
    if (specialCharCount / text.length > 0.3) {
      return true;
    }

    // Check for repeated characters
    if (/(.)\1{5,}/.test(text)) {
      return true;
    }

    return false;
  }

  /**
   * Analyze structural properties for compression artifacts and cloning
   */
  private analyzeStructure(analysisResult: any): StructuralAnalysis {
    const compressionArtifacts: CompressionArtifact[] = [];
    const cloneDetections: CloneDetection[] = [];
    let hasStructuralAnomalies = false;

    if (analysisResult.pages) {
      for (const page of analysisResult.pages) {
        // Detect compression artifacts through confidence variations
        if (page.lines) {
          const confidences = page.lines.map((line: any) => line.confidence || 0);
          const avgConfidence = confidences.reduce((sum: number, c: number) => sum + c, 0) / confidences.length;

          // Look for sudden confidence drops (possible recompression)
          page.lines.forEach((line: any) => {
            if (line.confidence && line.confidence < avgConfidence - 0.3) {
              compressionArtifacts.push({
                type: 'QUALITY_MISMATCH',
                location: this.extractBoundingBox(line, page.pageNumber),
                severity: 'MEDIUM',
                description: `Low confidence region (${(line.confidence * 100).toFixed(1)}%) compared to page average`,
              });
              hasStructuralAnomalies = true;
            }
          });
        }

        // Detect potential cloning through similar content
        if (page.lines && page.lines.length > 1) {
          const clones = this.detectClonedRegions(page.lines, page.pageNumber);
          if (clones.length > 0) {
            cloneDetections.push(...clones);
            hasStructuralAnomalies = true;
          }
        }
      }
    }

    return {
      hasStructuralAnomalies,
      compressionArtifacts: compressionArtifacts.slice(0, 20), // Limit results
      cloneDetections: cloneDetections.slice(0, 10),
    };
  }

  /**
   * Detect cloned regions in document
   */
  private detectClonedRegions(lines: any[], pageNumber: number): CloneDetection[] {
    const clones: CloneDetection[] = [];
    const contentMap = new Map<string, any[]>();

    // Group lines by similar content
    for (const line of lines) {
      if (line.content && line.content.trim().length > 20) {
        const normalized = line.content.trim().toLowerCase();
        if (!contentMap.has(normalized)) {
          contentMap.set(normalized, []);
        }
        contentMap.get(normalized)!.push(line);
      }
    }

    // Find duplicates
    for (const [content, matchingLines] of contentMap.entries()) {
      if (matchingLines.length > 1) {
        // Potential clone detected
        for (let i = 1; i < matchingLines.length; i++) {
          clones.push({
            sourceRegion: this.extractBoundingBox(matchingLines[0], pageNumber),
            clonedRegion: this.extractBoundingBox(matchingLines[i], pageNumber),
            similarity: 1.0, // Exact match
            confidence: 0.85,
          });
        }
      }
    }

    return clones;
  }

  /**
   * Extract bounding box from line data
   */
  private extractBoundingBox(line: any, pageNumber: number): BoundingBox {
    if (line.boundingBox && line.boundingBox.length >= 4) {
      return {
        x: line.boundingBox[0],
        y: line.boundingBox[1],
        width: line.boundingBox[2] - line.boundingBox[0],
        height: line.boundingBox[5] - line.boundingBox[1],
        page: pageNumber,
      };
    }

    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      page: pageNumber,
    };
  }

  /**
   * Detect manipulation indicators from forensic data
   */
  private detectManipulationIndicators(forensicData: ForensicData): ManipulationIndicator[] {
    const indicators: ManipulationIndicator[] = [];

    // Metadata inconsistencies
    if (forensicData.metadata.hasInconsistencies) {
      indicators.push({
        type: 'METADATA_INCONSISTENCY',
        description: 'Document metadata contains suspicious inconsistencies',
        severity: 'HIGH',
        evidence: forensicData.metadata.inconsistencyDetails,
      });
    }

    // Quality inconsistencies
    if (forensicData.qualityMetrics.hasQualityInconsistencies) {
      indicators.push({
        type: 'QUALITY_INCONSISTENCY',
        description: 'Document has regions with significantly different quality levels',
        severity: 'MEDIUM',
        evidence: [
          `${forensicData.qualityMetrics.regions.length} low-quality regions detected`,
          `Overall quality: ${forensicData.qualityMetrics.overallQuality.toFixed(1)}%`,
        ],
      });
    }

    // Font anomalies
    if (forensicData.textAnalysis.hasFontInconsistencies) {
      indicators.push({
        type: 'FONT_ANOMALY',
        description: 'Inconsistent font usage detected across document',
        severity: 'MEDIUM',
        evidence: forensicData.textAnalysis.suspiciousTextPatterns.slice(0, 5),
      });
    }

    // Compression artifacts
    if (forensicData.structuralAnalysis.compressionArtifacts.length > 0) {
      const criticalArtifacts = forensicData.structuralAnalysis.compressionArtifacts.filter(
        a => a.severity === 'HIGH'
      );

      indicators.push({
        type: 'COMPRESSION_ARTIFACTS',
        description: 'Compression artifacts detected indicating possible manipulation',
        severity: criticalArtifacts.length > 0 ? 'HIGH' : 'MEDIUM',
        evidence: forensicData.structuralAnalysis.compressionArtifacts
          .slice(0, 5)
          .map(a => a.description),
      });
    }

    // Clone detection
    if (forensicData.structuralAnalysis.cloneDetections.length > 0) {
      indicators.push({
        type: 'CLONE_DETECTION',
        description: 'Duplicated content regions detected',
        severity: forensicData.structuralAnalysis.cloneDetections.length > 3 ? 'HIGH' : 'MEDIUM',
        evidence: [
          `${forensicData.structuralAnalysis.cloneDetections.length} cloned regions found`,
          ...forensicData.structuralAnalysis.cloneDetections
            .slice(0, 3)
            .map(c => `Similarity: ${(c.similarity * 100).toFixed(1)}%`),
        ],
      });
    }

    return indicators;
  }

  /**
   * Calculate manipulation confidence score
   */
  private calculateManipulationConfidence(
    forensicData: ForensicData,
    indicators: ManipulationIndicator[]
  ): number {
    let score = 0;

    // Metadata score
    if (forensicData.metadata.hasInconsistencies) {
      score += this.METADATA_WEIGHT * (forensicData.metadata.inconsistencyDetails.length * 0.3);
    }

    // Quality score
    if (forensicData.qualityMetrics.hasQualityInconsistencies) {
      const qualityScore = forensicData.qualityMetrics.regions.length * 0.1;
      score += this.QUALITY_WEIGHT * Math.min(1, qualityScore);
    }

    // Text score
    if (forensicData.textAnalysis.hasFontInconsistencies) {
      score += this.TEXT_WEIGHT * 0.7;
    }

    // Structural score
    if (forensicData.structuralAnalysis.hasStructuralAnomalies) {
      const artifactScore = Math.min(1, forensicData.structuralAnalysis.compressionArtifacts.length * 0.15);
      const cloneScore = Math.min(1, forensicData.structuralAnalysis.cloneDetections.length * 0.2);
      score += this.STRUCTURAL_WEIGHT * Math.max(artifactScore, cloneScore);
    }

    // Boost score based on indicator severity
    const criticalCount = indicators.filter(i => i.severity === 'CRITICAL').length;
    const highCount = indicators.filter(i => i.severity === 'HIGH').length;

    score += criticalCount * 0.15;
    score += highCount * 0.08;

    return Math.min(1, score);
  }
}

export default ImageManipulationDetector.getInstance();
