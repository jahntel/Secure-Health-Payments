import bcrypt from 'bcryptjs';
import { 
  User, 
  Organization, 
  Patient, 
  HealthcareService, 
  Transaction, 
  TransactionRiskAssessment, 
  AuditLog, 
  SecurityEvent, 
  ConsentSetting 
} from './types.ts';
import { guardiumService } from './services/ibmGuardium.ts';
import { riskEngine } from './services/riskEngine.ts';

export class DatabaseStore {
  public users: Map<string, User> = new Map();
  public organizations: Map<string, Organization> = new Map();
  public patients: Map<string, Patient> = new Map();
  public services: Map<string, HealthcareService> = new Map();
  public transactions: Map<string, Transaction> = new Map();
  public riskAssessments: Map<string, TransactionRiskAssessment> = new Map();
  public auditLogs: AuditLog[] = [];
  public securityEvents: Map<string, SecurityEvent> = new Map();
  public consents: Map<string, ConsentSetting> = new Map();

  private isInitialized = false;

  constructor() {
    this.seedDatabase();
  }

  public async seedDatabase() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const demoPassword = process.env.DEMO_PASSWORD || 'DemoSecurePassword2026!';
    const passwordHash = bcrypt.hashSync(demoPassword, 10);

    // 1. Seed Organizations
    const orgs: Organization[] = [
      {
        id: 'org-afyacare',
        name: 'AfyaCare Clinic',
        code: 'AFYA-01',
        type: 'CLINIC',
        county: 'Nairobi',
        country: 'Kenya',
        contactEmail: 'billing@afyacare.co.ke',
        status: 'ACTIVE',
        createdAt: '2025-01-10T08:00:00Z'
      },
      {
        id: 'org-mediplus',
        name: 'MediPlus Hospital',
        code: 'MEDI-02',
        type: 'HOSPITAL',
        county: 'Nairobi',
        country: 'Kenya',
        contactEmail: 'accounts@mediplus.co.ke',
        status: 'ACTIVE',
        createdAt: '2025-02-15T09:00:00Z'
      },
      {
        id: 'org-makueni',
        name: 'Makueni Health Centre',
        code: 'MAKU-03',
        type: 'HEALTH_CENTRE',
        county: 'Makueni',
        country: 'Kenya',
        contactEmail: 'finance@makuenihealth.go.ke',
        status: 'ACTIVE',
        createdAt: '2025-03-01T10:00:00Z'
      }
    ];
    orgs.forEach(o => this.organizations.set(o.id, o));

    // 2. Seed Healthcare Services
    const initialServices: HealthcareService[] = [
      {
        id: 'srv-afya-gen',
        organizationId: 'org-afyacare',
        name: 'General Consultation',
        category: 'CONSULTATION',
        description: 'Standard outpatient consultation with medical officer',
        standardPrice: 1500,
        currency: 'KES',
        isActive: true
      },
      {
        id: 'srv-afya-peds',
        organizationId: 'org-afyacare',
        name: 'Pediatric Assessment',
        category: 'CONSULTATION',
        description: 'Child wellness check, triage, and pediatric consultation',
        standardPrice: 2000,
        currency: 'KES',
        isActive: true
      },
      {
        id: 'srv-afya-lab',
        organizationId: 'org-afyacare',
        name: 'Comprehensive Metabolic Panel & CBC',
        category: 'LAB',
        description: 'Full blood count, lipid profile, liver & kidney function tests',
        standardPrice: 3800,
        currency: 'KES',
        isActive: true
      },
      {
        id: 'srv-afya-dent',
        organizationId: 'org-afyacare',
        name: 'Dental Examination & Scaling',
        category: 'DENTAL',
        description: 'Oral hygiene assessment, deep cleaning and tartar removal',
        standardPrice: 3200,
        currency: 'KES',
        isActive: true
      },
      {
        id: 'srv-medi-spec',
        organizationId: 'org-mediplus',
        name: 'Cardiology Specialist Review',
        category: 'CONSULTATION',
        description: 'Consultant cardiologist examination and ECG assessment',
        standardPrice: 5000,
        currency: 'KES',
        isActive: true
      },
      {
        id: 'srv-medi-mri',
        organizationId: 'org-mediplus',
        name: 'Diagnostic MRI Scan (Single Region)',
        category: 'DIAGNOSTICS',
        description: 'High-resolution magnetic resonance imaging scan with contrast',
        standardPrice: 24000,
        currency: 'KES',
        isActive: true
      },
      {
        id: 'srv-medi-emerg',
        organizationId: 'org-mediplus',
        name: 'Emergency Trauma Triage & Stabilization',
        category: 'EMERGENCY',
        description: 'Acute emergency room admission and critical care stabilization',
        standardPrice: 12500,
        currency: 'KES',
        isActive: true
      },
      {
        id: 'srv-maku-mch',
        organizationId: 'org-makueni',
        name: 'Maternal & Child Health Clinic',
        category: 'CONSULTATION',
        description: 'Antenatal care package, ultrasound screening, nutritional guidance',
        standardPrice: 800,
        currency: 'KES',
        isActive: true
      },
      {
        id: 'srv-maku-imms',
        organizationId: 'org-makueni',
        name: 'Routine Immunization & Vaccine Administration',
        category: 'CONSULTATION',
        description: 'KEPI childhood vaccine schedule and documentation',
        standardPrice: 500,
        currency: 'KES',
        isActive: true
      },
      {
        id: 'srv-maku-pharm',
        organizationId: 'org-makueni',
        name: 'Essential Outpatient Pharmacy Dispensation',
        category: 'PHARMACY',
        description: 'Prescription antibiotics, analgesics, and antimalarials',
        standardPrice: 1200,
        currency: 'KES',
        isActive: true
      }
    ];
    initialServices.forEach(s => this.services.set(s.id, s));

