# Product Overview

## CivicFlow2 - Government Lending CRM Platform

A resilient system for streamlining micro-business grant and loan workflows for government agencies and lenders.

### Core Purpose
- Manage loan/grant applications from submission to approval
- Process and analyze financial documents using AI
- Automate workflow assignments and notifications
- Provide real-time dashboards and reporting
- Integrate with Microsoft Teams for notifications

### Key Features
- **Demo Mode**: Never crashes - automatically falls back to simulated data when infrastructure fails
- **Document Intelligence**: AI-powered document analysis using Azure Document Intelligence and OpenAI
- **Auto-Assignment**: Rule-based automatic assignment of applications to reviewers
- **Teams Integration**: Real-time notifications via Microsoft Teams
- **Multi-Role Support**: Applicant, Reviewer, Approver, Admin roles
- **Real-time Updates**: WebSocket-based live dashboard updates
- **Audit Logging**: Comprehensive audit trail for compliance

### Target Users
- Government agencies managing grant/loan programs
- Lenders processing micro-business applications
- Applicants submitting loan requests
- Reviewers and approvers in the workflow

### Deployment Contexts
- **Railway**: One-click deploy with automatic demo mode
- **Docker**: Full-stack deployment with PostgreSQL and Redis
- **Kubernetes**: Production-grade with auto-scaling and high availability
- **Local Development**: Can run with or without infrastructure

### Demo Mode Philosophy
The application is designed to NEVER crash. If database or Redis connections fail, it automatically switches to demo mode with realistic sample data. This ensures:
- Reliable demos and showcases
- Graceful degradation in production
- Development without infrastructure dependencies
