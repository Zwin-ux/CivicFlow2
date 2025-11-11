# Requirements Document

## Introduction

This document specifies requirements for the Loan Operations Dashboard and Microsoft Teams Integration feature. The system will provide loan officers with a comprehensive operations dashboard for managing application pipelines, work queues, and SLA tracking, while integrating with Microsoft Teams for real-time collaboration and decision-making through Adaptive Cards.

## Glossary

- **Loan_Operations_Dashboard**: Web-based interface for loan officers to manage and monitor loan applications
- **Pipeline_View**: Visual representation of applications grouped by workflow status
- **Work_Queue**: List of applications assigned to a specific loan officer or unassigned
- **SLA_Tracker**: System component that monitors and reports on Service Level Agreement compliance
- **Teams_Integration_Service**: Backend service that interfaces with Microsoft Graph API
- **Adaptive_Card**: Interactive message card in Microsoft Teams with actionable buttons
- **Auto_Assignment**: Automated distribution of applications to loan officers based on rules
- **Bottleneck_Analytics**: Analysis of workflow stages where applications accumulate
- **Microsoft_Graph_API**: Microsoft's unified API for accessing Microsoft 365 services
- **Webhook**: HTTP callback endpoint for receiving events from external systems

## Requirements

### Requirement 1: Pipeline View Dashboard

**User Story:** As a loan officer, I want to view all applications organized by their workflow status, so that I can understand the current state of the pipeline at a glance.

#### Acceptance Criteria

1. WHEN THE Loan_Operations_Dashboard loads, THE System SHALL display applications grouped by status (DRAFT, SUBMITTED, UNDER_REVIEW, PENDING_DOCUMENTS, APPROVED, REJECTED, DEFERRED)
2. WHILE displaying each application, THE System SHALL show SLA status with color-coded badges (green for on-track, yellow for at-risk, red for breached)
3. WHILE displaying each application, THE System SHALL show risk score and fraud flags when present
4. WHEN a loan officer clicks on an application, THE System SHALL navigate to the detailed application view
5. THE Loan_Operations_Dashboard SHALL refresh pipeline data every 30 seconds without full page reload

### Requirement 2: Work Queue Management

**User Story:** As a loan officer, I want to see applications assigned to me and claim unassigned applications, so that I can manage my workload effectively.

#### Acceptance Criteria

1. WHEN THE Loan_Operations_Dashboard displays the queue view, THE System SHALL show two tabs: "My Queue" and "Unassigned"
2. WHILE displaying "My Queue", THE System SHALL show only applications assigned to the current loan officer
3. WHILE displaying "Unassigned", THE System SHALL show applications not assigned to any loan officer
4. WHEN a loan officer clicks "Claim" on an unassigned application, THE System SHALL assign the application to that loan officer within 2 seconds
5. WHERE auto-assignment rules are configured, THE System SHALL automatically assign new applications based on workload balancing and specialization rules

### Requirement 3: SLA Monitoring and Analytics

**User Story:** As a loan operations manager, I want to monitor SLA compliance and identify bottlenecks, so that I can optimize the loan processing workflow.

#### Acceptance Criteria

1. WHEN THE Loan_Operations_Dashboard displays SLA view, THE System SHALL show all applications with SLA breaches
2. WHILE displaying SLA analytics, THE System SHALL calculate and display average processing time per workflow stage
3. WHILE displaying SLA analytics, THE System SHALL identify bottleneck stages where applications age beyond threshold
4. THE System SHALL calculate SLA status based on submission timestamp and target processing time from program rules
5. WHEN an application approaches SLA breach (within 80% of target time), THE System SHALL display yellow warning badge

### Requirement 4: Quick Actions from Dashboard

**User Story:** As a loan officer, I want to perform common actions directly from the dashboard, so that I can work efficiently without navigating to multiple pages.

#### Acceptance Criteria

1. WHEN a loan officer clicks "Request Documents" action, THE System SHALL open a modal to select missing documents and send notification to applicant
2. WHEN a loan officer clicks "Add Note" action, THE System SHALL open a modal to enter internal notes visible only to staff
3. WHEN a loan officer clicks "Start Teams Huddle" action, THE System SHALL create a Microsoft Teams meeting link and notify relevant team members
4. WHEN a loan officer clicks "Log Decision" action, THE System SHALL open the decision form with application context pre-filled
5. THE System SHALL complete all quick actions within 3 seconds and update the dashboard without full page reload

### Requirement 5: Microsoft Teams Channel Management

**User Story:** As a loan operations manager, I want Teams channels automatically created for large loan programs, so that my team can collaborate effectively on complex applications.

#### Acceptance Criteria

