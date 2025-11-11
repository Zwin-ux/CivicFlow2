/**
 * Teams Integration Models
 * Type definitions for Microsoft Teams integration
 */

/**
 * Teams Channel Configuration
 * Stores Teams channel mapping for program types
 */
export interface TeamsChannelConfig {
  id: string;
  programType: string;
  teamId: string;
  channelId: string;
  channelName: string;
  notificationRules: NotificationRules;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification Rules
 * Defines which events trigger Teams notifications
 */
export interface NotificationRules {
  NEW_SUBMISSION?: boolean;
  SLA_WARNING?: boolean;
  DECISION_READY?: boolean;
  DOCUMENTS_RECEIVED?: boolean;
  FRAUD_DETECTED?: boolean;
  STATUS_CHANGED?: boolean;
  DECISION_MADE?: boolean;
}

/**
 * Teams Message
 * Tracks messages posted to Teams for applications
 */
export interface TeamsMessage {
  id: string;
  applicationId: string;
  messageId: string;
  channelId: string;
  cardType: CardType;
  postedAt: Date;
  updatedAt: Date;
}

/**
 * Card Type
 * Types of Adaptive Cards that can be posted
 */
export type CardType = 'SUBMISSION' | 'SLA_WARNING' | 'DECISION_READY' | 'STATUS_UPDATE';

/**
 * Assignment Rule
 * Defines rules for auto-assigning applications to loan officers
 */
export interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  condition: AssignmentCondition;
  assignTo: AssignmentTarget;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Assignment Condition
 * Conditions that must be met for rule to apply
 */
export interface AssignmentCondition {
  programTypes?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  riskScoreRange?: {
    min: number;
    max: number;
  };
  requiresSpecialization?: string[];
  applicantState?: string[];
}

/**
 * Assignment Target
 * Defines how to assign when rule matches
 */
export interface AssignmentTarget {
  type: 'USER' | 'ROUND_ROBIN' | 'LEAST_LOADED';
  userId?: string;
  userPool?: string[];
}

/**
 * Adaptive Card
 * Microsoft Teams Adaptive Card structure
 */
export interface AdaptiveCard {
  type: 'AdaptiveCard';
  version: '1.4' | '1.5';
  body: CardElement[];
  actions?: CardAction[];
  $schema?: string;
}

/**
 * Card Element
 * Elements that can be included in an Adaptive Card
 */
export type CardElement = TextBlock | FactSet | Container | Image | ColumnSet;

export interface TextBlock {
  type: 'TextBlock';
  text: string;
  size?: 'Small' | 'Default' | 'Medium' | 'Large' | 'ExtraLarge';
  weight?: 'Lighter' | 'Default' | 'Bolder';
  color?: 'Default' | 'Dark' | 'Light' | 'Accent' | 'Good' | 'Warning' | 'Attention';
  wrap?: boolean;
  maxLines?: number;
}

export interface FactSet {
  type: 'FactSet';
  facts: Fact[];
}

export interface Fact {
  title: string;
  value: string;
}

export interface Container {
  type: 'Container';
  items: CardElement[];
  style?: 'default' | 'emphasis' | 'good' | 'attention' | 'warning' | 'accent';
}

export interface Image {
  type: 'Image';
  url: string;
  size?: 'Auto' | 'Stretch' | 'Small' | 'Medium' | 'Large';
  style?: 'Default' | 'Person';
}

export interface ColumnSet {
  type: 'ColumnSet';
  columns: Column[];
}

export interface Column {
  type: 'Column';
  items: CardElement[];
  width?: string | number;
}

/**
 * Card Action
 * Actions that can be performed from an Adaptive Card
 */
export type CardAction = ActionSubmit | ActionOpenUrl;

export interface ActionSubmit {
  type: 'Action.Submit';
  title: string;
  data: {
    action: string;
    applicationId: string;
    [key: string]: any;
  };
  style?: 'default' | 'positive' | 'destructive';
}

export interface ActionOpenUrl {
  type: 'Action.OpenUrl';
  title: string;
  url: string;
}

/**
 * Webhook Request
 * Structure of incoming webhook requests from Teams
 */
export interface WebhookRequest {
  type: string;
  value: {
    action: string;
    applicationId: string;
    [key: string]: any;
  };
  from: {
    id: string;
    name: string;
    aadObjectId: string;
  };
  conversation: {
    id: string;
  };
  replyToId?: string;
}

/**
 * Webhook Response
 * Response sent back to Teams after processing webhook
 */
export interface WebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
  updatedCard?: AdaptiveCard;
}

/**
 * Meeting Info
 * Information about a created Teams meeting
 */
export interface MeetingInfo {
  id: string;
  joinUrl: string;
  subject: string;
  startDateTime: Date;
  endDateTime: Date;
}
