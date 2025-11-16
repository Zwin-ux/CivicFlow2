# Design Document

## Overview

Transform CivicFlow2's demo mode from a static fallback mechanism into an immersive, interactive showcase platform that tells a compelling story about the system's capabilities. The enhanced demo mode will feature live simulations, guided walkthroughs, AI demonstrations, and scenario-based experiences that highlight the platform's core principles: resilience, intelligence, and automation.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Enhanced Demo Mode Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Walkthrough  │  │  Scenario    │  │  Live        │          │
│  │  Engine      │  │  Player      │  │  Simulator   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                   ┌────────▼────────┐                            │
│                   │  Demo Mode      │                            │
│                   │  Orchestrator   │                            │
│                   └────────┬────────┘                            │
└────────────────────────────┼──────────────────────────────────────┘
                             │
┌────────────────────────────┼──────────────────────────────────────┐
│                     Frontend Application                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Dashboard   │  │ Applications │  │   Settings   │          │
│  │  + Metrics   │  │   + Cards    │  │  + Controls  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
DemoModeOrchestrator
├── WalkthroughEngine
│   ├── StepManager
│   ├── HighlightOverlay
│   └── TooltipRenderer
├── ScenarioPlayer
│   ├── ScenarioLoader
│   ├── EventSequencer
│   └── NarrationEngine
├── LiveSimulator
│   ├── EventGenerator
│   ├── AnimationController
│   └── NotificationManager
├── AIShowcaseEngine
│   ├── InsightGenerator
│   ├── ConfidenceCalculator
│   └── VisualizationRenderer
└── AnalyticsTracker
    ├── EventLogger
    ├── SessionManager
    └── ReportGenerator
```

## Components and Interfaces

### 1. Demo Mode Orchestrator

Central controller for all demo mode features.

```typescript
interface DemoModeOrchestrator {
  // Initialize demo mode with configuration
  initialize(config: DemoConfig): void;
  
  // Start/stop live simulation
  startSimulation(): void;
  stopSimulation(): void;
  
  // Launch walkthrough
  startWalkthrough(walkthroughId: string): void;
  
  // Play scenario
  playScenario(scenarioId: string): void;
  
  // Switch user role
  switchRole(role: UserRole): void;
  
  // Get current demo state
  getState(): DemoState;
}

interface DemoConfig {
  enableLiveSimulation: boolean;
  simulationInterval: number; // milliseconds
  enableWalkthrough: boolean;
  customData?: CustomDemoData;
  role: UserRole;
}

interface DemoState {
  isActive: boolean;
  currentRole: UserRole;
  simulationRunning: boolean;
  walkthroughActive: boolean;
  scenarioPlaying: boolean;
  analytics: DemoAnalytics;
}
```

### 2. Walkthrough Engine

Manages interactive guided tours.

```typescript
interface WalkthroughEngine {
  // Load walkthrough definition
  loadWalkthrough(id: string): Walkthrough;
  
  // Start walkthrough
  start(): void;
  
  // Navigate steps
  next(): void;
  previous(): void;
  skip(): void;
  
  // Get current step
  getCurrentStep(): WalkthroughStep;
}

interface Walkthrough {
  id: string;
  title: string;
  description: string;
  steps: WalkthroughStep[];
  estimatedDuration: number; // seconds
}

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetElement: string; // CSS selector
  position: 'top' | 'bottom' | 'left' | 'right';
  highlightStyle: HighlightStyle;
  action?: () => void; // Optional action to perform
  waitForElement?: boolean;
}

interface HighlightStyle {
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  backgroundColor: string;
  animation: 'pulse' | 'glow' | 'none';
}
```

### 3. Scenario Player

Plays pre-defined scenarios with narration.

```typescript
interface ScenarioPlayer {
  // Load scenario
  loadScenario(id: string): Scenario;
  
  // Play scenario
  play(): void;
  pause(): void;
  stop(): void;
  
  // Control playback
  setSpeed(speed: number): void; // 0.5x, 1x, 2x
  
  // Get current state
  getCurrentEvent(): ScenarioEvent;
  getProgress(): number; // 0-100
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  events: ScenarioEvent[];
  narration: NarrationScript;
}

interface ScenarioEvent {
  timestamp: number; // milliseconds from start
  type: 'navigation' | 'action' | 'data_change' | 'notification';
  target: string;
  data: any;
  animation?: AnimationConfig;
}

interface NarrationScript {
  segments: NarrationSegment[];
}

interface NarrationSegment {
  timestamp: number;
  text: string;
  voiceOver?: string; // URL to audio file
}
```

### 4. Live Simulator

Generates real-time simulated activity.

```typescript
interface LiveSimulator {
  // Start/stop simulation
  start(config: SimulationConfig): void;
  stop(): void;
  