1. WHEN a new application is submitted for a program configured with Teams integration, THE Teams_Integration_Service SHALL check if a Teams channel exists for that program type
2. IF no Teams channel exists for the program type, THEN THE Teams_Integration_Service SHALL create a new Teams channel using Microsoft_Graph_API within 10 seconds
3. WHEN creating a Teams channel, THE Teams_Integration_Service SHALL name the channel using the format "[Program Type] - Loan Applications"
4. THE Teams_Integration_Service SHALL store the channel mapping in teams_channels table with programType, teamId, and channelId
5. WHERE a program is configured for group chat instead of channel, THE Teams_Integration_Service SHALL create a group chat with designated team members

### Requirement 6: Adaptive Card Notifications

**User Story:** As a loan officer, I want to receive interactive notifications in Teams when key events occur, so that I can take action without leaving Teams.

#### Acceptance Criteria

1. WHEN a new application is submitted, THE Teams_Integration_Service SHALL post an Adaptive_Card to the configured Teams channel within 5 seconds
2. WHEN an application approaches SLA breach (80% of target time), THE Teams_Integration_Service SHALL post an SLA warning Adaptive_Card
3. WHEN an application is ready for decision (all documents received and eligibility scored), THE Teams_Integration_Service SHALL post a decision-ready Adaptive_Card
4. WHILE displaying Adaptive_Cards, THE System SHALL include application summary, risk score, fraud flags, and eligibility score
5. THE Adaptive_Card SHALL include action buttons: "Approve", "Reject", and "Request More Info"

### Requirement 7: Teams Webhook Actions

**User Story:** As a loan officer, I want to approve or reject applications directly from Teams, so that I can make decisions quickly without switching applications.

#### Acceptance Criteria

1. WHEN a loan officer clicks "Approve" button on an Adaptive_Card, THE System SHALL invoke the webhook endpoint with action and application ID
2. WHEN the webhook receives an action, THE System SHALL authenticate the user using the Teams user ID and verify Approver role
3. WHEN the webhook processes an approval action, THE System SHALL call ApplicationService.makeDecision with APPROVED status
4. WHEN the webhook processes a rejection action, THE System SHALL call ApplicationService.makeDecision with REJECTED status
5. WHEN the webhook processes "Request More Info" action, THE System SHALL update application status to PENDING_DOCUMENTS and trigger communication to applicant
6. AFTER processing webhook action, THE System SHALL update the Adaptive_Card to show the decision and who made it
7. THE System SHALL process webhook actions within 3 seconds and log all actions to audit log

### Requirement 8: Teams Configuration Management

**User Story:** As a system administrator, I want to configure which programs use Teams integration and set notification rules, so that I can customize collaboration workflows per program.

#### Acceptance Criteria

1. THE System SHALL provide an admin interface to configure Teams integration per program type
2. WHEN configuring Teams integration, THE System SHALL allow selection of channel vs. group chat mode
3. WHEN configuring Teams integration, THE System SHALL allow specification of notification rules in JSONB format
4. THE System SHALL support notification rules for events: NEW_SUBMISSION, SLA_WARNING, DECISION_READY, DOCUMENTS_RECEIVED, FRAUD_DETECTED
5. WHEN notification rules are updated, THE System SHALL apply changes to new events within 1 minute without service restart

### Requirement 9: Dashboard Performance and Scalability

**User Story:** As a loan operations manager, I want the dashboard to load quickly even with thousands of applications, so that my team can work efficiently.

#### Acceptance Criteria

1. WHEN THE Loan_Operations_Dashboard loads with up to 10,000 active applications, THE System SHALL render the initial view within 2 seconds
2. THE System SHALL implement pagination with 50 applications per page for queue views
3. THE System SHALL cache pipeline statistics in Redis with 30-second TTL
4. WHEN filtering or sorting applications, THE System SHALL return results within 1 second
5. THE System SHALL use database indexes on status, assignedTo, submittedAt, and slaDeadline fields

### Requirement 10: Security and Access Control

**User Story:** As a security administrator, I want Teams integration to respect existing role-based access controls, so that unauthorized users cannot make decisions.

#### Acceptance Criteria

1. WHEN authenticating Teams webhook requests, THE System SHALL validate the request signature using Microsoft_Graph_API shared secret
2. WHEN processing Teams actions, THE System SHALL map Teams user ID to System user account and verify role permissions
3. IF a Teams user does not have Approver role, THEN THE System SHALL reject decision actions and display error message in Teams
4. THE System SHALL log all Teams integration actions to audit log with Teams user ID and timestamp
5. THE System SHALL encrypt Teams channel configuration data including teamId and channelId in database
