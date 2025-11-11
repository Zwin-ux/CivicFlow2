# Implementation Plan

- [x] 1. Set up Teams Integration infrastructure





  - Create Microsoft Graph API client configuration with OAuth 2.0 authentication
  - Register application in Azure AD and configure required permissions (Channel.ReadWrite.All, Chat.Create, ChatMessage.Send)
  - Set up environment variables for Teams client ID, secret, and tenant ID
  - Create database migrations for teams_channels, teams_messages, and assignment_rules tables
  - _Requirements: 5.1, 8.1_

- [x] 2. Implement Teams Integration Service core




  - [x] 2.1 Create Teams service models and repository


    - Define TypeScript interfaces for TeamsChannelConfig, TeamsMessage, and NotificationRules
    - Implement repository pattern for teams_channels and teams_messages tables
    - Create database queries for channel lookup and message tracking
    - _Requirements: 5.1, 8.1_

  - [x] 2.2 Build Microsoft Graph API client wrapper


    - Create GraphClient class with authentication and token refresh logic
    - Implement methods for creating Teams channels and group chats
    - Add methods for posting and updating messages in channels
    - Implement error handling with retry logic for transient failures
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 2.3 Implement Adaptive Card generation


    - Create card template functions for new submission, SLA warning, and decision-ready events
    - Build card factory with dynamic data binding from application objects
    - Add action buttons with proper data payloads for webhook handling
    - _Requirements: 6.1, 6.2, 6.3_





  - [ ] 2.4 Build channel management logic
    - Implement ensureChannel method to create or retrieve Teams channels by program type
    - Add channel caching in Redis to reduce Graph API calls
    - Create channel naming convention and metadata storage
    - _Requirements: 5.1, 5.4, 5.5_

- [x] 3. Implement webhook handler for Teams actions





  - [x] 3.1 Create webhook endpoint and request validation


    - Build POST /api/teams/webhook endpoint to receive Teams action callbacks
    - Implement webhook signature validation using shared secret
    - Parse webhook payload and extract action type and application ID
    - _Requirements: 7.1, 7.2, 10.1_

  - [x] 3.2 Build user authentication and authorization


    - Map Teams AAD Object ID to system user account
    - Verify user has required role (Approver) for decision actions
    - Return 403 error for unauthorized actions with user-friendly message
    - _Requirements: 7.2, 10.2, 10.4_

  - [x] 3.3 Implement action handlers


    - Create handler for APPROVE action that calls ApplicationService.makeDecision
    - Create handler for REJECT action with decision logging
    - Create handler for REQUEST_INFO action that updates application status
    - Update Adaptive Card after action to show decision and user who made it
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

  - [x] 3.4 Add webhook audit logging


    - Log all webhook requests with Teams user ID, action, and timestamp
    - Track webhook processing time and success/failure rates
    - Alert administrators on repeated webhook failures
    - _Requirements: 7.7, 10.4_

- [x] 4. Build event-driven Teams notifications





  - [x] 4.1 Create event listener for application events


    - Subscribe to application events: NEW_SUBMISSION, SLA_WARNING, DECISION_READY
    - Implement event handler that checks Teams configuration for program type
    - Filter events based on notification rules in teams_channels table
    - _Requirements: 6.1, 6.2, 6.3, 8.4_

  - [x] 4.2 Implement notification posting logic


    - Generate appropriate Adaptive Card based on event type
    - Post card to configured Teams channel using Graph API
    - Store message ID in teams_messages table for future updates
    - Handle posting failures with retry and fallback logging
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 4.3 Build card update mechanism


    - Implement updateCard method to modify existing Adaptive Cards
    - Update cards when application status changes or decisions are made
    - Add visual indicators (checkmarks, timestamps) to show action completion
    - _Requirements: 7.6_