    // 3. Seed Primary Demo Accounts
    const demoPatientUser: User = {
      id: 'usr-demo-patient',
      email: 'demo.patient@example.com',
      passwordHash,
      fullName: 'Faith Wanjiku Kimani',
      role: 'PATIENT',
      patientId: 'pat-demo-01',
      phoneNumber: '+254712345678',
      createdAt: '2025-01-15T08:30:00Z'
    };
    this.users.set(demoPatientUser.id, demoPatientUser);

    const demoPatient: Patient = {
      id: 'pat-demo-01',
      userId: demoPatientUser.id,
      patientReference: 'PAT-8492-4821',
      fullNameMasked: guardiumService.maskName(demoPatientUser.fullName),
      maskedPhone: guardiumService.maskPhone(demoPatientUser.phoneNumber!),
      gender: 'F',
      county: 'Nairobi',
      riskBaseline: {
        avgTransactionAmount: 1800,
        knownDeviceFingerprints: ['dev-mac-safari-faith-01', 'dev-iphone-15-faith-02'],
        typicalHourRange: [8, 19]
      },
      createdAt: '2025-01-15T08:30:00Z'
    };
    this.patients.set(demoPatient.id, demoPatient);

    const demoProviderUser: User = {
      id: 'usr-demo-provider',
      email: 'demo.provider@example.com',
      passwordHash,
      fullName: 'Dr. Kevin Ochieng',
      role: 'PROVIDER',
      organizationId: 'org-afyacare',
      phoneNumber: '+254722990011',
      createdAt: '2025-01-10T09:00:00Z'
    };
    this.users.set(demoProviderUser.id, demoProviderUser);

    const demoAdminUser: User = {
      id: 'usr-demo-admin',
      email: 'demo.admin@example.com',
      passwordHash,
      fullName: 'Amina Noor (CISO)',
      role: 'SECURITY_ADMIN',
      phoneNumber: '+254733445566',
      createdAt: '2025-01-01T00:00:00Z'
    };
    this.users.set(demoAdminUser.id, demoAdminUser);