  // Generate events
  generateEvent(): SimulatedEvent;
  
  // Configure event types
  setEventProbabilities(probabilities: EventProbabilities): void;
}

interface SimulationConfig {
  interval: number; // milliseconds between events
  eventTypes: EventType[];
  intensity: 'low' | 'medium' | 'high';
}

interface SimulatedEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  data: any;
  notification: NotificationConfig;
}

type EventType = 
  | 'new_application'
  | 'status_change'
  | 'document_uploaded'
  | 'review_completed'
  | 'approval_granted'
  | 'rejection_issued'
  | 'comment_added'
  | 'ai_analysis_complete';

interface EventProbabilities {
  new_application: number; // 0-1
  status_change: number;
  document_uploaded: number;
  review_completed: number;
  approval_granted: number;
  rejection_issued: number;
  comment_added: number;
  ai_analysis_complete: number;
}
```

### 5. AI Showcase Engine

Demonstrates AI capabilities with visual flair.

```typescript
interface AIShowcaseEngine {
  // Generate AI insights
  generateRiskScore(application: Application): AIRiskScore;
  generateDocumentAnalysis(document: Document): AIDocumentAnalysis;
  generateRecommendations(application: Application): AIRecommendation[];
  
  // Show processing animation
  showThinkingAnimation(duration: number): void;
  
  // Display results with animation
  revealInsights(insights: AIInsights, animation: AnimationConfig): void;
}

interface AIRiskScore {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
  confidence: number; // 0-1
  explanation: string;
}

interface RiskFactor {
  name: string;
  impact: number; // -100 to +100
  description: string;
}

interface AIDocumentAnalysis {
  documentType: string;
  confidence: number;
  extractedFields: ExtractedField[];
  qualityScore: number;
  issues: DocumentIssue[];
}

interface ExtractedField {
  name: string;
  value: string;
  confidence: number;
  boundingBox?: BoundingBox; // For highlighting on document
}

interface AIRecommendation {
  action: string;
  reason: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}
```

### 6. Resilience Demo Controller

Demonstrates failure handling and recovery.

```typescript
interface ResilienceDemoController {
  // Simulate failures
  simulateFailure(service: ServiceType, duration: number): void;
  
  // Trigger recovery
  triggerRecovery(service: ServiceType): void;
  
  // Show circuit breaker state
  showCircuitBreakerState(service: ServiceType): CircuitBreakerState;
  
  // Display activity feed
  getResilienceEvents(): ResilienceEvent[];
}

type ServiceType = 'database' | 'redis' | 'ai_service' | 'teams' | 'email';

interface CircuitBreakerState {
  service: ServiceType;
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailure?: Date;
  nextRetry?: Date;
}

interface ResilienceEvent {
  timestamp: Date;
  service: ServiceType;
  event: 'failure' | 'recovery' | 'degradation' | 'circuit_open' | 'circuit_closed';
  message: string;
  impact: 'none' | 'minor' | 'major';
}
```

### 7. Role Switcher

Manages multi-role experience.

```typescript
interface RoleSwitcher {
  // Switch to role
  switchTo(role: UserRole): void;
  
  // Get current role
  getCurrentRole(): UserRole;
  
  // Get role-specific UI config
  getRoleConfig(role: UserRole): RoleConfig;
}

type UserRole = 'applicant' | 'reviewer' | 'approver' | 'admin' | 'investor';

interface RoleConfig {
  role: UserRole;
  displayName: string;
  avatar: string;
  permissions: Permission[];
  defaultView: string; // Route path
  availableFeatures: Feature[];
  dashboardLayout: DashboardLayout;
}

interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

interface Feature {
  id: string;
  name: string;
  enabled: boolean;
  route?: string;
}
```

### 8. Demo Configuration Manager

Manages customizable demo settings.

```typescript
interface DemoConfigManager {
  // Load/save configuration
  loadConfig(): DemoConfiguration;
  saveConfig(config: DemoConfiguration): void;
  
  // Reset to defaults
  resetToDefaults(): void;
  
  // Validate configuration
  validateConfig(config: DemoConfiguration): ValidationResult;
}

interface DemoConfiguration {
  general: GeneralConfig;
  data: DataConfig;
  simulation: SimulationConfig;
  walkthrough: WalkthroughConfig;
  analytics: AnalyticsConfig;
}

interface GeneralConfig {
  companyName: string;
  industry: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
}

interface DataConfig {
  applicationCount: number;
  approvalRate: number; // 0-100
  averageLoanAmount: number;
  industries: string[];
  customApplications?: CustomApplication[];
}

