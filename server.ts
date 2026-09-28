import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { dbStore } from './src/server/store.ts';
import { guardiumService } from './src/server/services/ibmGuardium.ts';
import { riskEngine } from './src/server/services/riskEngine.ts';
import { apiConnectGateway } from './src/server/services/ibmApiConnect.ts';
import { watsonxService } from './src/server/services/watsonxService.ts';
import { User, UserRole, PaymentMethodType, Transaction } from './src/server/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-change-in-production-min32chars';

// Body parsers with request size limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// IBM DataPower Gateway Threat Protection & Rate Limiting middleware
app.use('/api', apiConnectGateway.threatProtectionMiddleware);

// --- JWT Helper Middleware ---
export interface AuthenticatedRequest extends express.Request {
  user?: User;
}

const authenticateToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: Missing Authorization Header' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Access Denied: Invalid or expired security token' });
    }
    const user = dbStore.users.get(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }
    req.user = user;
    next();
  });
};

const requireRoles = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient privileges for this healthcare gateway resource'
      });
    }
    next();
  };
};

// ==========================================
// API ROUTES
// ==========================================

// 1. Health check & IBM Gateway Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Secure Health Payments Gateway',
    timestamp: new Date().toISOString(),
    ibmConnect: apiConnectGateway.getGatewayInfo(),
    watsonxStatus: watsonxService.getStatusSummary(),
    guardiumChainIntegrity: guardiumService.verifyAuditChain(dbStore.auditLogs).isValid
  });
});

// 2. Authentication: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = Array.from(dbStore.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isValid) {
    // Record audit event for failed attempt
    const auditLog = guardiumService.createChainedAuditEntry({
      actorId: user.id,
      actorRole: user.role,
      actorEmail: user.email,
      organizationId: user.organizationId,
      eventType: 'API_SECURITY_EVENT',
      resource: '/api/auth/login',
      action: 'FAILED_AUTHENTICATION_ATTEMPT',
      result: 'BLOCKED',
      severity: 'MEDIUM',
      metadata: { email }
    });
    dbStore.auditLogs.push(auditLog);

    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Issue Token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      patientId: user.patientId
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  // Audit successful login
  const auditLog = guardiumService.createChainedAuditEntry({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    organizationId: user.organizationId,
    eventType: 'USER_LOGIN',
    resource: '/api/auth/login',
    action: 'SESSION_AUTHENTICATED',
    result: 'SUCCESS',
    severity: 'INFO',
    metadata: { role: user.role }
  });
  dbStore.auditLogs.push(auditLog);

  let patient = null;
  if (user.patientId) {
    patient = dbStore.patients.get(user.patientId);
  }

  let organization = null;
  if (user.organizationId) {
    organization = dbStore.organizations.get(user.organizationId);
  }

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
      patientId: user.patientId,
      organization,
      patient
    }
  });
});

// 3. Current User Profile
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  let patient = null;
  if (user.patientId) {
    patient = dbStore.patients.get(user.patientId);
  }
  let organization = null;
  if (user.organizationId) {
    organization = dbStore.organizations.get(user.organizationId);
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
      patientId: user.patientId,
      organization,
      patient
    }
  });
});

// 4. Healthcare Organizations & Services Catalog
app.get('/api/organizations', (req, res) => {
  const orgs = Array.from(dbStore.organizations.values());
  res.json(orgs);
});

app.get('/api/services', (req, res) => {
  const orgId = req.query.organizationId as string;
  let services = Array.from(dbStore.services.values());
  if (orgId) {
    services = services.filter(s => s.organizationId === orgId);
  }
  res.json(services);
});