- [x] 5. Implement Dashboard API layer





  - [x] 5.1 Create pipeline view endpoint


    - Build GET /api/dashboard/pipeline endpoint with status grouping
    - Calculate SLA status (ON_TRACK, AT_RISK, BREACHED) for each application
    - Include risk score and fraud flags in application summaries
    - Implement Redis caching for pipeline statistics with 30-second TTL
    - _Requirements: 1.1, 1.2, 1.3, 9.3_

  - [x] 5.2 Build queue management endpoints

    - Create GET /api/dashboard/queue endpoint with "my-queue" and "unassigned" views
    - Implement POST /api/dashboard/queue/claim for application assignment
    - Add pagination support with 50 applications per page
    - Return queue data within 1 second for up to 10,000 applications
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 9.4_

  - [x] 5.3 Implement SLA analytics endpoint

    - Create GET /api/dashboard/sla endpoint with breach and at-risk lists
    - Calculate average processing time per workflow stage
    - Identify bottleneck stages where applications age beyond threshold
    - Cache SLA analytics in Redis with 5-minute TTL
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.4 Build quick action endpoints

    - Create POST /api/dashboard/actions/request-documents endpoint
    - Create POST /api/dashboard/actions/add-note for internal notes
    - Create POST /api/dashboard/actions/start-huddle to create Teams meetings
    - Create POST /api/dashboard/actions/log-decision for quick decision entry
    - Ensure all actions complete within 3 seconds
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.5 Implement WebSocket support for real-time updates


    - Create WebSocket endpoint at /api/dashboard/stream
    - Emit events for application updates, assignments, and SLA changes
    - Implement connection management and heartbeat mechanism
    - Support up to 1,000 concurrent WebSocket connections
    - _Requirements: 1.5_

- [x] 6. Build Auto-Assignment Engine





  - [x] 6.1 Create assignment rules data model and repository


    - Implement AssignmentRule interface with condition and target fields
    - Create repository for CRUD operations on assignment_rules table
    - Build query methods for loading active rules sorted by priority
    - _Requirements: 2.5, 8.2_

  - [x] 6.2 Implement rule evaluation engine


    - Create matchesCondition method to evaluate rules against applications
    - Support conditions: program type, amount range, risk score, specialization
    - Implement priority-based rule matching (highest priority first)
    - _Requirements: 2.5_

  - [x] 6.3 Build assignment strategies


    - Implement direct user assignment strategy
    - Create round-robin assignment across user pool
    - Build least-loaded assignment based on current workload
    - Add workload calculation query counting active applications per user
    - _Requirements: 2.5_

  - [x] 6.4 Integrate auto-assignment with application workflow


    - Trigger auto-assignment when new application is submitted
    - Update application assigned_to and assigned_at fields
    - Emit assignment event for dashboard real-time updates
    - Log assignment decisions to audit log
    - _Requirements: 2.4, 2.5_

- [-] 7. Create Loan Operations Dashboard UI



  - [x] 7.1 Build dashboard layout and navigation


    - Create React dashboard component with Material-UI
    - Implement tab navigation for Pipeline, Queue, and SLA views
    - Add header with user info and real-time connection status
    - Set up routing for dashboard sub-pages
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 7.2 Implement Pipeline View component


    - Create status columns for each workflow stage
    - Display application cards with SLA badges (green/yellow/red)
    - Show risk score and fraud flag indicators on cards
    - Implement drag-and-drop for manual status changes (optional)
    - Add auto-refresh every 30 seconds
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 7.3 Build Queue View component




    - Create tabbed interface for "My Queue" and "Unassigned"
    - Display application list with sortable columns
    - Add "Claim" button for unassigned applications
    - Implement pagination with 50 items per page
    - Show loading states and empty states
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 7.4 Create SLA Analytics View component





    - Build breach list with red highlighting
    - Display at-risk applications with yellow highlighting
    - Create bar chart for average processing time by stage
    - Show bottleneck analysis with recommendations
    - Add date range filter for historical analysis
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 7.5 Implement Quick Actions UI





    - Create modal dialogs for each quick action type
    - Build document request form with multi-select
    - Create note entry form with rich text editor
    - Implement Teams huddle creation with participant selection
    - Add decision form with justification field
    - Show success/error notifications after actions
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 7.6 Add WebSocket integration for real-time updates





    - Establish WebSocket connection on dashboard mount
    - Listen for application update events and refresh affected cards
    - Show toast notifications for new assignments and SLA warnings
    - Implement reconnection logic with exponential backoff
    - _Requirements: 1.5_