    // 4. Seed 20+ Realistic Patients
    const patientNames = [
      { name: 'David Mutua', phone: '+254721456789', gender: 'M' as const, county: 'Machakos', baseline: 1500 },
      { name: 'Grace Muthoni', phone: '+254734567890', gender: 'F' as const, county: 'Kiambu', baseline: 2500 },
      { name: 'Peter Kiprono', phone: '+254711223344', gender: 'M' as const, county: 'Uasin Gishu', baseline: 1800 },
      { name: 'Mercy Akinyi', phone: '+254720998877', gender: 'F' as const, county: 'Kisumu', baseline: 3200 },
      { name: 'Brian Omondi', phone: '+254799881122', gender: 'M' as const, county: 'Nairobi', baseline: 2000 },
      { name: 'Esther Njeri', phone: '+254701234567', gender: 'F' as const, county: 'Nakuru', baseline: 1600 },
      { name: 'Hassan Ali', phone: '+254722334455', gender: 'M' as const, county: 'Mombasa', baseline: 4000 },
      { name: 'Beatrice Chebet', phone: '+254733112233', gender: 'F' as const, county: 'Kericho', baseline: 1400 },
      { name: 'Samuel Ndung\'u', phone: '+254712994455', gender: 'M' as const, county: 'Murang\'a', baseline: 2100 },
      { name: 'Joyce Moraa', phone: '+254728776655', gender: 'F' as const, county: 'Kisii', baseline: 1750 },
      { name: 'Emmanuel Barasa', phone: '+254791334455', gender: 'M' as const, county: 'Bungoma', baseline: 1900 },
      { name: 'Lydia Wambui', phone: '+254725667788', gender: 'F' as const, county: 'Nyeri', baseline: 2800 },
      { name: 'Victor Korir', phone: '+254715443322', gender: 'M' as const, county: 'Bomet', baseline: 1500 },
      { name: 'Jane Achieng', phone: '+254708112233', gender: 'F' as const, county: 'Siaya', baseline: 2200 },
      { name: 'Titus Mutiso', phone: '+254724998811', gender: 'M' as const, county: 'Makueni', baseline: 1100 },
      { name: 'Gladys Cherono', phone: '+254736554433', gender: 'F' as const, county: 'Nandi', baseline: 1600 },
      { name: 'Moses Kamau', phone: '+254718223344', gender: 'M' as const, county: 'Kajiado', baseline: 3500 },
      { name: 'Ruth Nyaboke', phone: '+254729445566', gender: 'F' as const, county: 'Nyamira', baseline: 1950 },
      { name: 'Dennis Munene', phone: '+254705667788', gender: 'M' as const, county: 'Embu', baseline: 2300 },
      { name: 'Agnes Mumbua', phone: '+254723119988', gender: 'F' as const, county: 'Kitui', baseline: 1200 }
    ];

    patientNames.forEach((item, index) => {
      const pId = `pat-${String(index + 2).padStart(3, '0')}`;
      const uId = `usr-pat-${String(index + 2).padStart(3, '0')}`;
      const email = `patient.${item.name.toLowerCase().replace(/[^a-z]/g, '')}@example.com`;

      const user: User = {
        id: uId,
        email,
        passwordHash,
        fullName: item.name,
        role: 'PATIENT',
        patientId: pId,
        phoneNumber: item.phone,
        createdAt: '2025-01-20T10:00:00Z'
      };
      this.users.set(uId, user);

      const patient: Patient = {
        id: pId,
        userId: uId,
        patientReference: guardiumService.generatePatientReference(),
        fullNameMasked: guardiumService.maskName(item.name),
        maskedPhone: guardiumService.maskPhone(item.phone),
        gender: item.gender,
        county: item.county,
        riskBaseline: {
          avgTransactionAmount: item.baseline,
          knownDeviceFingerprints: [`dev-${pId}-primary-mobile`],
          typicalHourRange: [7, 20]
        },
        createdAt: '2025-01-20T10:00:00Z'
      };
      this.patients.set(pId, patient);

      // Seed Consents for this patient (Kenya DPA 2019)
      const consents: ConsentSetting[] = [
        {
          id: `cst-${pId}-01`,
          patientId: pId,
          purpose: 'Payment Settlement & Bank Reconciliation',
          category: 'ESSENTIAL_FINANCIAL',
          granted: true,
          grantedAt: '2025-01-20T10:05:00Z',
          legalBasis: 'Performance of Contract (DPA 2019 Sec 30(1)(b))',
          retentionPeriod: '7 Years (Financial Audit Requirement)'
        },
        {
          id: `cst-${pId}-02`,
          patientId: pId,
          purpose: 'Fraud Prevention & Risk Telemetry Analysis',
          category: 'SECURITY_MONITORING',
          granted: true,
          grantedAt: '2025-01-20T10:05:00Z',
          legalBasis: 'Legitimate Interest & Threat Defense (DPA 2019 Sec 30(1)(f))',
          retentionPeriod: '2 Years Rolling'
        },
        {
          id: `cst-${pId}-03`,
          patientId: pId,
          purpose: 'SHA-256 Tamper-Evident Security Audit Logs',
          category: 'REGULATORY_COMPLIANCE',
          granted: true,
          grantedAt: '2025-01-20T10:05:00Z',
          legalBasis: 'Legal Obligation (DPA 2019 Sec 30(1)(c))',
          retentionPeriod: '10 Years Immutable'
        }
      ];
      consents.forEach(c => this.consents.set(c.id, c));
    });