// 5. Patient Payment Execution Flow
app.post('/api/payments', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { organizationId, serviceId, paymentMethod, phoneNumber, cardLastFour, clientDevice } = req.body;

  if (!organizationId || !serviceId || !paymentMethod) {
    return res.status(400).json({ error: 'Missing required payment parameters' });
  }

  const organization = dbStore.organizations.get(organizationId);
  if (!organization) {
    return res.status(404).json({ error: 'Healthcare organization not found' });
  }

  const service = dbStore.services.get(serviceId);
  if (!service || service.organizationId !== organizationId) {
    return res.status(404).json({ error: 'Healthcare service not found for this provider' });
  }

  // Derive Patient Profile
  let patient = user.patientId ? dbStore.patients.get(user.patientId) : null;
  let patientId = patient ? patient.id : 'pat-walkin-01';
  let patientRef = patient ? patient.patientReference : 'PAT-9000-1122';

  const txnId = `TXN-2026-${String(dbStore.transactions.size + 1).padStart(6, '0')}`;
  const amount = service.standardPrice;
  const currency = service.currency || 'KES';
  const deviceFingerprint = clientDevice || 'dev-browser-patient-client';

  // Perform Real-Time Risk Analysis
  const currentHour = new Date().getHours();
  const assessment = await riskEngine.analyzeTransaction({
    transactionId: txnId,
    amount,
    currency,
    patientId,
    patientReference: patientRef,
    serviceCategory: service.category,
    deviceFingerprint,
    recentFailedAttemptsCount: 0,
    recentTransactionsCountLastHour: 1,
    patientHistoricalAvgAmount: patient ? patient.riskBaseline.avgTransactionAmount : 2000,
    knownDeviceFingerprints: patient ? patient.riskBaseline.knownDeviceFingerprints : [deviceFingerprint],
    hourOfDay: currentHour
  });

  const paymentRef = paymentMethod === 'MPESA'
    ? `MPESA-DEMO-${Math.floor(800000 + Math.random() * 199999)}`
    : `CARD-AUTH-${Math.floor(900000 + Math.random() * 99999)}`;

  const maskedPhone = phoneNumber ? guardiumService.maskPhone(phoneNumber) : (patient ? patient.maskedPhone : '+254 7** ***000');

  let status: Transaction['status'] = 'APPROVED';
  if (assessment.riskLevel === 'HIGH') {
    status = 'QUARANTINED';
  } else if (assessment.riskLevel === 'MEDIUM') {
    status = 'FLAGGED';
  }

  const transaction: Transaction = {
    id: txnId,
    organizationId,
    patientId,
    patientReference: patientRef,
    serviceId: service.id,
    serviceName: service.name,
    amount,
    currency,
    paymentMethod: paymentMethod as PaymentMethodType,
    paymentReference: paymentRef,
    phoneNumberMasked: maskedPhone,
    cardLastFour: cardLastFour || (paymentMethod === 'CARD' ? '4182' : undefined),
    status,
    riskScore: assessment.riskScore,
    riskLevel: assessment.riskLevel,
    deviceFingerprint,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbStore.transactions.set(txnId, transaction);
  dbStore.riskAssessments.set(txnId, assessment);

  // If High/Medium, raise Security Event in SOC
  if (assessment.riskLevel !== 'LOW') {
    const secEvt = {
      id: `SEC-EVT-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
      organizationId,
      transactionId: txnId,
      title: `${assessment.riskLevel === 'HIGH' ? '🚨 High-Risk' : '⚠️ Elevated Risk'} Payment Flagged`,
      severity: assessment.riskLevel,
      status: 'OPEN' as const,
      riskScore: assessment.riskScore,
      indicators: assessment.reasons,
      recommendedAction: assessment.recommendedAction
    };
    dbStore.securityEvents.set(secEvt.id, secEvt);
  }

  // Cryptographic Chained Audit Log (IBM Guardium Data Integrity)
  const auditLog = guardiumService.createChainedAuditEntry({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    organizationId,
    eventType: assessment.riskLevel === 'HIGH' ? 'PAYMENT_QUARANTINED' : (assessment.riskLevel === 'MEDIUM' ? 'PAYMENT_FLAGGED' : 'PAYMENT_APPROVED'),
    resource: `/api/payments/${txnId}`,
    action: 'CREATE_PAYMENT_TRANSACTION',
    result: assessment.riskLevel === 'HIGH' ? 'ALERT' : (assessment.riskLevel === 'MEDIUM' ? 'WARNING' : 'SUCCESS'),
    severity: assessment.riskLevel === 'HIGH' ? 'HIGH' : (assessment.riskLevel === 'MEDIUM' ? 'MEDIUM' : 'INFO'),
    metadata: {
      transactionId: txnId,
      amount,
      currency,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      paymentMethod,
      serviceName: service.name,
      aiEngine: assessment.aiEngine,
      aiModel: assessment.aiAssessment?.model,
      aiStatus: assessment.aiAssessment?.status,
      deterministicOverridesAi: assessment.deterministicOverridesAi
    }
  });
  dbStore.auditLogs.push(auditLog);

  res.status(201).json({
    transaction,
    assessment,
    receipt: {
      transactionId: txnId,
      paymentReference: paymentRef,
      provider: organization.name,
      service: service.name,
      amount: `${currency} ${amount.toLocaleString()}`,
      status,
      timestamp: transaction.createdAt
    }
  });
});

// 6. Query Transactions (Multi-Tenant Isolated)
app.get('/api/payments', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const txns = dbStore.getTransactionsForUser(user);
  res.json(txns);
});

// 7. Get Transaction Details with Risk Assessment & Tenant Check
app.get('/api/payments/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const txn = dbStore.getTransactionById(req.params.id, user);
  if (!txn) {
    return res.status(404).json({ error: 'Transaction not found or access forbidden' });
  }
  const assessment = dbStore.riskAssessments.get(txn.id);

  res.json({
    transaction: txn,
    assessment
  });
});

// 8. DEMO ATTACK SCENARIO: Trigger Suspicious Transaction
app.post('/api/demo/suspicious-transaction', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  
  // Create a high-risk transaction scenario (KES 75,000, new device, failed attempts)
  const txnId = `TXN-2026-${String(dbStore.transactions.size + 1).padStart(6, '0')}`;
  const amount = 75000;
  const currency = 'KES';
  const orgId = user.organizationId || 'org-afyacare';
  const org = dbStore.organizations.get(orgId) || Array.from(dbStore.organizations.values())[0];
  const service = Array.from(dbStore.services.values()).find(s => s.organizationId === org.id) || Array.from(dbStore.services.values())[0];

  // Evaluate using the Risk Engine with attack flags
  const assessment = await riskEngine.analyzeTransaction({
    transactionId: txnId,
    amount,
    currency,
    patientId: 'pat-demo-01',
    patientReference: 'PAT-8492-4821',
    deviceFingerprint: 'dev-untrusted-tor-node-0x99',
    recentFailedAttemptsCount: 4,
    recentTransactionsCountLastHour: 5,
    patientHistoricalAvgAmount: 1800,
    knownDeviceFingerprints: ['dev-mac-safari-faith-01'],
    hourOfDay: 2, // 2 AM off-hours
    isSimulatedAttack: true
  });

  const transaction: Transaction = {
    id: txnId,
    organizationId: org.id,
    patientId: 'pat-demo-01',
    patientReference: 'PAT-8492-4821',
    serviceId: service.id,
    serviceName: 'Simulated High-Value Surgery Deposit',
    amount,
    currency,
    paymentMethod: 'MPESA',
    paymentReference: `MPESA-DEMO-${Math.floor(880000 + Math.random() * 9999)}`,
    phoneNumberMasked: '+254 7** ***678',
    status: 'QUARANTINED',
    riskScore: assessment.riskScore,
    riskLevel: 'HIGH',
    deviceFingerprint: 'dev-untrusted-tor-node-0x99',
    isSimulatedAttack: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbStore.transactions.set(txnId, transaction);
  dbStore.riskAssessments.set(txnId, assessment);

  // Create High-Severity Security Alert in SOC
  const secEvt = {
    id: `SEC-EVT-${Date.now().toString().slice(-5)}`,
    timestamp: new Date().toISOString(),
    organizationId: org.id,
    transactionId: txnId,
    title: `🚨 HIGH-RISK TRANSACTION DETECTED (${currency} ${amount.toLocaleString()})`,
    severity: 'HIGH' as const,
    status: 'OPEN' as const,
    riskScore: assessment.riskScore,
    indicators: assessment.reasons,
    recommendedAction: assessment.recommendedAction
  };
  dbStore.securityEvents.set(secEvt.id, secEvt);

  // Cryptographic audit log entry
  const auditLog = guardiumService.createChainedAuditEntry({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    organizationId: org.id,
    eventType: 'SUSPICIOUS_ACTIVITY_DETECTED',
    resource: `/api/payments/${txnId}`,
    action: 'DEMO_SUSPICIOUS_PAYMENT_SIMULATED',
    result: 'ALERT',
    severity: 'HIGH',
    metadata: {
      transactionId: txnId,
      amount,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      indicators: assessment.reasons,
      aiEngine: assessment.aiEngine,
      aiModel: assessment.aiAssessment?.model,
      aiStatus: assessment.aiAssessment?.status,
      aiExplanation: assessment.aiAssessment?.explanation
    }
  });
  dbStore.auditLogs.push(auditLog);

  res.status(201).json({
    message: 'Suspicious transaction simulated successfully for demonstration',
    transaction,
    assessment,
    securityEvent: secEvt
  });
});

// 9. Hospital / Security SOC Dashboard Metrics
app.get('/api/dashboard/metrics', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const txns = dbStore.getTransactionsForUser(user);

  const totalTransactions = txns.length;
  const approvedTxns = txns.filter(t => t.status === 'APPROVED');
  const flaggedTxns = txns.filter(t => t.status === 'FLAGGED');
  const highRiskTxns = txns.filter(t => t.riskLevel === 'HIGH');
  const todayRevenue = approvedTxns.reduce((sum, t) => sum + t.amount, 0);

  const successRate = totalTransactions > 0 
    ? Math.round((approvedTxns.length / totalTransactions) * 100) 
    : 100;

  // Risk Distribution
  const lowRiskCount = txns.filter(t => t.riskLevel === 'LOW').length;
  const mediumRiskCount = txns.filter(t => t.riskLevel === 'MEDIUM').length;
  const highRiskCount = txns.filter(t => t.riskLevel === 'HIGH').length;

  // Payment Method Breakdown
  const mpesaCount = txns.filter(t => t.paymentMethod === 'MPESA').length;
  const cardCount = txns.filter(t => t.paymentMethod === 'CARD').length;
  const insuranceCount = txns.filter(t => t.paymentMethod === 'INSURANCE_COPAY').length;

  // AI-Assessed metrics
  const assessments = txns.map(t => dbStore.riskAssessments.get(t.id)).filter(Boolean);
  const aiAssessedCount = assessments.filter(a => a?.aiAssessment).length;
  const deterministicOverridesCount = assessments.filter(a => a?.deterministicOverridesAi).length;

  res.json({
    totalTransactions,
    todayRevenue,
    flaggedCount: flaggedTxns.length,
    highRiskCount: highRiskTxns.length,
    successRate,
    riskDistribution: [
      { name: 'Low Risk (0-29)', count: lowRiskCount, color: '#10b981' },
      { name: 'Medium Risk (30-69)', count: mediumRiskCount, color: '#f59e0b' },
      { name: 'High Risk (70-100)', count: highRiskCount, color: '#ef4444' }
    ],
    paymentMethods: [
      { name: 'M-Pesa', count: mpesaCount, color: '#059669' },
      { name: 'Credit/Debit Card', count: cardCount, color: '#3b82f6' },
      { name: 'Insurance Co-pay', count: insuranceCount, color: '#8b5cf6' }
    ],
    aiMetrics: {
      aiAssessedCount,
      deterministicOverridesCount,
      watsonxStatus: watsonxService.getStatusSummary()
    },
    gatewayStatus: apiConnectGateway.getGatewayInfo()
  });
});

// 10. Security Events & Alert Management
app.get('/api/security/events', authenticateToken, requireRoles('PROVIDER', 'SECURITY_ADMIN'), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const events = dbStore.getSecurityEventsForUser(user);
  res.json(events);
});

app.post('/api/security/events/:id/resolve', authenticateToken, requireRoles('PROVIDER', 'SECURITY_ADMIN'), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const event = dbStore.securityEvents.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Security event not found' });
  }

  // Tenant check
  if (user.role === 'PROVIDER' && event.organizationId !== user.organizationId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { notes } = req.body;
  event.status = 'RESOLVED';
  event.investigatedBy = user.fullName;
  event.investigationNotes = notes || 'Reviewed and cleared by security officer.';
  event.resolvedAt = new Date().toISOString();

  // If there's an associated transaction, update its status
  if (event.transactionId) {
    const txn = dbStore.transactions.get(event.transactionId);
    if (txn) {
      txn.status = 'RESOLVED';
      txn.resolvedBy = user.fullName;
      txn.resolutionNotes = event.investigationNotes;
      txn.resolvedAt = event.resolvedAt;
    }
  }

  // Audit log
  const audit = guardiumService.createChainedAuditEntry({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    organizationId: event.organizationId,
    eventType: 'SUSPICIOUS_ACTIVITY_DETECTED',
    resource: `/api/security/events/${event.id}`,
    action: 'RESOLVE_SECURITY_INCIDENT',
    result: 'SUCCESS',
    severity: 'MEDIUM',
    metadata: { eventId: event.id, notes }
  });
  dbStore.auditLogs.push(audit);

  res.json({ message: 'Security alert successfully marked as resolved', event });
});

// 11. IBM Guardium Chained Audit Logs (Tamper Evident)
app.get('/api/audit-logs', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const logs = dbStore.getAuditLogsForUser(user);
  const chainIntegrity = guardiumService.verifyAuditChain(dbStore.auditLogs);

  res.json({
    chainIntegrity,
    logs: logs.slice(0, 100) // Top 100 recent events
  });
});

// 12. Privacy Center & Patient Consent (Kenya DPA 2019)
app.get('/api/privacy/consent', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const patientId = user.patientId || 'pat-demo-01';
  const consents = Array.from(dbStore.consents.values()).filter(c => c.patientId === patientId);

  res.json({
    patientId,
    framework: 'Kenya Data Protection Act (DPA 2019) & OWASP Healthcare Security Guidelines',
    consents
  });
});

app.post('/api/privacy/consent', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { consentId, granted } = req.body;
  const consent = dbStore.consents.get(consentId);
  if (!consent) {
    return res.status(404).json({ error: 'Consent directive record not found' });
  }

  consent.granted = !!granted;
  consent.grantedAt = new Date().toISOString();

  // Audit consent modification
  const audit = guardiumService.createChainedAuditEntry({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    eventType: consent.granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
    resource: `/api/privacy/consent/${consentId}`,
    action: 'UPDATE_PRIVACY_PREFERENCE',
    result: 'SUCCESS',
    severity: 'LOW',
    metadata: { consentId, purpose: consent.purpose, granted: consent.granted }
  });
  dbStore.auditLogs.push(audit);

  res.json({ message: 'Privacy preferences updated', consent });
});

// 13. API Connect Policy & WAF Metrics (Security Admin)
app.get('/api/security/policies', authenticateToken, requireRoles('SECURITY_ADMIN'), (req, res) => {
  res.json({
    gateway: apiConnectGateway.getGatewayInfo(),
    metrics: apiConnectGateway.getPolicyMetrics()
  });
});

// 14. Configurable Risk Engine Thresholds (Security Admin)
app.get('/api/risk/config', authenticateToken, requireRoles('SECURITY_ADMIN'), (req, res) => {
  res.json(riskEngine.getConfig());
});

app.post('/api/risk/config', authenticateToken, requireRoles('SECURITY_ADMIN'), (req: AuthenticatedRequest, res) => {
  riskEngine.updateConfig(req.body);

  const audit = guardiumService.createChainedAuditEntry({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    actorEmail: req.user!.email,
    eventType: 'API_SECURITY_EVENT',
    resource: '/api/risk/config',
    action: 'UPDATE_RISK_THRESHOLDS',
    result: 'SUCCESS',
    severity: 'MEDIUM',
    metadata: req.body
  });
  dbStore.auditLogs.push(audit);

  res.json({ message: 'Risk engine configuration successfully updated', config: riskEngine.getConfig() });
});

// ==========================================
// VITE INTEGRATION & SERVER STARTUP
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SECURE HEALTH PAYMENTS GATEWAY] Running on port ${PORT}`);
    console.log(`[SECURITY LAYER] IBM DataPower & Guardium middleware active`);

    // Section 15: Server Startup Configuration Validation
    const hasApiKey = Boolean(process.env.IBM_CLOUD_API_KEY || process.env.IBM_API_KEY);
    const projectId = process.env.WATSONX_PROJECT_ID || process.env.IBM_PROJECT_ID || 'd37637eb-bcc7-47f6-afa3-dc94e9febae0';
    const watsonxUrl = process.env.WATSONX_URL || process.env.IBM_API_URL || 'https://eu-de.ml.cloud.ibm.com';

    if (hasApiKey) {
      console.log(`[WATSONX.AI CONFIG] Live watsonx.ai configured (Region: eu-de, Project: ${projectId.slice(0, 8)}****, Endpoint: ${watsonxUrl})`);
    } else {
      console.warn(`[WATSONX.AI CONFIG] IBM_CLOUD_API_KEY secret not found in environment. Gateway running with deterministic risk engine and high-fidelity watsonx.ai demo adapter.`);
    }
  });
}

startServer();
