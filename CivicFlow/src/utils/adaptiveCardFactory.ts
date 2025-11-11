/**
 * Adaptive Card Factory
 * Creates Microsoft Teams Adaptive Cards for various application events
 */

import config from '../config';
import { Application } from '../models/application';
import { AdaptiveCard, CardType } from '../models/teams';

/**
 * Format date to readable string
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format duration from milliseconds
 */
function formatDuration(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

/**
 * Get application URL
 */
function getApplicationUrl(applicationId: string): string {
  const baseUrl = process.env.APP_URL || `http://localhost:${config.port}`;
  return `${baseUrl}/applications/${applicationId}`;
}

/**
 * Create New Submission Adaptive Card
 * Posted when a new application is submitted
 */
export function createSubmissionCard(application: Application): AdaptiveCard {
  const facts = [
    { title: 'Application ID', value: application.id },
    { title: 'Program Type', value: application.programType },
    { title: 'Requested Amount', value: formatCurrency(application.requestedAmount) },
    { title: 'Status', value: application.status },
  ];

  if (application.submittedAt) {
    facts.push({ title: 'Submitted', value: formatDate(application.submittedAt) });
  }

  if (application.eligibilityScore !== undefined) {
    facts.push({ title: 'Eligibility Score', value: `${application.eligibilityScore}%` });
  }

  // Add risk score if available
  const riskScore = (application as any).riskScore;
  if (riskScore !== undefined) {
    facts.push({ title: 'Risk Score', value: `${riskScore}/100` });
  }

  // Add fraud flags if present
  if (application.fraudFlags && application.fraudFlags.length > 0) {
    facts.push({
      title: 'Fraud Flags',
      value: `⚠️ ${application.fraudFlags.length} flag(s) detected`,
    });
  }

  const card: AdaptiveCard = {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: '🆕 New Application Submitted',
        size: 'Large',
        weight: 'Bolder',
      },
      {
        type: 'TextBlock',
        text: `A new ${application.programType} application has been submitted and is ready for review.`,
        wrap: true,
      },
      {
        type: 'FactSet',
        facts,
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View Application',
        url: getApplicationUrl(application.id),
      },
      {
        type: 'Action.Submit',
        title: 'Claim Application',
        data: {
          action: 'CLAIM',
          applicationId: application.id,
        },
      },
    ],
  };

  return card;
}

/**
 * Create SLA Warning Adaptive Card
 * Posted when an application is approaching SLA breach
 */
export function createSLAWarningCard(
  application: Application,
  slaDeadline: Date,
  timeRemaining: number
): AdaptiveCard {
  const facts = [
    { title: 'Application ID', value: application.id },
    { title: 'Program Type', value: application.programType },
    { title: 'Current Status', value: application.status },
    { title: 'SLA Deadline', value: formatDate(slaDeadline) },
    { title: 'Time Remaining', value: formatDuration(timeRemaining) },
  ];

  if (application.assignedTo) {
    facts.push({ title: 'Assigned To', value: application.assignedTo });
  }

  if (application.submittedAt) {
    facts.push({ title: 'Submitted', value: formatDate(application.submittedAt) });
  }

  const card: AdaptiveCard = {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'Container',
        style: 'warning',
        items: [
          {
            type: 'TextBlock',
            text: '⚠️ SLA Warning',
            size: 'Large',
            weight: 'Bolder',
            color: 'Warning',
          },
          {
            type: 'TextBlock',
            text: `Application ${application.id} is approaching SLA breach. Immediate attention required.`,
            wrap: true,
            color: 'Warning',
          },
        ],
      },
      {
        type: 'FactSet',
        facts,
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Review Now',
        url: getApplicationUrl(application.id),
      },
    ],
  };

  return card;
}

/**
 * Create Decision Ready Adaptive Card
 * Posted when an application is ready for final decision
 */