    // Seed Consents for demo patient
    [
      {
        id: `cst-pat-demo-01-01`,
        patientId: 'pat-demo-01',
        purpose: 'Payment Settlement & Bank Reconciliation',
        category: 'ESSENTIAL_FINANCIAL',
        granted: true,
        grantedAt: '2025-01-15T08:35:00Z',
        legalBasis: 'Performance of Contract (DPA 2019 Sec 30(1)(b))',
        retentionPeriod: '7 Years (Financial Audit Requirement)'
      },
      {
        id: `cst-pat-demo-01-02`,
        patientId: 'pat-demo-01',
        purpose: 'Fraud Prevention & Real-time Risk Analysis',
        category: 'SECURITY_MONITORING',
        granted: true,
        grantedAt: '2025-01-15T08:35:00Z',
        legalBasis: 'Legitimate Interest & Threat Defense',
        retentionPeriod: '2 Years Rolling'
      },
      {
        id: `cst-pat-demo-01-03`,
        patientId: 'pat-demo-01',
        purpose: 'Immutable SHA-256 Audit Trail (IBM Guardium Standard)',
        category: 'REGULATORY_COMPLIANCE',
        granted: true,
        grantedAt: '2025-01-15T08:35:00Z',
        legalBasis: 'Legal Obligation',
        retentionPeriod: '10 Years'
      }
    ].forEach(c => this.consents.set(c.id, c));

    // 5. Seed 10+ Healthcare Providers
    const providersList = [
      { name: 'Dr. Sarah Mutuku', org: 'org-afyacare', email: 's.mutuku@afyacare.co.ke' },
      { name: 'Dr. Bernard Wanyama', org: 'org-afyacare', email: 'b.wanyama@afyacare.co.ke' },
      { name: 'Nurse Mary Chepkoech', org: 'org-afyacare', email: 'm.chepkoech@afyacare.co.ke' },
      { name: 'Dr. Patricia Nduta', org: 'org-mediplus', email: 'p.nduta@mediplus.co.ke' },
      { name: 'Dr. Ahmed Hussein', org: 'org-mediplus', email: 'a.hussein@mediplus.co.ke' },
      { name: 'Dr. Christine Atieno', org: 'org-mediplus', email: 'c.atieno@mediplus.co.ke' },
      { name: 'Dr. Geoffrey Kioko', org: 'org-mediplus', email: 'g.kioko@mediplus.co.ke' },
      { name: 'Clinical Officer Daniel Musyoka', org: 'org-makueni', email: 'd.musyoka@makuenihealth.go.ke' },
      { name: 'Nurse Mercy Katuku', org: 'org-makueni', email: 'm.katuku@makuenihealth.go.ke' },
      { name: 'Dr. Samuel Mutinda', org: 'org-makueni', email: 's.mutinda@makuenihealth.go.ke' }
    ];

    providersList.forEach((p, idx) => {
      const uId = `usr-prov-${idx + 2}`;
      const user: User = {
        id: uId,
        email: p.email,
        passwordHash,
        fullName: p.name,
        role: 'PROVIDER',
        organizationId: p.org,
        createdAt: '2025-01-12T09:00:00Z'
      };
      this.users.set(uId, user);
    });

    // 6. Seed 50+ Historical Transactions
    const allPatientIds = Array.from(this.patients.keys());
    const serviceList = Array.from(this.services.values());

