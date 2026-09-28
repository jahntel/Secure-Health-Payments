export type UserRole = 'PATIENT' | 'PROVIDER' | 'SECURITY_ADMIN';
export type PaymentMethodType = 'MPESA' | 'CARD' | 'INSURANCE_COPAY';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'FLAGGED' | 'DECLINED' | 'QUARANTINED' | 'RESOLVED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId?: string;
  patientId?: string;
  organization?: Organization;
  patient?: Patient;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  type: 'CLINIC' | 'HOSPITAL' | 'HEALTH_CENTRE';
  county: string;
  country: string;
  contactEmail: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface Patient {
  id: string;
  userId: string;
  patientReference: string;
  fullNameMasked: string;
  maskedPhone: string;
  gender: 'M' | 'F' | 'OTHER';
  county: string;
  riskBaseline: {
    avgTransactionAmount: number;
    knownDeviceFingerprints: string[];
    typicalHourRange: [number, number];
  };
}

export interface HealthcareService {
  id: string;
  organizationId: string;
  name: string;
  category: 'CONSULTATION' | 'DIAGNOSTICS' | 'LAB' | 'PHARMACY' | 'EMERGENCY' | 'DENTAL';
  description: string;
  standardPrice: number;
  currency: string;
  isActive: boolean;
}

export interface RiskFactor {
  signal: string;
  points: number;
  maxPoints: number;
  description: string;
  anomalyDetected: boolean;
}

export interface AiRiskAnalysisResult {
  model: string;
  region: string;
  riskLevel: RiskLevel;
  riskScore: number;
  signals: string[];
  explanation: string;
  recommendedAction: 'ALLOW' | 'REVIEW' | 'BLOCK';
  status: 'SUCCESS' | 'FALLBACK_TO_DETERMINISTIC' | 'SIMULATED_DEMO';
  latencyMs?: number;
  failureReason?: string;
}

export interface DeterministicRiskResult {
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  factors: RiskFactor[];
  recommendedAction: string;
}

export interface TransactionRiskAssessment {
  id: string;
  transactionId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  factors: RiskFactor[];
  recommendedAction: string;
  aiEngine: 'LOCAL_RULE_ENGINE' | 'IBM_WATSONX_AI';
  aiEngineDetails: string;
  evaluatedAt: string;
  aiAssessment?: AiRiskAnalysisResult;
  deterministicAssessment?: DeterministicRiskResult;
  deterministicOverridesAi?: boolean;
}

export interface Transaction {
  id: string;
  organizationId: string;
  patientId: string;
  patientReference: string;
  serviceId: string;
  serviceName: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  paymentReference: string;
  phoneNumberMasked?: string;
  cardLastFour?: string;
  status: PaymentStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  deviceFingerprint: string;
  isSimulatedAttack?: boolean;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole;
  actorEmail: string;
  organizationId?: string;
  eventType: string;
  resource: string;
  action: string;
  result: 'SUCCESS' | 'WARNING' | 'ALERT' | 'BLOCKED';
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata: Record<string, any>;
  previousHash: string;
  entryHash: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  organizationId?: string;
  transactionId?: string;
  title: string;
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'FALSE_POSITIVE';
  riskScore: number;
  indicators: string[];
  recommendedAction: string;
  investigatedBy?: string;
  investigationNotes?: string;
  resolvedAt?: string;
}

export interface ConsentSetting {
  id: string;
  patientId: string;
  purpose: string;
  category: string;
  granted: boolean;
  grantedAt: string;
  legalBasis: string;
  retentionPeriod: string;
}

export interface DashboardMetrics {
  totalTransactions: number;
  todayRevenue: number;
  flaggedCount: number;
  highRiskCount: number;
  successRate: number;
  riskDistribution: { name: string; count: number; color: string }[];
  paymentMethods: { name: string; count: number; color: string }[];
  aiMetrics?: {
    aiAssessedCount: number;
    deterministicOverridesCount: number;
    watsonxStatus: {
      configured: boolean;
      projectId: string;
      endpoint: string;
      region: string;
      model: string;
      tokenCached: boolean;
      tokenExpiresInSeconds?: number;
    };
  };
  gatewayStatus: {
    status: string;
    mode: string;
    gatewayName: string;
    activePolicies: string[];
    connectedUrl: string;
  };
}
