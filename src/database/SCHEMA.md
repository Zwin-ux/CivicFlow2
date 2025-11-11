# Database Schema Reference

## Tables Overview

### applicants
Stores micro-business applicant information with encrypted PII.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique applicant identifier |
| business_name | VARCHAR(255) | NOT NULL | Legal business name |
| ein | VARCHAR(20) | NOT NULL, UNIQUE | Employer Identification Number |
| email | VARCHAR(255) | NOT NULL | Contact email |
| phone | VARCHAR(50) | NOT NULL | Contact phone number |
| address_line1 | VARCHAR(255) | NOT NULL | Street address |
| address_line2 | VARCHAR(255) | | Additional address info |
| city | VARCHAR(100) | NOT NULL | City |
| state | VARCHAR(50) | NOT NULL | State/Province |
| zip_code | VARCHAR(20) | NOT NULL | Postal code |
| country | VARCHAR(100) | DEFAULT 'USA' | Country |
| owner_first_name | VARCHAR(100) | NOT NULL | Business owner first name |
| owner_last_name | VARCHAR(100) | NOT NULL | Business owner last name |
| owner_ssn | TEXT | NOT NULL | Encrypted SSN (AES-256) |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_applicants_ein` - Fast EIN lookups
- `idx_applicants_email` - Email searches
- `idx_applicants_business_name` - Business name searches
- `idx_applicants_created_at` - Date range queries
- `idx_applicants_ein_unique` - Enforce unique EIN

---

### applications
Stores grant/loan applications with status tracking and eligibility scoring.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique application identifier |
| applicant_id | UUID | NOT NULL, FK | Reference to applicants table |
| program_type | VARCHAR(100) | NOT NULL | Program identifier |
| requested_amount | DECIMAL(12,2) | NOT NULL, > 0 | Requested funding amount |
| status | application_status | NOT NULL | Current application status |
| eligibility_score | DECIMAL(5,2) | 0-100 | Calculated eligibility score |
| missing_documents | JSONB | DEFAULT '[]' | Array of missing document types |
| fraud_flags | JSONB | DEFAULT '[]' | Array of fraud detection flags |
| assigned_to | UUID | | Staff member ID (future FK) |
| submitted_at | TIMESTAMP | | Submission timestamp |
| reviewed_at | TIMESTAMP | | Review timestamp |
| decided_at | TIMESTAMP | | Decision timestamp |
| decision | JSONB | | Decision details and justification |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Status Enum Values:**
- DRAFT
- SUBMITTED
- UNDER_REVIEW
- PENDING_DOCUMENTS
- APPROVED
- REJECTED
- DEFERRED

**Indexes:**
- `idx_applications_applicant_id` - Applicant lookups
- `idx_applications_status` - Status filtering
- `idx_applications_program_type` - Program filtering
- `idx_applications_submitted_at` - Date sorting
- `idx_applications_assigned_to` - Staff assignment queries
- `idx_applications_status_submitted` - Combined status/date queries
- `idx_applications_program_status` - Program/status filtering
- `idx_applications_missing_documents` - GIN index for JSONB
- `idx_applications_fraud_flags` - GIN index for JSONB

---

### documents
Stores uploaded document metadata with ML classification results.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique document identifier |
| application_id | UUID | NOT NULL, FK | Reference to applications table |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| file_size | INTEGER | NOT NULL, > 0 | File size in bytes |
| mime_type | VARCHAR(100) | NOT NULL | MIME type |
| storage_url | TEXT | NOT NULL | Encrypted cloud storage URL |
| document_type | document_type | | Classified document type |
| classification_confidence | DECIMAL(5,2) | 0-100 | ML confidence score |
| extracted_data | JSONB | | Structured extracted data |
| requires_manual_review | BOOLEAN | DEFAULT FALSE | Manual review flag |
| uploaded_at | TIMESTAMP | DEFAULT NOW() | Upload timestamp |
| classified_at | TIMESTAMP | | Classification timestamp |
| reviewed_at | TIMESTAMP | | Manual review timestamp |
| reviewed_by | UUID | | Staff member ID |

**Document Type Enum Values:**
- W9
- EIN_VERIFICATION
- BANK_STATEMENT
- TAX_RETURN
- BUSINESS_LICENSE
- OTHER

**Indexes:**
- `idx_documents_application_id` - Application document lookups
- `idx_documents_document_type` - Type filtering
- `idx_documents_uploaded_at` - Date sorting
- `idx_documents_requires_review` - Partial index for pending reviews
- `idx_documents_app_type` - Combined application/type queries
- `idx_documents_extracted_data` - GIN index for JSONB

---

### audit_logs
Immutable audit trail of all system actions (7-year retention for compliance).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique log entry identifier |
| action_type | VARCHAR(100) | NOT NULL | Action type identifier |
| entity_type | entity_type | NOT NULL | Entity type affected |
| entity_id | UUID | NOT NULL | Entity identifier |
| performed_by | VARCHAR(100) | NOT NULL | User ID or 'SYSTEM' |
| confidence_score | DECIMAL(5,2) | 0-100 | Confidence for automated actions |
| details | JSONB | | Action-specific details |
| ip_address | INET | | Client IP address |
| user_agent | TEXT | | Client user agent |
| timestamp | TIMESTAMP | NOT NULL | Action timestamp |

**Entity Type Enum Values:**
- APPLICATION
- DOCUMENT
- APPLICANT
- USER
- SYSTEM
- PROGRAM_RULE
- COMMUNICATION

**Indexes:**
- `idx_audit_logs_timestamp` - Time-based queries (DESC)
- `idx_audit_logs_entity` - Entity lookups
- `idx_audit_logs_action_type` - Action filtering
- `idx_audit_logs_performed_by` - User activity queries
- `idx_audit_logs_entity_timestamp` - Combined entity/time queries
- `idx_audit_logs_user_timestamp` - User activity timeline
- `idx_audit_logs_details` - GIN index for JSONB
- `idx_audit_logs_system_actions` - Partial index for system actions

**Immutability:**
- Triggers prevent UPDATE and DELETE operations
- Ensures audit trail integrity

---

### program_rules
Configurable eligibility rules for grant/loan programs with versioning.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique rule identifier |
| program_type | VARCHAR(100) | NOT NULL | Program type identifier |
| program_name | VARCHAR(255) | NOT NULL | Human-readable program name |
| version | INTEGER | NOT NULL, > 0 | Rule version number |
| rules | JSONB | NOT NULL | Eligibility rules configuration |
| active_from | TIMESTAMP | NOT NULL | Effective start date |
| active_to | TIMESTAMP | | Expiration date (NULL = active) |
| created_by | VARCHAR(100) | NOT NULL | Creator user ID |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_program_rules_program_type` - Program lookups
- `idx_program_rules_active_from` - Date filtering
- `idx_program_rules_active_to` - Expiration queries
- `idx_program_rules_version` - Version sorting
- `idx_program_rules_active` - Active rules queries
- `idx_program_rules_rules` - GIN index for JSONB
- `idx_program_rules_unique_active` - Unique program/version

