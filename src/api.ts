import { 
  User, 
  Organization, 
  HealthcareService, 
  Transaction, 
  TransactionRiskAssessment, 
  DashboardMetrics, 
  AuditLog, 
  SecurityEvent, 
  ConsentSetting 
} from './types.ts';

const TOKEN_KEY = 'healthpay_auth_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const data = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setStoredToken(data.token);
    return data;
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    return apiRequest<{ user: User }>('/api/auth/me');
  },

  // Directory
  getOrganizations: async (): Promise<Organization[]> => {
    return apiRequest<Organization[]>('/api/organizations');
  },

  getServices: async (organizationId?: string): Promise<HealthcareService[]> => {
    const url = organizationId ? `/api/services?organizationId=${organizationId}` : '/api/services';
    return apiRequest<HealthcareService[]>(url);
  },

  // Payments
  createPayment: async (data: {
    organizationId: string;
    serviceId: string;
    paymentMethod: string;
    phoneNumber?: string;
    cardLastFour?: string;
    clientDevice?: string;
  }): Promise<{
    transaction: Transaction;
    assessment: TransactionRiskAssessment;
    receipt: any;
  }> => {
    return apiRequest('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getTransactions: async (): Promise<Transaction[]> => {
    return apiRequest<Transaction[]>('/api/payments');
  },

  getTransactionDetails: async (id: string): Promise<{
    transaction: Transaction;
    assessment: TransactionRiskAssessment;
  }> => {
    return apiRequest(`/api/payments/${id}`);
  },

  // Demo attack simulation
  simulateSuspiciousTransaction: async (): Promise<{
    message: string;
    transaction: Transaction;
    assessment: TransactionRiskAssessment;
    securityEvent: SecurityEvent;
  }> => {
    return apiRequest('/api/demo/suspicious-transaction', {
      method: 'POST'
    });
  },

  // Metrics & Security
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    return apiRequest<DashboardMetrics>('/api/dashboard/metrics');
  },

  getSecurityEvents: async (): Promise<SecurityEvent[]> => {
    return apiRequest<SecurityEvent[]>('/api/security/events');
  },

  resolveSecurityEvent: async (id: string, notes: string): Promise<{ message: string; event: SecurityEvent }> => {
    return apiRequest(`/api/security/events/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  },

  getAuditLogs: async (): Promise<{
    chainIntegrity: { isValid: boolean; brokenAt?: string; totalVerified: number };
    logs: AuditLog[];
  }> => {
    return apiRequest('/api/audit-logs');
  },

  // Privacy & Consent
  getConsentSettings: async (): Promise<{
    patientId: string;
    framework: string;
    consents: ConsentSetting[];
  }> => {
    return apiRequest('/api/privacy/consent');
  },

  updateConsent: async (consentId: string, granted: boolean): Promise<any> => {
    return apiRequest('/api/privacy/consent', {
      method: 'POST',
      body: JSON.stringify({ consentId, granted })
    });
  },

  // Gateway policies & Risk thresholds
  getSecurityPolicies: async (): Promise<{
    gateway: any;
    metrics: any[];
  }> => {
    return apiRequest('/api/security/policies');
  },

  getRiskConfig: async (): Promise<any> => {
    return apiRequest('/api/risk/config');
  },

  updateRiskConfig: async (config: any): Promise<any> => {
    return apiRequest('/api/risk/config', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }
};