interface CustomApplication {
  businessName: string;
  loanAmount: number;
  status: ApplicationStatus;
  industry: string;
}
```

### 9. Analytics Tracker

Tracks demo engagement and generates reports.

```typescript
interface AnalyticsTracker {
  // Track events
  trackPageView(page: string): void;
  trackFeatureView(feature: string, duration: number): void;
  trackWalkthroughProgress(step: number, total: number): void;
  trackScenarioCompletion(scenarioId: string, duration: number): void;
  
  // Get analytics
  getSessionAnalytics(): SessionAnalytics;
  
  // Generate report
  generateReport(): DemoReport;
}

interface SessionAnalytics {
  sessionId: string;
  startTime: Date;
  duration: number; // seconds
  pagesViewed: string[];
  featuresViewed: FeatureView[];
  walkthroughsCompleted: string[];
  scenariosCompleted: string[];
  role: UserRole;
}

interface FeatureView {
  feature: string;
  viewCount: number;
  totalDuration: number;
  firstViewed: Date;
  lastViewed: Date;
}

interface DemoReport {
  summary: ReportSummary;
  engagement: EngagementMetrics;
  features: FeatureMetrics[];
  recommendations: string[];
  exportUrl: string; // PDF download URL
}
```

## Data Models

### Enhanced Demo Data Structure

```typescript
interface EnhancedDemoData {
  applications: DemoApplication[];
  users: DemoUser[];
  documents: DemoDocument[];
  aiInsights: AIInsightCache[];
  activities: ActivityEvent[];
  metrics: DemoMetrics;
}

interface DemoApplication extends Application {
  aiRiskScore?: AIRiskScore;
  aiRecommendations?: AIRecommendation[];
  timeline: TimelineEvent[];
  collaborators: Collaborator[];
  tags: string[];
}

interface TimelineEvent {
  id: string;
  timestamp: Date;
  actor: DemoUser;
  action: string;
  details: string;
  metadata?: any;
}

interface Collaborator {
  user: DemoUser;
  role: string;
  joinedAt: Date;
  lastActive: Date;
  status: 'active' | 'idle' | 'offline';
}

interface AIInsightCache {
  applicationId: string;
  documentId?: string;
  insights: AIInsights;
  generatedAt: Date;
  expiresAt: Date;
}

interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  description: string;
  actor?: DemoUser;
  target?: string;
  metadata?: any;
}
```

## Error Handling

### Demo Mode Error Strategy

1. **Never Show Errors**: All errors are logged but never displayed to users
2. **Graceful Fallbacks**: Every feature has a fallback state
3. **Silent Recovery**: Automatically recover from transient issues
4. **User Feedback**: Show loading states instead of error states

### Error Boundaries

```typescript
// Wrap each major section in error boundary
<DemoErrorBoundary fallback={<DemoFallbackUI />}>
  <DemoFeature />
</DemoErrorBoundary>

// Error boundary shows elegant placeholder
class DemoErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to analytics
    analyticsTracker.trackError(error);
    
    // Show fallback UI
    this.setState({ hasError: true });
  }
}
```

## Testing Strategy

### Manual Testing Scenarios

1. **Walkthrough Flow**
   - Start walkthrough from dashboard
   - Navigate through all steps
   - Skip walkthrough mid-way
   - Complete walkthrough

2. **Live Simulation**
   - Enable simulation
   - Verify events generate every 30-60s
   - Check notifications appear
   - Verify metrics update
   - Disable simulation

3. **Scenario Playback**
   - Select "Rush Application" scenario
   - Watch automated playback
   - Pause and resume
   - Adjust playback speed
   - Complete scenario

4. **Role Switching**
   - Switch to Applicant role
   - Verify UI changes
   - Switch to Reviewer role
   - Verify different features shown
   - Switch to Admin role

5. **AI Showcase**
   - View application with AI insights
   - Check risk score displays
   - Verify document analysis shows
   - Check recommendations appear
   - Verify confidence scores

6. **Resilience Demo**
   - Click "Simulate Failure"
   - Watch graceful degradation
   - Verify fallback data shows
   - Trigger recovery
   - Verify normal operation resumes

### Automated Testing

```typescript
describe('Demo Mode Orchestrator', () => {
  it('should initialize with default config', () => {
    const orchestrator = new DemoModeOrchestrator();
    expect(orchestrator.getState().isActive).toBe(true);
  });
  
  it('should start live simulation', () => {
    orchestrator.startSimulation();
    expect(orchestrator.getState().simulationRunning).toBe(true);
  });
  
  it('should generate events at configured interval', async () => {
    const events = [];
    orchestrator.on('event', (e) => events.push(e));
    
    await wait(5000);
    expect(events.length).toBeGreaterThan(0);
  });
});
```

## UI/UX Design

### Visual Design System

#### Color Palette (Extended)
- **Demo Purple**: #8b5cf6 (primary demo indicator)
- **Demo Blue**: #3b82f6 (secondary demo indicator)
- **Success Green**: #10b981
- **Warning Amber**: #f59e0b
- **Error Red**: #ef4444
- **AI Cyan**: #06b6d4 (AI-related features)
- **Simulation Orange**: #f97316 (live simulation)

#### Animation Principles
- **Duration**: 200-300ms for micro-interactions
- **Easing**: cubic-bezier(0.4, 0.0, 0.2, 1) for smooth feel
- **Stagger**: 50ms delay between list items
- **Attention**: Pulse animation for new items

#### Component Styling

**Walkthrough Overlay**
```css
.walkthrough-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
}

