export type UserRole = 'PATIENT' | 'PROVIDER' | 'SECURITY_ADMIN';

export type PaymentMethodType = 'MPESA' | 'CARD' | 'INSURANCE_COPAY';

export type PaymentStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'APPROVED' 
  | 'FLAGGED' 
  | 'DECLINED' 
  | 'QUARANTINED' 
  | 'RESOLVED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  organizationId?: string; // required for PROVIDER
  patientId?: string;      // linked if PATIENT
  phoneNumber?: string;
  createdAt: string;
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
  createdAt: string;
}

export interface Patient {
  id: string;
  userId: string;
  patientReference: string; // e.g., PAT-8492-4821 (masked identifier)
  fullNameMasked: string;   // e.g., J*** N****
  maskedPhone: string;      // e.g., +254 7** ***678
  gender: 'M' | 'F' | 'OTHER';
  county: string;
  riskBaseline: {
    avgTransactionAmount: number;
    knownDeviceFingerprints: string[];
    typicalHourRange: [number, number]; // e.g. 7 to 20
  };
  createdAt: string;
}

export interface HealthcareService {
  id: string;
  organizationId: string;
  name: string;
  category: 'CONSULTATION' | 'DIAGNOSTICS' | 'LAB' | 'PHARMACY' | 'EMERGENCY' | 'DENTAL';
  description: string;
  standardPrice: number;
  currency: string; // e.g., 'KES'
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
  riskScore: number; // 0 - 100 (Final authoritative score)
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
  paymentReference: string; // e.g., MPESA-DEMO-849201
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
  eventType: 
    | 'USER_LOGIN' 
    | 'USER_LOGOUT' 
    | 'PAYMENT_CREATED' 
    | 'PAYMENT_APPROVED' 
    | 'PAYMENT_FLAGGED' 
    | 'PAYMENT_DECLINED' 
    | 'PAYMENT_QUARANTINED'
    | 'RISK_ANALYSIS_COMPLETED' 
    | 'SUSPICIOUS_ACTIVITY_DETECTED' 
    | 'USER_CREATED' 
    | 'CONSENT_GRANTED' 
    | 'CONSENT_REVOKED' 
    | 'SENSITIVE_RECORD_ACCESSED' 
    | 'API_SECURITY_EVENT';
  resource: string;
  action: string;
  result: 'SUCCESS' | 'WARNING' | 'ALERT' | 'BLOCKED';
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata: Record<string, any>;
  previousHash: string; // Cryptographic chaining (IBM Guardium style)
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

export interface ApiSecurityPolicyMetric {
  endpoint: string;
  method: string;
  totalRequests: number;
  blockedRequests: number;
  averageLatencyMs: number;
  wafRuleHits: number;
  lastBlockedAt?: string;
}
