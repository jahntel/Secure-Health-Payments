/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * IBM watsonx.ai Risk Analysis Service
 * 
 * Integrates IBM Cloud IAM authentication and watsonx.ai Granite foundation models
 * for explainable healthcare payment transaction risk analysis.
 * 
 * Designed with:
 * - Server-side only execution (Credentials NEVER exposed to client)
 * - Safe IAM bearer token caching with automatic expiry refresh
 * - Strict PII sanitization (Data Minimization per Kenya DPA 2019)
 * - Schema validation of structured AI output
 * - Resilient timeout & safe fallback handling
 */

export interface SanitizedRiskInput {
  transactionId: string;
  amount: number;
  currency: string;
  patientReference: string; // Tokenized e.g. PAT-8492-4821
  serviceCategory?: string;
  amountToHistoricalRatio: number;
  recentFailedAttemptsCount: number;
  velocityLastHourCount: number;
  isUntrustedOrNewDevice: boolean;
  hourOfDayUtc: number;
  deterministicScore: number;
  deterministicSignals: string[];
}

export interface WatsonxStructuredResponse {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_score: number;
  signals: string[];
  explanation: string;
  recommended_action: 'ALLOW' | 'REVIEW' | 'BLOCK';
}

export interface WatsonxAnalysisResult {
  success: boolean;
  data?: WatsonxStructuredResponse;
  model: string;
  region: string;
  latencyMs: number;
  failureReason?: string;
}

export class WatsonxRiskAnalysisService {
  private static instance: WatsonxRiskAnalysisService;

  // Cached IAM Token state
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private refreshPromise: Promise<string> | null = null;

  // Default configuration
  public readonly defaultProjectId = 'd37637eb-bcc7-47f6-afa3-dc94e9febae0';
  public readonly defaultUrl = 'https://eu-de.ml.cloud.ibm.com';
  public readonly defaultRegion = 'eu-de';
  public readonly modelId = 'ibm/granite-13b-chat-v2';

  private constructor() {}

  public static getInstance(): WatsonxRiskAnalysisService {
    if (!WatsonxRiskAnalysisService.instance) {
      WatsonxRiskAnalysisService.instance = new WatsonxRiskAnalysisService();
    }
    return WatsonxRiskAnalysisService.instance;
  }

  /**
   * Retrieves the configured IBM Cloud API Key from environment variables.
   * Never exposed to frontend or client responses.
   */
  private getApiKey(): string | null {
    return process.env.IBM_CLOUD_API_KEY || process.env.IBM_API_KEY || null;
  }

  public getProjectId(): string {
    return process.env.WATSONX_PROJECT_ID || process.env.IBM_PROJECT_ID || this.defaultProjectId;
  }

  public getWatsonxUrl(): string {
    return process.env.WATSONX_URL || process.env.IBM_API_URL || this.defaultUrl;
  }

  public getRegion(): string {
    const url = this.getWatsonxUrl();
    if (url.includes('eu-de')) return 'eu-de';
    if (url.includes('us-south')) return 'us-south';
    if (url.includes('jp-tok')) return 'jp-tok';
    if (url.includes('au-syd')) return 'au-syd';
    return this.defaultRegion;
  }