.walkthrough-highlight {
  position: absolute;
  border: 3px solid #8b5cf6;
  border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
  animation: pulse 2s infinite;
}

.walkthrough-tooltip {
  position: absolute;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 400px;
}
```

**Live Simulation Indicator**
```css
.simulation-active {
  position: fixed;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #f97316, #fb923c);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1000;
}

.simulation-pulse {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}
```

**AI Insights Panel**
```css
.ai-insights-panel {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  border-radius: 12px;
  padding: 20px;
  color: white;
}

.ai-thinking {
  display: flex;
  gap: 4px;
}

.ai-thinking-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: thinking 1.4s infinite;
}

.ai-thinking-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.ai-thinking-dot:nth-child(3) {
  animation-delay: 0.4s;
}
```

### Interaction Patterns

#### Walkthrough Navigation
- **Next**: Right arrow key or "Next" button
- **Previous**: Left arrow key or "Back" button
- **Skip**: Escape key or "Skip Tour" link
- **Exit**: Click outside or X button

#### Scenario Controls
- **Play/Pause**: Spacebar or play button
- **Speed**: Dropdown (0.5x, 1x, 2x)
- **Progress**: Seekable progress bar
- **Restart**: Circular arrow button

#### Role Switcher
- **Dropdown**: Top-right corner with avatar
- **Quick Switch**: Keyboard shortcuts (Alt+1, Alt+2, etc.)
- **Visual Feedback**: Smooth transition with fade effect

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Load walkthrough/scenario data on demand
2. **Event Throttling**: Limit simulation events to prevent overwhelming UI
3. **Animation Performance**: Use CSS transforms and opacity for smooth 60fps
4. **Memory Management**: Clean up event listeners and timers
5. **Bundle Splitting**: Separate demo mode code into async chunk

### Performance Targets

- **Initial Load**: < 2 seconds
- **Walkthrough Start**: < 500ms
- **Scenario Load**: < 1 second
- **Role Switch**: < 300ms
- **Simulation Event**: < 100ms to render

## Security Considerations

### Demo Mode Security

1. **No Real Data**: All demo data is synthetic
2. **No Persistence**: Demo actions don't modify real database
3. **Rate Limiting**: Prevent abuse of demo features
4. **Analytics Privacy**: Store analytics in browser only
5. **Export Security**: Sanitize exported reports

## Deployment Considerations

### Feature Flags

```typescript
interface DemoFeatureFlags {
  enableWalkthrough: boolean;
  enableLiveSimulation: boolean;
  enableScenarios: boolean;
  enableRoleSwitching: boolean;
  enableAIShowcase: boolean;
  enableResilienceDemo: boolean;
  enableAnalytics: boolean;
  enableExport: boolean;
}
```

### Configuration

```bash
# Enable enhanced demo mode
DEMO_MODE_ENHANCED=true

# Enable specific features
DEMO_WALKTHROUGH_ENABLED=true
DEMO_SIMULATION_ENABLED=true
DEMO_SCENARIOS_ENABLED=true

# Simulation settings
DEMO_SIMULATION_INTERVAL=45000  # 45 seconds
DEMO_SIMULATION_INTENSITY=medium

# Analytics
DEMO_ANALYTICS_ENABLED=true
DEMO_ANALYTICS_STORAGE=local  # local or none
```

## Future Enhancements

### Phase 2 Features
- Voice narration for walkthroughs
- Video recordings of scenarios
- Custom scenario builder
- Multi-language support
- Advanced analytics dashboard
- A/B testing for demo flows

### Phase 3 Features
- VR/AR demo experiences
- Interactive 3D visualizations
- Gamification elements
- Social sharing of demo reports
- Integration with CRM systems
- Personalized demo paths based on industry