    for (let i = 1; i <= 52; i++) {
      const txnId = `TXN-2026-${String(i).padStart(6, '0')}`;
      const isDemoPatient = i % 5 === 0;
      const patientId = isDemoPatient ? 'pat-demo-01' : allPatientIds[i % allPatientIds.length];
      const patient = this.patients.get(patientId)!;
      
      // Determine organization and service
      const orgId = i % 3 === 0 ? 'org-mediplus' : (i % 3 === 1 ? 'org-afyacare' : 'org-makueni');
      const orgServices = serviceList.filter(s => s.organizationId === orgId);
      const service = orgServices[i % orgServices.length];

      // Payment method
      const pMethod = i % 4 === 0 ? 'CARD' : (i % 6 === 0 ? 'INSURANCE_COPAY' : 'MPESA');
      const paymentRef = pMethod === 'MPESA' 
        ? `MPESA-DEMO-${840000 + i}` 
        : (pMethod === 'CARD' ? `CARD-AUTH-${990000 + i}` : `INS-COPAY-${770000 + i}`);

      // Risk profiling for varied data (mostly low, some medium, a few high)
      let riskScore = 10 + (i * 3) % 25; // 10 - 35
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      let status: Transaction['status'] = 'APPROVED';
      let isSimulated = false;

      // Seed 5 Medium Risk transactions
      if (i === 14 || i === 28 || i === 41 || i === 48) {
        riskScore = 52 + (i % 12);
        riskLevel = 'MEDIUM';
        status = 'FLAGGED';
      }

      // Seed 3 High Risk transactions (anomalies)
      if (i === 19 || i === 37) {
        riskScore = 84 + (i % 6);
        riskLevel = 'HIGH';
        status = 'QUARANTINED';
      } else if (i === 50) {
        riskScore = 78;
        riskLevel = 'HIGH';
        status = 'RESOLVED';
      }

      const amount = (riskLevel === 'HIGH' && i === 19) ? 68000 : service.standardPrice;
      const daysAgo = Math.floor((52 - i) / 2);
      const createdDate = new Date(Date.now() - (daysAgo * 86400000) - (i * 1234567));
      const createdAt = createdDate.toISOString();

      const txn: Transaction = {
        id: txnId,
        organizationId: orgId,
        patientId,
        patientReference: patient.patientReference,
        serviceId: service.id,
        serviceName: service.name,
        amount,
        currency: 'KES',
        paymentMethod: pMethod,
        paymentReference: paymentRef,
        phoneNumberMasked: patient.maskedPhone,
        cardLastFour: pMethod === 'CARD' ? '4182' : undefined,
        status,
        riskScore,
        riskLevel,
        deviceFingerprint: riskLevel === 'HIGH' ? 'dev-untrusted-tor-node' : (patient.riskBaseline.knownDeviceFingerprints[0] || 'dev-trusted-mobile'),
        isSimulatedAttack: isSimulated,
        resolutionNotes: status === 'RESOLVED' ? 'Verified patient identity with biometric OTP. Cleared by CISO.' : undefined,
        resolvedBy: status === 'RESOLVED' ? 'Amina Noor (CISO)' : undefined,
        resolvedAt: status === 'RESOLVED' ? new Date(createdDate.getTime() + 7200000).toISOString() : undefined,
        createdAt,
        updatedAt: createdAt
      };
      this.transactions.set(txnId, txn);

      // Create Risk Assessment
      const assessment: TransactionRiskAssessment = {
        id: `RSK-2026-${String(i).padStart(6, '0')}`,
        transactionId: txnId,
        riskScore,
        riskLevel,
        reasons: riskLevel === 'HIGH' 
          ? [
              'Transaction amount is 3,700% higher than historical patient baseline',
              'Unrecognized hardware device signature with altered user-agent',
              '3 repeated failed credentials within 2 minutes prior'
            ]
          : (riskLevel === 'MEDIUM' 
              ? ['Moderate velocity variance detected for service type', 'Transaction initiated from newly added secondary phone line']
              : ['All telemetry parameters match normal historical patient profile']),
        factors: [
          {
            signal: 'AMOUNT_VARIANCE',
            points: riskLevel === 'HIGH' ? 30 : (riskLevel === 'MEDIUM' ? 15 : 0),
            maxPoints: 30,
            description: `Amount evaluated against historical baseline`,
            anomalyDetected: riskLevel !== 'LOW'
          },
          {
            signal: 'DEVICE_REPUTATION',
            points: riskLevel === 'HIGH' ? 18 : 0,
            maxPoints: 18,
            description: `Hardware fingerprint check`,
            anomalyDetected: riskLevel === 'HIGH'
          }
        ],
        recommendedAction: riskLevel === 'HIGH'
          ? 'Quarantined: Additional biometric or in-person verification required before disbursement.'
          : (riskLevel === 'MEDIUM' ? 'Review: Secondary SMS verification sent.' : 'Approved: Transaction cleared.'),
        aiEngine: 'LOCAL_RULE_ENGINE',
        aiEngineDetails: 'Deterministic Security Feature Engine (Local mode — transparent scoring model)',
        evaluatedAt: createdAt
      };
      this.riskAssessments.set(txnId, assessment);

      // Create Security Event for High & Medium risk transactions
      if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
        const secEvt: SecurityEvent = {
          id: `SEC-EVT-${String(i).padStart(5, '0')}`,
          timestamp: createdAt,
          organizationId: orgId,
          transactionId: txnId,
          title: riskLevel === 'HIGH' 
            ? `🚨 High-Risk Payment Anomaly (${amount.toLocaleString()} KES)`
            : `⚠️ Elevated Risk Payment Flagged (${amount.toLocaleString()} KES)`,
          severity: riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
          status: status === 'RESOLVED' ? 'RESOLVED' : 'OPEN',
          riskScore,
          indicators: assessment.reasons,
          recommendedAction: assessment.recommendedAction,
          investigatedBy: status === 'RESOLVED' ? 'Amina Noor (CISO)' : undefined,
          investigationNotes: status === 'RESOLVED' ? 'Contacted patient via secured emergency contact; confirmed valid payment.' : undefined,
          resolvedAt: status === 'RESOLVED' ? new Date(createdDate.getTime() + 7200000).toISOString() : undefined
        };
        this.securityEvents.set(secEvt.id, secEvt);
      }