  /**
   * Check if IBM watsonx.ai live service is configured
   */
  public isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 0);
  }

  /**
   * Safe status summary for logging/diagnostics without leaking secrets
   */
  public getStatusSummary(): {
    configured: boolean;
    projectId: string;
    endpoint: string;
    region: string;
    model: string;
    tokenCached: boolean;
    tokenExpiresInSeconds?: number;
  } {
    const now = Date.now();
    const tokenValid = Boolean(this.cachedToken && this.tokenExpiresAt > now);
    return {
      configured: this.isConfigured(),
      projectId: this.getProjectId().replace(/^(.{6})(.*)(.{4})$/, '$1****$3'),
      endpoint: this.getWatsonxUrl(),
      region: this.getRegion(),
      model: this.modelId,
      tokenCached: tokenValid,
      tokenExpiresInSeconds: tokenValid ? Math.max(0, Math.round((this.tokenExpiresAt - now) / 1000)) : undefined
    };
  }

  /**
   * Obtains a valid IAM Bearer Token using the IBM Cloud API key.
   * Implements secure caching so that a new token is not requested on every transaction.
   */
  public async getIamBearerToken(): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('IBM_CLOUD_API_KEY is not configured in the environment');
    }

    const now = Date.now();
    // Use cached token if valid with at least 5 minutes (300,000 ms) safety buffer
    if (this.cachedToken && this.tokenExpiresAt - now > 300_000) {
      return this.cachedToken;
    }

    // Prevent concurrent redundant refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const tokenEndpoint = 'https://iam.cloud.ibm.com/identity/token';
        const params = new URLSearchParams();
        params.append('grant_type', 'urn:ibm:params:oauth:grant-type:apikey');
        params.append('apikey', apiKey);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: params.toString(),
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (!res.ok) {
          const errStatus = res.status;
          throw new Error(`IBM IAM authentication failed with HTTP ${errStatus}`);
        }

        const data = await res.json();
        if (!data.access_token) {
          throw new Error('IBM IAM response missing access_token');
        }

        const token: string = String(data.access_token);
        this.cachedToken = token;
        // data.expiration is unix epoch seconds or use data.expires_in
        if (data.expiration) {
          this.tokenExpiresAt = data.expiration * 1000;
        } else if (data.expires_in) {
          this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
        } else {
          this.tokenExpiresAt = Date.now() + (3600 * 1000); // 1 hour default
        }

        return token;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise!;
  }

  /**
   * Data Sanitization: Removes all PII, passwords, card numbers, and raw diagnosis text.
   * Produces a minimal, privacy-compliant input payload for AI risk telemetry evaluation.
   */
  public sanitizeRiskAnalysisInput(raw: {
    transactionId: string;
    amount: number;
    currency: string;
    patientReference: string;
    serviceCategory?: string;
    patientHistoricalAvgAmount?: number;
    recentFailedAttemptsCount?: number;
    recentTransactionsCountLastHour?: number;
    isUntrustedOrNewDevice?: boolean;
    hourOfDayUtc?: number;
    deterministicScore?: number;
    deterministicSignals?: string[];
  }): SanitizedRiskInput {
    const historicalAvg = Math.max(1, raw.patientHistoricalAvgAmount || 2000);
    const ratio = Math.round((raw.amount / historicalAvg) * 100) / 100;

    return {
      transactionId: raw.transactionId,
      amount: Number(raw.amount) || 0,
      currency: raw.currency || 'KES',
      patientReference: raw.patientReference, // Tokenized pseudonym, e.g. PAT-8492-4821
      serviceCategory: raw.serviceCategory || 'CONSULTATION',
      amountToHistoricalRatio: ratio,
      recentFailedAttemptsCount: Math.max(0, raw.recentFailedAttemptsCount || 0),
      velocityLastHourCount: Math.max(0, raw.recentTransactionsCountLastHour || 0),
      isUntrustedOrNewDevice: Boolean(raw.isUntrustedOrNewDevice),
      hourOfDayUtc: typeof raw.hourOfDayUtc === 'number' ? raw.hourOfDayUtc : new Date().getUTCHours(),
      deterministicScore: Math.max(0, Math.min(100, raw.deterministicScore || 0)),
      deterministicSignals: Array.isArray(raw.deterministicSignals) 
        ? raw.deterministicSignals.map(s => String(s).slice(0, 120))
        : []
    };
  }

  /**
   * Strictly validates the structure of the AI response JSON.
   */
  public validateStructuredResponse(parsed: any): WatsonxStructuredResponse {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('AI response is not an object');
    }

    const validLevels = ['LOW', 'MEDIUM', 'HIGH'];
    const validActions = ['ALLOW', 'REVIEW', 'BLOCK'];

    const risk_level = String(parsed.risk_level || '').toUpperCase().trim();
    if (!validLevels.includes(risk_level)) {
      throw new Error(`Invalid risk_level in AI response: ${parsed.risk_level}`);
    }

    const rawScore = Number(parsed.risk_score);
    if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > 100) {
      throw new Error(`Invalid risk_score in AI response: ${parsed.risk_score}`);
    }
    const risk_score = Math.round(rawScore);

    let signals: string[] = [];
    if (Array.isArray(parsed.signals)) {
      signals = (parsed.signals as any[]).map((s: any) => String(s).trim()).filter(Boolean);
    }
    if (signals.length === 0) {
      signals = ['Contextual pattern matches expected healthcare settlement profile'];
    }

    const explanation = typeof parsed.explanation === 'string' && parsed.explanation.trim().length > 0
      ? parsed.explanation.trim()
      : 'Telemetry evaluation completed based on patient baseline and transaction characteristics.';

    const rawAction = String(parsed.recommended_action || '').toUpperCase().trim();
    let recommended_action: 'ALLOW' | 'REVIEW' | 'BLOCK' = 'ALLOW';
    if (validActions.includes(rawAction)) {
      recommended_action = rawAction as 'ALLOW' | 'REVIEW' | 'BLOCK';
    } else {
      recommended_action = risk_level === 'HIGH' ? 'BLOCK' : (risk_level === 'MEDIUM' ? 'REVIEW' : 'ALLOW');
    }

    return {
      risk_level: risk_level as 'LOW' | 'MEDIUM' | 'HIGH',
      risk_score,
      signals,
      explanation,
      recommended_action
    };
  }

  /**
   * Invokes watsonx.ai Granite model to perform contextual healthcare payment risk analysis.
   */
  public async analyzePaymentWithWatsonx(
    sanitizedInput: SanitizedRiskInput
  ): Promise<WatsonxAnalysisResult> {
    const startTime = Date.now();
    const region = this.getRegion();
    const endpoint = this.getWatsonxUrl();
    const projectId = this.getProjectId();

    try {
      const token = await this.getIamBearerToken();

      const prompt = `You are IBM watsonx.ai Healthcare Payment Security Analyst.
Evaluate this sanitized healthcare transaction telemetry and detect contextual risk indicators or account anomalies:

Transaction ID: ${sanitizedInput.transactionId}
Billed Amount: ${sanitizedInput.currency} ${sanitizedInput.amount}
Amount Ratio to Patient Historical Baseline: ${sanitizedInput.amountToHistoricalRatio}x
Service Category: ${sanitizedInput.serviceCategory}
Patient Pseudonym: ${sanitizedInput.patientReference}
Unrecognized / New Device: ${sanitizedInput.isUntrustedOrNewDevice ? 'YES' : 'NO'}
Recent Failed Verification Attempts: ${sanitizedInput.recentFailedAttemptsCount}
Recent Hourly Velocity: ${sanitizedInput.velocityLastHourCount} transactions
Hour (UTC): ${sanitizedInput.hourOfDayUtc}:00
Deterministic Rules Baseline Score: ${sanitizedInput.deterministicScore}/100
Deterministic Signals: ${sanitizedInput.deterministicSignals.join(', ') || 'None'}

Return ONLY a valid JSON object matching this exact schema:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "risk_score": integer between 0 and 100,
  "signals": ["brief string description of signal 1", "signal 2"],
  "explanation": "Clear, professional explanation of the contextual assessment",
  "recommended_action": "ALLOW" | "REVIEW" | "BLOCK"
}`;

      const payload = {
        model_id: this.modelId,
        project_id: projectId,
        input: prompt,
        parameters: {
          decoding_method: 'greedy',
          max_new_tokens: 350,
          temperature: 0
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second strict timeout

      const res = await fetch(`${endpoint}/ml/v1/text/generation?version=2023-05-29`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        throw new Error(`watsonx.ai endpoint returned HTTP ${res.status}`);
      }

      const resData = await res.json();
      const generatedText = resData.results?.[0]?.generated_text || '';

      // Extract JSON substring
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('watsonx.ai response did not contain JSON object');
      }

      const rawParsed = JSON.parse(jsonMatch[0]);
      const validated = this.validateStructuredResponse(rawParsed);

      return {
        success: true,
        data: validated,
        model: this.modelId,
        region,
        latencyMs
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const failureReason = err.name === 'AbortError' 
        ? 'watsonx.ai request timed out after 8000ms'
        : (err.message || 'Unknown watsonx.ai error');

      return {
        success: false,
        model: this.modelId,
        region,
        latencyMs,
        failureReason
      };
    }
  }

  /**
   * Clears cached token for testing expiry / re-authentication workflows
   */
  public resetTokenCache(): void {
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
    this.refreshPromise = null;
  }
}

export const watsonxService = WatsonxRiskAnalysisService.getInstance();
