# Database Migrations and Seeds

This directory contains database migration scripts and seed data for the Government Lending CRM Platform.

## Structure

```
database/
├── migrations/          # SQL migration files
│   ├── 001_create_applicants_table.sql
│   ├── 002_create_applications_table.sql
│   ├── 003_create_documents_table.sql
│   ├── 004_create_audit_logs_table.sql
│   └── 005_create_program_rules_table.sql
├── seeds/              # Seed data scripts
│   ├── 001_program_rules.ts
│   └── 002_test_data.ts
├── migrationRunner.ts  # Migration execution utility
└── seedRunner.ts       # Seed execution utility
```

## Running Migrations

### Run all pending migrations
```bash
npm run migrate up
```

### Check migration status
```bash
npm run migrate status
```

### Rollback last migration (use with caution)
```bash
npm run migrate rollback
```

## Running Seeds

### Seed all data (includes test data in development)
```bash
npm run seed all
```

### Seed program rules only
```bash
npm run seed rules
```

### Seed test data only (development only)
```bash
npm run seed test
```

## Migration Files

Migration files are numbered sequentially and must follow the naming convention:
```
{number}_{description}.sql
```

Example: `001_create_applicants_table.sql`

### Execution Order

1. **001_create_applicants_table.sql** - Creates the applicants table with encrypted PII fields
2. **002_create_applications_table.sql** - Creates applications table with status tracking
3. **003_create_documents_table.sql** - Creates documents table with classification metadata
4. **004_create_audit_logs_table.sql** - Creates immutable audit log table with triggers
5. **005_create_program_rules_table.sql** - Creates program rules table with versioning

## Database Schema

### Tables

- **applicants** - Stores micro-business applicant information
- **applications** - Stores grant/loan applications with eligibility scoring
- **documents** - Stores uploaded document metadata and classification results
- **audit_logs** - Immutable audit trail of all system actions (7-year retention)
- **program_rules** - Configurable eligibility rules for different programs
- **schema_migrations** - Tracks executed migrations

### Key Features

- **Indexes**: Optimized indexes on frequently queried fields
- **JSONB Support**: Flexible storage for extracted data, fraud flags, and program rules
- **Audit Trail**: Immutable logs with triggers preventing modification
- **Encryption**: Sensitive fields (SSN, storage URLs) are encrypted
- **Constraints**: Data validation at database level

## Seed Data

### Program Rules

Three default program types are seeded:
1. **MICRO_BUSINESS_GRANT** - Small Business Recovery Grant
2. **EMERGENCY_LOAN** - Emergency Business Loan Program
3. **STARTUP_GRANT** - New Business Startup Grant

Each program rule includes:
- Eligibility criteria with scoring weights
- Required document types
- Funding ranges and limits
- Passing score thresholds

### Test Data

Test data includes:
- 3 sample applicants with different business types
- 3 sample applications in various statuses
- Audit log entries for tracking

**Note**: Test data is only seeded in development environment.

## Environment Variables

Ensure these variables are set in your `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lending_crm
DB_USER=postgres
DB_PASSWORD=your_password
DB_POOL_MIN=2
DB_POOL_MAX=10
```

## Best Practices

1. **Always backup** before running migrations in production
2. **Test migrations** in development/staging first
3. **Review migration SQL** before execution
4. **Never modify** executed migration files
5. **Create new migrations** for schema changes
6. **Use transactions** for complex migrations
7. **Document changes** in migration comments

## Troubleshooting

### Migration fails with "relation already exists"
- Check migration status: `npm run migrate status`
- The migration may have partially executed
- Manually verify database state and fix if needed

### Cannot connect to database
- Verify database is running
- Check environment variables
- Ensure database user has proper permissions

### Seed data already exists
- Seeds are idempotent and will skip existing data
- To re-seed, manually truncate tables first (development only)

## Production Deployment

For production deployments:

1. Run migrations first: `npm run migrate up`
2. Seed program rules: `npm run seed rules`
3. **Do not** seed test data in production
4. Verify all migrations completed successfully
5. Check application logs for any errors
