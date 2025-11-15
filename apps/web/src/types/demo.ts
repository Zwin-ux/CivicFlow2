export interface DemoModeFeatures {
  authentication?: string;
  database?: string;
  cache?: string;
  externalServices?: string;
  dataSource?: string;
}

export interface DemoModeMetadata {
  active: boolean;
  message: string;
  reason?: string;
  features?: DemoModeFeatures;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  isDemo: boolean;
  demoMode?: DemoModeMetadata;
}

export interface DemoModeState {
  loading: boolean;
  isDemo: boolean;
  statusMessage?: string;
  reason?: string;
  features?: DemoModeFeatures;
  lastUpdated?: number;
  error?: string;
}