      // Create Cryptographically Chained Guardium Audit Log
      const auditLog = guardiumService.createChainedAuditEntry({
        actorId: patient.userId,
        actorRole: 'PATIENT',
        actorEmail: `patient-${patient.patientReference}@privacy-protected.org`,
        organizationId: orgId,
        eventType: riskLevel === 'HIGH' ? 'PAYMENT_QUARANTINED' : (riskLevel === 'MEDIUM' ? 'PAYMENT_FLAGGED' : 'PAYMENT_APPROVED'),
        resource: `/api/payments/${txnId}`,
        action: 'EXECUTE_PAYMENT_TRANSACTION',
        result: riskLevel === 'HIGH' ? 'ALERT' : (riskLevel === 'MEDIUM' ? 'WARNING' : 'SUCCESS'),
        severity: riskLevel === 'HIGH' ? 'HIGH' : (riskLevel === 'MEDIUM' ? 'MEDIUM' : 'INFO'),
        metadata: {
          transactionId: txnId,
          amount,
          currency: 'KES',
          riskScore,
          riskLevel,
          serviceName: service.name,
          paymentMethod: pMethod
        },
        customTimestamp: createdAt
      });
      this.auditLogs.push(auditLog);
    }
  }

  // --- Multi-Tenant Query Helpers ---

  /**
   * Enforces server-side tenant isolation:
   * - PATIENT can only see their own transactions.
   * - PROVIDER can only see transactions matching their organizationId.
   * - SECURITY_ADMIN can see all transactions.
   */
  public getTransactionsForUser(user: User): Transaction[] {
    const all = Array.from(this.transactions.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (user.role === 'SECURITY_ADMIN') {
      return all;
    }

    if (user.role === 'PROVIDER') {
      if (!user.organizationId) return [];
      return all.filter(t => t.organizationId === user.organizationId);
    }

    if (user.role === 'PATIENT') {
      if (!user.patientId) return [];
      return all.filter(t => t.patientId === user.patientId);
    }

    return [];
  }

  public getTransactionById(id: string, user: User): Transaction | null {
    const txn = this.transactions.get(id);
    if (!txn) return null;

    // Authorization check
    if (user.role === 'SECURITY_ADMIN') return txn;
    if (user.role === 'PROVIDER' && txn.organizationId === user.organizationId) return txn;
    if (user.role === 'PATIENT' && txn.patientId === user.patientId) return txn;

    return null; // Forbidden
  }

  public getAuditLogsForUser(user: User): AuditLog[] {
    const logs = [...this.auditLogs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (user.role === 'SECURITY_ADMIN') {
      return logs;
    }

    if (user.role === 'PROVIDER') {
      if (!user.organizationId) return [];
      return logs.filter(l => l.organizationId === user.organizationId);
    }

    if (user.role === 'PATIENT') {
      return logs.filter(l => l.actorId === user.id);
    }

    return [];
  }

  public getSecurityEventsForUser(user: User): SecurityEvent[] {
    const events = Array.from(this.securityEvents.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (user.role === 'SECURITY_ADMIN') {
      return events;
    }

    if (user.role === 'PROVIDER') {
      if (!user.organizationId) return [];
      return events.filter(e => e.organizationId === user.organizationId);
    }

    return []; // Patients do not view SOC security events
  }
}

export const dbStore = new DatabaseStore();