**Rules JSON Structure:**
```json
{
  "minCreditScore": 600,
  "maxLoanAmount": 50000,
  "requiredDocuments": ["W9", "EIN_VERIFICATION", "BANK_STATEMENT"],
  "eligibilityCriteria": [
    {
      "field": "businessAge",
      "operator": ">=",
      "value": 1,
      "weight": 20,
      "description": "Business must be at least 1 year old"
    }
  ],
  "passingScore": 70
}
```

---

## Relationships

```
applicants (1) ──< (N) applications
applications (1) ──< (N) documents
applications (1) ──< (N) audit_logs
documents (1) ──< (N) audit_logs
applicants (1) ──< (N) audit_logs
```

## Data Retention

- **Applications & Applicants**: Indefinite (business requirement)
- **Documents**: Indefinite (compliance requirement)
- **Audit Logs**: 7 years minimum (regulatory requirement)
- **Program Rules**: Indefinite with versioning

## Security Considerations

1. **Encrypted Fields**:
   - `applicants.owner_ssn` - AES-256 encryption
   - `documents.storage_url` - Encrypted cloud URLs

2. **Access Control**:
   - Row-level security (to be implemented)
   - Role-based permissions
   - Audit logging for all access

3. **Data Integrity**:
   - Foreign key constraints
   - Check constraints for valid ranges
   - Immutable audit logs

## Performance Optimization

1. **Indexes**: Comprehensive indexing on frequently queried fields
2. **JSONB**: GIN indexes for efficient JSON queries
3. **Partial Indexes**: For specific query patterns (e.g., pending reviews)
4. **Composite Indexes**: For common multi-column queries
5. **Connection Pooling**: Configured in application layer
