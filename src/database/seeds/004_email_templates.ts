/**
 * Email Templates Seed Data
 * Populates email_templates table with default templates
 */

import { Pool } from 'pg';

export async function seed(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('Seeding email templates...');

    // Application Submitted Template
    await client.query(`
      INSERT INTO email_templates (template_type, name, subject, body_html, body_text, variables)
      VALUES (
        'APPLICATION_SUBMITTED',
        'Application Submitted Confirmation',
        'Your {{programType}} Application Has Been Received',
        '<html><body><h2>Application Received</h2><p>Dear {{applicantName}},</p><p>Thank you for submitting your application for the <strong>{{programType}}</strong> program. Your application ID is <strong>{{applicationId}}</strong>.</p><p>We have received your request for <strong>${{requestedAmount}}</strong> and will begin reviewing your application shortly.</p><p><strong>Next Steps:</strong></p><ul><li>Our team will review your application and supporting documents</li><li>You will receive updates via email as your application progresses</li><li>If additional documents are needed, we will notify you promptly</li></ul><p>You can check your application status at any time by logging into your account.</p><p>Best regards,<br>The Lending Team</p></body></html>',
        'Application Received\n\nDear {{applicantName}},\n\nThank you for submitting your application for the {{programType}} program. Your application ID is {{applicationId}}.\n\nWe have received your request for ${{requestedAmount}} and will begin reviewing your application shortly.\n\nNext Steps:\n- Our team will review your application and supporting documents\n- You will receive updates via email as your application progresses\n- If additional documents are needed, we will notify you promptly\n\nYou can check your application status at any time by logging into your account.\n\nBest regards,\nThe Lending Team',
        '["applicantName", "programType", "applicationId", "requestedAmount"]'::jsonb
      )
      ON CONFLICT (template_type) DO UPDATE SET
        name = EXCLUDED.name,
        subject = EXCLUDED.subject,
        body_html = EXCLUDED.body_html,
        body_text = EXCLUDED.body_text,
        variables = EXCLUDED.variables,
        updated_at = NOW();
    `);

    // Application Under Review Template
    await client.query(`
      INSERT INTO email_templates (template_type, name, subject, body_html, body_text, variables)
      VALUES (
        'APPLICATION_UNDER_REVIEW',
        'Application Under Review',
        'Your {{programType}} Application is Under Review',
        '<html><body><h2>Application Under Review</h2><p>Dear {{applicantName}},</p><p>Your application (ID: <strong>{{applicationId}}</strong>) for the {{programType}} program is now under review by our team.</p><p>We are carefully evaluating your application and supporting documents. This process typically takes 3-5 business days.</p><p>We will notify you as soon as a decision has been made.</p><p>Best regards,<br>The Lending Team</p></body></html>',
        'Application Under Review\n\nDear {{applicantName}},\n\nYour application (ID: {{applicationId}}) for the {{programType}} program is now under review by our team.\n\nWe are carefully evaluating your application and supporting documents. This process typically takes 3-5 business days.\n\nWe will notify you as soon as a decision has been made.\n\nBest regards,\nThe Lending Team',
        '["applicantName", "programType", "applicationId"]'::jsonb
      )
      ON CONFLICT (template_type) DO UPDATE SET
        name = EXCLUDED.name,
        subject = EXCLUDED.subject,
        body_html = EXCLUDED.body_html,
        body_text = EXCLUDED.body_text,
        variables = EXCLUDED.variables,
        updated_at = NOW();
    `);

    // Missing Documents Template
    await client.query(`
      INSERT INTO email_templates (template_type, name, subject, body_html, body_text, variables)
      VALUES (
        'MISSING_DOCUMENTS',
        'Missing Documents Required',
        'Action Required: Missing Documents for Application {{applicationId}}',
        '<html><body><h2>Missing Documents</h2><p>Dear {{applicantName}},</p><p>We are reviewing your application (ID: <strong>{{applicationId}}</strong>) for the {{programType}} program, but we need additional documents to continue processing.</p><p><strong>Required Documents:</strong></p><ul>{{#each missingDocuments}}<li>{{this}}</li>{{/each}}</ul><p>Please upload these documents as soon as possible to avoid delays in processing your application.</p><p>You can upload documents by logging into your account and navigating to your application.</p><p>Best regards,<br>The Lending Team</p></body></html>',
        'Missing Documents\n\nDear {{applicantName}},\n\nWe are reviewing your application (ID: {{applicationId}}) for the {{programType}} program, but we need additional documents to continue processing.\n\nRequired Documents:\n{{#each missingDocuments}}- {{this}}\n{{/each}}\nPlease upload these documents as soon as possible to avoid delays in processing your application.\n\nYou can upload documents by logging into your account and navigating to your application.\n\nBest regards,\nThe Lending Team',
        '["applicantName", "programType", "applicationId", "missingDocuments"]'::jsonb
      )
      ON CONFLICT (template_type) DO UPDATE SET
        name = EXCLUDED.name,
        subject = EXCLUDED.subject,
        body_html = EXCLUDED.body_html,
        body_text = EXCLUDED.body_text,
        variables = EXCLUDED.variables,
        updated_at = NOW();
    `);

    // Application Approved Template
    await client.query(`
      INSERT INTO email_templates (template_type, name, subject, body_html, body_text, variables)
      VALUES (
        'APPLICATION_APPROVED',
        'Application Approved',
        'Congratulations! Your {{programType}} Application Has Been Approved',
        '<html><body><h2>Application Approved</h2><p>Dear {{applicantName}},</p><p>We are pleased to inform you that your application (ID: <strong>{{applicationId}}</strong>) for the {{programType}} program has been <strong>approved</strong>!</p><p><strong>Approved Amount:</strong> ${{approvedAmount}}</p><p><strong>Next Steps:</strong></p><ul><li>You will receive detailed funding instructions within 2 business days</li><li>Please review and sign the funding agreement</li><li>Funds will be disbursed according to the program terms</li></ul><p>Congratulations on your approval!</p><p>Best regards,<br>The Lending Team</p></body></html>',
        'Application Approved\n\nDear {{applicantName}},\n\nWe are pleased to inform you that your application (ID: {{applicationId}}) for the {{programType}} program has been approved!\n\nApproved Amount: ${{approvedAmount}}\n\nNext Steps:\n- You will receive detailed funding instructions within 2 business days\n- Please review and sign the funding agreement\n- Funds will be disbursed according to the program terms\n\nCongratulations on your approval!\n\nBest regards,\nThe Lending Team',
        '["applicantName", "programType", "applicationId", "approvedAmount"]'::jsonb
      )
      ON CONFLICT (template_type) DO UPDATE SET
        name = EXCLUDED.name,
        subject = EXCLUDED.subject,
        body_html = EXCLUDED.body_html,
        body_text = EXCLUDED.body_text,
        variables = EXCLUDED.variables,
        updated_at = NOW();
    `);

    // Application Rejected Template
    await client.query(`
      INSERT INTO email_templates (template_type, name, subject, body_html, body_text, variables)
      VALUES (
        'APPLICATION_REJECTED',
        'Application Decision',
        'Update on Your {{programType}} Application',
        '<html><body><h2>Application Decision</h2><p>Dear {{applicantName}},</p><p>Thank you for your interest in the {{programType}} program. After careful review, we regret to inform you that your application (ID: <strong>{{applicationId}}</strong>) has not been approved at this time.</p><p><strong>Reason:</strong> {{decisionReason}}</p><p>You may reapply for this program in the future if your circumstances change. We encourage you to explore other programs that may be a better fit for your business needs.</p><p>If you have questions about this decision, please contact our support team.</p><p>Best regards,<br>The Lending Team</p></body></html>',
        'Application Decision\n\nDear {{applicantName}},\n\nThank you for your interest in the {{programType}} program. After careful review, we regret to inform you that your application (ID: {{applicationId}}) has not been approved at this time.\n\nReason: {{decisionReason}}\n\nYou may reapply for this program in the future if your circumstances change. We encourage you to explore other programs that may be a better fit for your business needs.\n\nIf you have questions about this decision, please contact our support team.\n\nBest regards,\nThe Lending Team',
        '["applicantName", "programType", "applicationId", "decisionReason"]'::jsonb
      )
      ON CONFLICT (template_type) DO UPDATE SET
        name = EXCLUDED.name,
        subject = EXCLUDED.subject,
        body_html = EXCLUDED.body_html,
        body_text = EXCLUDED.body_text,
        variables = EXCLUDED.variables,
        updated_at = NOW();
    `);

    // Application Deferred Template
    await client.query(`
      INSERT INTO email_templates (template_type, name, subject, body_html, body_text, variables)
      VALUES (
        'APPLICATION_DEFERRED',
        'Application Deferred',
        'Your {{programType}} Application Requires Additional Review',
        '<html><body><h2>Application Deferred</h2><p>Dear {{applicantName}},</p><p>Your application (ID: <strong>{{applicationId}}</strong>) for the {{programType}} program requires additional review before a final decision can be made.</p><p><strong>Reason:</strong> {{decisionReason}}</p><p>Our team will conduct further evaluation and may contact you for additional information. We will notify you of the final decision as soon as possible.</p><p>Thank you for your patience.</p><p>Best regards,<br>The Lending Team</p></body></html>',
        'Application Deferred\n\nDear {{applicantName}},\n\nYour application (ID: {{applicationId}}) for the {{programType}} program requires additional review before a final decision can be made.\n\nReason: {{decisionReason}}\n\nOur team will conduct further evaluation and may contact you for additional information. We will notify you of the final decision as soon as possible.\n\nThank you for your patience.\n\nBest regards,\nThe Lending Team',
        '["applicantName", "programType", "applicationId", "decisionReason"]'::jsonb
      )
      ON CONFLICT (template_type) DO UPDATE SET
        name = EXCLUDED.name,
        subject = EXCLUDED.subject,
        body_html = EXCLUDED.body_html,
        body_text = EXCLUDED.body_text,
        variables = EXCLUDED.variables,
        updated_at = NOW();
    `);

    // Staff Summary Template
    await client.query(`
      INSERT INTO email_templates (template_type, name, subject, body_html, body_text, variables)
      VALUES (
        'STAFF_SUMMARY',
        'Staff Application Summary',
        'Application Review Required: {{businessName}} - {{applicationId}}',
        '<html><body><h2>Application Review Summary</h2><p><strong>Application ID:</strong> {{applicationId}}</p><p><strong>Applicant:</strong> {{applicantName}}<br><strong>Business:</strong> {{businessName}}<br><strong>Program:</strong> {{programType}}<br><strong>Requested Amount:</strong> ${{requestedAmount}}</p><p><strong>Eligibility Score:</strong> {{eligibilityScore}}/100</p><p><strong>Missing Documents:</strong></p><ul>{{#each missingDocuments}}<li>{{this}}</li>{{/each}}</ul><p><strong>Fraud Flags:</strong></p><ul>{{#each fraudFlags}}<li>[{{severity}}] {{type}}: {{description}}</li>{{/each}}</ul><p><strong>Recommended Action:</strong> {{recommendedAction}}</p><p><strong>Reasoning:</strong></p><ul>{{#each reasoning}}<li>{{this}}</li>{{/each}}</ul><p>Please review this application in the system.</p></body></html>',
        'Application Review Summary\n\nApplication ID: {{applicationId}}\n\nApplicant: {{applicantName}}\nBusiness: {{businessName}}\nProgram: {{programType}}\nRequested Amount: ${{requestedAmount}}\n\nEligibility Score: {{eligibilityScore}}/100\n\nMissing Documents:\n{{#each missingDocuments}}- {{this}}\n{{/each}}\nFraud Flags:\n{{#each fraudFlags}}- [{{severity}}] {{type}}: {{description}}\n{{/each}}\nRecommended Action: {{recommendedAction}}\n\nReasoning:\n{{#each reasoning}}- {{this}}\n{{/each}}\nPlease review this application in the system.',
        '["applicationId", "applicantName", "businessName", "programType", "requestedAmount", "eligibilityScore", "missingDocuments", "fraudFlags", "recommendedAction", "reasoning"]'::jsonb
      )
      ON CONFLICT (template_type) DO UPDATE SET
        name = EXCLUDED.name,
        subject = EXCLUDED.subject,
        body_html = EXCLUDED.body_html,
        body_text = EXCLUDED.body_text,
        variables = EXCLUDED.variables,
        updated_at = NOW();
    `);

    console.log('Email templates seeded successfully');
  } catch (error) {
    console.error('Error seeding email templates:', error);
    throw error;
  } finally {
    client.release();
  }
}