- [x] 8. Implement Teams configuration management





  - [x] 8.1 Create admin UI for Teams configuration


    - Build configuration page for Teams integration settings
    - Add form to configure Teams channels per program type
    - Implement toggle for channel vs. group chat mode
    - Create notification rules editor with checkboxes for event types
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 8.2 Build Teams configuration API


    - Create GET /api/admin/teams/config endpoint to retrieve configurations
    - Create POST /api/admin/teams/config to save configuration
    - Create PUT /api/admin/teams/config/:id to update existing configuration
    - Create DELETE /api/admin/teams/config/:id to deactivate configuration
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 8.3 Implement configuration validation


    - Validate Teams channel IDs using Graph API before saving
    - Check notification rules JSON schema
    - Prevent duplicate configurations for same program type
    - Test Teams connectivity when configuration is saved
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 8.4 Add configuration change handling


    - Reload notification rules from database when updated
    - Implement cache invalidation for Teams channel mappings
    - Apply configuration changes within 1 minute without restart
    - Log configuration changes to audit log
    - _Requirements: 8.5_

- [ ] 9. Add performance optimizations
  - [ ] 9.1 Implement database indexes
    - Create index on applications(assigned_to) for queue queries
    - Create composite index on applications(status, submitted_at) for pipeline
    - Create index on applications(sla_deadline) for SLA queries
    - Create index on applications(risk_score) for fraud filtering
    - _Requirements: 9.1, 9.5_

  - [ ] 9.2 Build caching layer
    - Cache pipeline statistics in Redis with 30-second TTL
    - Cache user queue data in Redis with 60-second TTL
    - Cache Teams channel mappings in Redis with 1-hour TTL
    - Implement cache invalidation on relevant data changes
    - _Requirements: 9.3_

  - [ ] 9.3 Optimize API queries
    - Use database query pagination for large result sets
    - Implement query result streaming for exports
    - Add query timeouts to prevent long-running queries
    - Use connection pooling for database connections
    - _Requirements: 9.1, 9.2, 9.4_

- [ ] 10. Implement security measures
  - [ ] 10.1 Add webhook security
    - Validate Microsoft Teams webhook signatures using HMAC
    - Implement rate limiting on webhook endpoint (100 requests per minute)
    - Add request logging for security auditing
    - Reject webhooks with invalid or expired signatures
    - _Requirements: 10.1, 10.4_

  - [ ] 10.2 Secure Teams configuration data
    - Encrypt Teams channel IDs and team IDs in database using AES-256
    - Store Microsoft Graph API tokens in secure key vault
    - Implement token rotation for Graph API credentials
    - _Requirements: 10.5_

  - [ ] 10.3 Enforce access controls
    - Verify user roles before allowing dashboard access
    - Check permissions for quick actions based on user role
    - Validate Teams user mapping before processing webhook actions
    - Log all authorization failures to audit log
    - _Requirements: 10.2, 10.3, 10.4_

- [ ]* 11. Write comprehensive tests
  - [ ]* 11.1 Unit tests for Teams Integration Service
    - Test Adaptive Card generation with various application states
    - Test channel creation and caching logic
    - Test webhook signature validation
    - Test user mapping and authorization checks
    - _Requirements: 5.1, 6.1, 7.1, 10.1_

  - [ ]* 11.2 Integration tests for Dashboard API
    - Test pipeline view with various filters and pagination
    - Test queue management and claim functionality
    - Test SLA analytics calculations
    - Test quick actions with database updates
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [ ]* 11.3 End-to-end tests for Teams workflow
    - Test complete notification flow from event to card post
    - Test webhook action flow from button click to decision
    - Test card update after action completion
    - Test error handling and retry logic
    - _Requirements: 6.1, 7.1, 7.6_

  - [ ]* 11.4 Performance tests
    - Load test dashboard with 10,000 applications
    - Test concurrent webhook requests (100 simultaneous)
    - Test WebSocket scalability with 1,000 connections
    - Verify dashboard load time under 2 seconds
    - _Requirements: 9.1, 9.2_

- [ ]* 12. Create documentation and deployment guides
  - [ ]* 12.1 Write Teams integration setup guide
    - Document Azure AD app registration steps
    - List required Microsoft Graph API permissions
    - Provide webhook URL configuration instructions
    - Include troubleshooting section for common issues
    - _Requirements: 5.1, 7.1_

  - [ ]* 12.2 Create dashboard user guide
    - Document pipeline view features and filters
    - Explain queue management and auto-assignment
    - Describe SLA monitoring and analytics
    - Provide quick action usage examples
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [ ]* 12.3 Write API documentation
    - Generate OpenAPI/Swagger docs for dashboard endpoints
    - Document webhook payload format and response codes
    - Include example requests and responses
    - Add authentication and authorization requirements
    - _Requirements: 1.1, 2.1, 3.1, 4.1_
