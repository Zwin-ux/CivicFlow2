# Demo Mode Credentials

## Quick Reference

Use these credentials to access different user roles in the demo environment.

### Demo User Accounts

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Applicant** | `demo-applicant@demo.local` | `Demo123!` | Submit applications, upload documents, track status |
| **Staff** | `demo-staff@demo.local` | `Demo123!` | Review applications, view AI analysis, make decisions |
| **Admin** | `demo-admin@demo.local` | `Demo123!` | Full system access, metrics, anomaly management |

### Password Details
- **Password:** `Demo123!` (same for all accounts)
- **Requirements Met:** 
  - Minimum 8 characters ✓
  - Uppercase letter ✓
  - Lowercase letter ✓
  - Number ✓
  - Special character ✓

## Portal Access

### Applicant Portal
**URL:** `/applicant-portal.html`

**Features:**
- Submit new loan applications
- Upload documents with AI quality feedback
- Track application status
- View eligibility scores

**Login:** Use `demo-applicant@demo.local` / `Demo123!`

### Staff Portal
**URL:** `/staff-portal.html`

**Features:**
- Review application queue
- View AI analysis results
- Manage anomaly alerts
- Make approval/rejection decisions
- View document quality scores

**Login:** Use `demo-staff@demo.local` / `Demo123!`

### Admin Dashboard
**URL:** `/admin-dashboard.html`

**Features:**
- View system metrics
- Monitor AI performance
- Manage anomaly detections
- Generate reports
- View audit logs
- Control demo mode settings

**Login:** Use `demo-admin@demo.local` / `Demo123!`

### Loan Operations Dashboard
**URL:** `/loan-ops-dashboard.html`

**Features:**
- Real-time application monitoring
- Quick actions on applications
- WebSocket live updates
- Bulk operations
- Teams integration (mocked in demo)

**Login:** Use `demo-staff@demo.local` / `Demo123!`

## Demo Data Overview

### Applications
- **Total:** 25 sample applications
- **Statuses:** 
  - Draft: ~2
  - Submitted: ~5
  - Under Review: ~8
  - Pending Documents: ~3
  - Approved: ~4
  - Rejected: ~2
  - Deferred: ~1

### Documents
- **Total:** 75-125 documents
- **Per Application:** 3-5 documents
- **Types:** W9, EIN Verification, Bank Statement, Tax Return, Business License
- **AI Analysis:** All documents have quality scores and recommendations

### Anomalies
- **Detected:** ~7-8 anomalies (30% of applications)
- **Types:** Image manipulation, inconsistent data, missing information, suspicious patterns
- **Severities:** Low, Medium, High, Critical

## Mock Services

The following services are simulated in demo mode:

### Email Notifications
- **Status:** Mocked
- **Behavior:** Logged to console instead of sending
- **Indicator:** Demo service badge shown in UI

### Teams Integration
- **Status:** Mocked
- **Behavior:** Notifications logged, no actual Teams messages sent
- **Indicator:** Demo service badge shown in UI

### EIN Verification
- **Status:** Mocked
- **Behavior:** Returns simulated verification responses
- **Indicator:** Demo tooltip on verification fields

## Real AI Services

These services use actual AI models:

### Document Analysis
- **Provider:** OpenAI GPT-4 or Claude
- **Features:** Quality assessment, data extraction, recommendations
- **Status:** Real AI processing

### Anomaly Detection
- **Technology:** Pattern recognition algorithms
- **Features:** Fraud detection, inconsistency identification
- **Status:** Real AI processing

### Decision Support
- **Technology:** AI recommendation engine
- **Features:** Approval recommendations, risk scoring
- **Status:** Real AI processing

## Important Notes

⚠️ **Demo Mode Warnings:**
- All data is sample data and will be reset periodically
- Do not enter any real personal or business information
- Demo sessions expire after 30 minutes of inactivity
- Changes made in demo mode do not affect production data

✅ **Best Practices:**
- Use demo accounts only for demonstration purposes
- Share these credentials only with authorized stakeholders
- Reset demo data before important demonstrations
- Monitor demo session activity in admin dashboard

## Troubleshooting

### Cannot Log In
- Verify you're using the correct email format (`@demo.local`)
- Ensure password is exactly `Demo123!` (case-sensitive)
- Check that demo data has been seeded: `npm run seed demo`

### Demo Banner Not Showing
- Add `?demo=true` to URL
- Set `DEMO_MODE_ENABLED=true` in environment variables
- Clear browser cache and reload

### No Demo Data Visible
- Run seed script: `npm run seed demo`
- Check database connection
- Verify migrations have been run

### AI Features Not Working
- Ensure AI API keys are configured in environment variables
- Check `OPENAI_API_KEY` or `CLAUDE_API_KEY` is set
- Review application logs for AI service errors

## Support

For issues or questions about demo mode:
1. Check the demo banner "Learn More" modal for detailed information
2. Review `.kiro/specs/mvp-deployment/TASK_3_SUMMARY.md` for implementation details
3. Contact the development team for technical support

---

**Last Updated:** Task 3 Completion
**Version:** MVP Deployment v1.0