export function createDecisionReadyCard(application: Application): AdaptiveCard {
  const facts = [
    { title: 'Application ID', value: application.id },
    { title: 'Program Type', value: application.programType },
    { title: 'Requested Amount', value: formatCurrency(application.requestedAmount) },
  ];

  if (application.eligibilityScore !== undefined) {
    facts.push({ title: 'Eligibility Score', value: `${application.eligibilityScore}%` });
  }

  // Add risk score if available
  const riskScore = (application as any).riskScore;
  if (riskScore !== undefined) {
    const riskLevel = riskScore > 70 ? '🔴 High' : riskScore > 40 ? '🟡 Medium' : '🟢 Low';
    facts.push({ title: 'Risk Assessment', value: `${riskLevel} (${riskScore}/100)` });
  }

  if (application.fraudFlags && application.fraudFlags.length > 0) {
    facts.push({
      title: 'Fraud Flags',
      value: `${application.fraudFlags.length} flag(s)`,
    });
  }

  if (application.missingDocuments && application.missingDocuments.length > 0) {
    facts.push({
      title: 'Missing Documents',
      value: application.missingDocuments.join(', '),
    });
  } else {
    facts.push({ title: 'Documents', value: '✅ All documents received' });
  }

  const card: AdaptiveCard = {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'Container',
        style: 'good',
        items: [
          {
            type: 'TextBlock',
            text: '✅ Ready for Decision',
            size: 'Large',
            weight: 'Bolder',
            color: 'Good',
          },
          {
            type: 'TextBlock',
            text: 'This application has been fully reviewed and is ready for a final decision.',
            wrap: true,
          },
        ],
      },
      {
        type: 'FactSet',
        facts,
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View Details',
        url: getApplicationUrl(application.id),
      },
      {
        type: 'Action.Submit',
        title: '✓ Approve',
        style: 'positive',
        data: {
          action: 'APPROVE',
          applicationId: application.id,
        },
      },
      {
        type: 'Action.Submit',
        title: '✗ Reject',
        style: 'destructive',
        data: {
          action: 'REJECT',
          applicationId: application.id,
        },
      },
      {
        type: 'Action.Submit',
        title: '📄 Request More Info',
        data: {
          action: 'REQUEST_INFO',
          applicationId: application.id,
        },
      },
    ],
  };

  return card;
}

/**
 * Create Status Update Adaptive Card
 * Posted when application status changes or decision is made
 */
export function createStatusUpdateCard(
  application: Application,
  previousStatus?: string,
  actionCompleted?: {
    action: string;
    completedBy: string;
    completedAt: Date;
  }
): AdaptiveCard {
  const facts = [
    { title: 'Application ID', value: application.id },
    { title: 'Program Type', value: application.programType },
  ];

  if (previousStatus) {
    facts.push({ title: 'Previous Status', value: previousStatus });
  }

  facts.push({ title: 'Current Status', value: application.status });

  if (application.decision) {
    facts.push({
      title: 'Decision',
      value: application.decision.decision,
    });
    facts.push({
      title: 'Decided By',
      value: application.decision.decidedBy,
    });
    if (application.decision.decidedAt) {
      facts.push({
        title: 'Decided At',
        value: formatDate(application.decision.decidedAt),
      });
    }
    if (application.decision.justification) {
      facts.push({
        title: 'Justification',
        value: application.decision.justification,
      });
    }
  }

  let statusEmoji = '📋';
  let statusColor: 'Default' | 'Good' | 'Warning' | 'Attention' = 'Default';

  if (application.status === 'APPROVED') {
    statusEmoji = '✅';
    statusColor = 'Good';
  } else if (application.status === 'REJECTED') {
    statusEmoji = '❌';
    statusColor = 'Attention';
  } else if (application.status === 'PENDING_DOCUMENTS') {
    statusEmoji = '📄';
    statusColor = 'Warning';
  }

  const bodyElements: any[] = [
    {
      type: 'TextBlock',
      text: `${statusEmoji} Application Status Updated`,
      size: 'Large',
      weight: 'Bolder',
      color: statusColor,
    },
  ];

  // Add action completion indicator if provided
  if (actionCompleted) {
    bodyElements.push({
      type: 'Container',
      style: 'good',
      items: [
        {
          type: 'TextBlock',
          text: `✓ Action completed by ${actionCompleted.completedBy}`,
          color: 'Good',
          weight: 'Bolder',
        },
        {
          type: 'TextBlock',
          text: `${actionCompleted.action} at ${formatDate(actionCompleted.completedAt)}`,
          size: 'Small',
          color: 'Good',
        },
      ],
    });
  }

  bodyElements.push({
    type: 'FactSet',
    facts,
  });

  const card: AdaptiveCard = {
    type: 'AdaptiveCard',
    version: '1.4',
    body: bodyElements,
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View Application',
        url: getApplicationUrl(application.id),
      },
    ],
  };

  return card;
}

/**
 * Create Adaptive Card based on card type
 * Factory method that routes to appropriate card creation function
 */
export function createAdaptiveCard(
  cardType: CardType,
  application: Application,
  additionalData?: any
): AdaptiveCard {
  switch (cardType) {
    case 'SUBMISSION':
      return createSubmissionCard(application);
    
    case 'SLA_WARNING':
      return createSLAWarningCard(
        application,
        additionalData?.slaDeadline || new Date(),
        additionalData?.timeRemaining || 0
      );
    
    case 'DECISION_READY':
      return createDecisionReadyCard(application);
    
    case 'STATUS_UPDATE':
      return createStatusUpdateCard(
        application,
        additionalData?.previousStatus,
        additionalData?.actionCompleted
      );
    
    default:
      throw new Error(`Unknown card type: ${cardType}`);
  }
}

/**
 * Wrap Adaptive Card in Teams message format
 * Prepares the card for posting to Teams via Graph API
 */
export function wrapCardInMessage(card: AdaptiveCard): any {
  return {
    body: {
      contentType: 'html',
      content: '<attachment id="1"></attachment>',
    },
    attachments: [
      {
        id: '1',
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: card,
      },
    ],
  };
}
