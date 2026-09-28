import { RiskFactor, RiskLevel, TransactionRiskAssessment, AiRiskAnalysisResult, DeterministicRiskResult } from '../types.ts';
import { watsonxService, SanitizedRiskInput } from './watsonxService.ts';

export interface RiskConfig {
  lowThreshold: number;   // 29
  mediumThreshold: number; // 69
  weights: {
    amountAnomalyMax: number;     // 30
    failedAttemptsMax: number;    // 25
    newDeviceMax: number;         // 18
    frequencyAnomalyMax: number;  // 15
    temporalAnomalyMax: number;   // 12
  };
}

export interface RiskEvaluationInput {
  transactionId: string;
  amount: number;
  currency: string;
  patientId: string;
  patientReference: string;
  serviceCategory?: string;
  deviceFingerprint: string;
  recentFailedAttemptsCount: number;
  recentTransactionsCountLastHour: number;
  patientHistoricalAvgAmount: number;
  knownDeviceFingerprints: string[];
  hourOfDay: number; // 0 - 23
  isSimulatedAttack?: boolean;
}

export class TransactionRiskEngine {
  private config: RiskConfig = {
    lowThreshold: 29,
    mediumThreshold: 69,
    weights: {
      amountAnomalyMax: 30,
      failedAttemptsMax: 25,
      newDeviceMax: 18,
      frequencyAnomalyMax: 15,
      temporalAnomalyMax: 12
    }
  };

  public getConfig(): RiskConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<RiskConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
      weights: {
        ...this.config.weights,
        ...(newConfig.weights || {})
      }
    };
  }

  /**
   * Main risk analysis method:
   * 1. Evaluates authoritative deterministic security & fraud rules.
   * 2. Sanitizes telemetry to protect patient privacy (Kenya DPA 2019).
   * 3. Queries IBM watsonx.ai for intelligent contextual risk assessment & natural-language explanations.
   * 4. Enforces authoritative deterministic security: deterministic rules cannot be downgraded by AI.
   * 5. Handles safe fallbacks if watsonx.ai is unavailable or times out.
   */
  public async analyzeTransaction(input: RiskEvaluationInput): Promise<TransactionRiskAssessment> {
    // 1. Authoritative Deterministic Rule Engine Evaluation
    const deterministic = this.evaluateWithLocalEngine(input);

    // 2. Data Sanitization (Remove any PII, credentials, or raw records)
    const sanitizedInput: SanitizedRiskInput = watsonxService.sanitizeRiskAnalysisInput({
      transactionId: input.transactionId,
      amount: input.amount,
      currency: input.currency,
      patientReference: input.patientReference,
      serviceCategory: input.serviceCategory,
      patientHistoricalAvgAmount: input.patientHistoricalAvgAmount,
      recentFailedAttemptsCount: input.recentFailedAttemptsCount,
      recentTransactionsCountLastHour: input.recentTransactionsCountLastHour,
      isUntrustedOrNewDevice: input.isSimulatedAttack || !input.knownDeviceFingerprints.includes(input.deviceFingerprint),
      hourOfDayUtc: input.hourOfDay,
      deterministicScore: deterministic.riskScore,
      deterministicSignals: deterministic.reasons
    });

    let aiAssessment: AiRiskAnalysisResult | undefined;
    let isWatsonxLive = false;

    // 3. Invoke IBM watsonx.ai if configured or handle synthetic demo simulation
    if (watsonxService.isConfigured()) {
      const aiResult = await watsonxService.analyzePaymentWithWatsonx(sanitizedInput);
      if (aiResult.success && aiResult.data) {
        isWatsonxLive = true;
        aiAssessment = {
          model: aiResult.model,
          region: aiResult.region,
          riskLevel: aiResult.data.risk_level,
          riskScore: aiResult.data.risk_score,
          signals: aiResult.data.signals,
          explanation: aiResult.data.explanation,
          recommendedAction: aiResult.data.recommended_action,
          status: 'SUCCESS',
          latencyMs: aiResult.latencyMs
        };
      } else {
        // AI failed or timed out: Log warning and fail safe to deterministic rules
        console.warn(`[WATSONX.AI] AI risk analysis fallback to deterministic rules: ${aiResult.failureReason}`);
        aiAssessment = {
          model: aiResult.model,
          region: aiResult.region,
          riskLevel: deterministic.riskLevel,
          riskScore: deterministic.riskScore,
          signals: deterministic.reasons,
          explanation: 'AI risk analysis is temporarily unavailable. The transaction security engine is still active and evaluated this transaction using authoritative deterministic fraud rules.',
          recommendedAction: deterministic.riskLevel === 'HIGH' ? 'BLOCK' : (deterministic.riskLevel === 'MEDIUM' ? 'REVIEW' : 'ALLOW'),
          status: 'FALLBACK_TO_DETERMINISTIC',
          latencyMs: aiResult.latencyMs,
          failureReason: aiResult.failureReason
        };
      }
    } else {
      // Watsonx credentials not present in local sandbox: Generate high-fidelity synthetic demo AI assessment
      aiAssessment = this.generateSyntheticDemoAiAssessment(input, deterministic);
    }

    // 4. Authoritative Decision & Conflict Resolution
    // DETERMINISTIC SECURITY MUST REMAIN AUTHORITATIVE
    let finalRiskScore = deterministic.riskScore;
    let finalRiskLevel = deterministic.riskLevel;
    let finalRecommendedAction = deterministic.recommendedAction;
    let deterministicOverridesAi = false;

    if (aiAssessment) {
      // Deterministic HIGH risk can NEVER be downgraded by AI to LOW or MEDIUM
      if (deterministic.riskLevel === 'HIGH' && aiAssessment.riskLevel !== 'HIGH') {
        deterministicOverridesAi = true;
        finalRiskLevel = 'HIGH';
        finalRiskScore = Math.max(deterministic.riskScore, aiAssessment.riskScore);
        finalRecommendedAction = deterministic.recommendedAction;
      }
      // Deterministic MEDIUM risk can NEVER be downgraded by AI to LOW
      else if (deterministic.riskLevel === 'MEDIUM' && aiAssessment.riskLevel === 'LOW') {
        deterministicOverridesAi = true;
        finalRiskLevel = 'MEDIUM';
        finalRiskScore = Math.max(deterministic.riskScore, aiAssessment.riskScore);
        finalRecommendedAction = deterministic.recommendedAction;
      }
      // If AI detects elevated contextual risk, it CAN escalate the alert for defense-in-depth
      else if (aiAssessment.riskLevel === 'HIGH' && deterministic.riskLevel !== 'HIGH') {
        finalRiskLevel = 'HIGH';
        finalRiskScore = Math.max(deterministic.riskScore, aiAssessment.riskScore);
        finalRecommendedAction = 'Quarantined: Contextual risk indicators from watsonx.ai require security review before settlement.';
      } else if (aiAssessment.riskLevel === 'MEDIUM' && deterministic.riskLevel === 'LOW') {
        finalRiskLevel = 'MEDIUM';
        finalRiskScore = Math.max(deterministic.riskScore, aiAssessment.riskScore);
        finalRecommendedAction = 'Review: Flagged by watsonx.ai contextual analysis for secondary confirmation.';
      } else {
        // Levels match: Blend scores with deterministic priority
        finalRiskScore = Math.round((deterministic.riskScore * 0.6) + (aiAssessment.riskScore * 0.4));
        if (finalRiskLevel === 'HIGH' && finalRiskScore <= this.config.mediumThreshold) {
          finalRiskScore = this.config.mediumThreshold + 1;
        }
      }
    }

    const mergedReasons = Array.from(new Set([
      ...deterministic.reasons,
      ...(aiAssessment?.signals || [])
    ]));

    const aiEngineType = isWatsonxLive ? 'IBM_WATSONX_AI' : 'LOCAL_RULE_ENGINE';
    const aiEngineDetails = isWatsonxLive
      ? `IBM watsonx.ai Granite Model (${aiAssessment?.model || 'granite-13b-chat-v2'} @ ${aiAssessment?.region || 'eu-de'})`
      : 'Deterministic Feature Engine + watsonx.ai Adapter (Synthetic Demo Mode)';

    return {
      id: `RSK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      transactionId: input.transactionId,
      riskScore: finalRiskScore,
      riskLevel: finalRiskLevel,
      reasons: mergedReasons,
      factors: deterministic.factors,
      recommendedAction: finalRecommendedAction,
      aiEngine: aiEngineType,
      aiEngineDetails,
      evaluatedAt: new Date().toISOString(),
      aiAssessment,
      deterministicAssessment: deterministic,
      deterministicOverridesAi
    };
  }

  /**
   * Deterministic local rule engine implementing transparent healthcare risk features
   */
  public evaluateWithLocalEngine(input: RiskEvaluationInput): DeterministicRiskResult {
    const factors: RiskFactor[] = [];
    const reasons: string[] = [];

    // 1. Amount Anomaly Factor
    let amountPoints = 0;
    const historicalAvg = input.patientHistoricalAvgAmount || 2000;
    const ratio = input.amount / historicalAvg;

    if (input.isSimulatedAttack || ratio > 10) {
      amountPoints = this.config.weights.amountAnomalyMax;
      factors.push({
        signal: 'AMOUNT_SEVERELY_ELEVATED',
        points: amountPoints,
        maxPoints: this.config.weights.amountAnomalyMax,
        description: `Amount (${input.currency} ${input.amount.toLocaleString()}) is ${Math.round(ratio * 100)}% of baseline average (${input.currency} ${historicalAvg.toLocaleString()})`,
        anomalyDetected: true
      });
      reasons.push(`Transaction amount significantly exceeds patient's historical average (${input.currency} ${input.amount.toLocaleString()} vs ${input.currency} ${historicalAvg.toLocaleString()})`);
    } else if (ratio > 3) {
      amountPoints = Math.round(this.config.weights.amountAnomalyMax * 0.6);
      factors.push({
        signal: 'AMOUNT_MODERATELY_ELEVATED',
        points: amountPoints,
        maxPoints: this.config.weights.amountAnomalyMax,
        description: `Amount is elevated compared to historical visits`,
        anomalyDetected: true
      });
      reasons.push(`Amount exceeds standard typical consultation fee pattern`);
    } else {
      factors.push({
        signal: 'AMOUNT_NORMAL',
        points: 0,
        maxPoints: this.config.weights.amountAnomalyMax,
        description: `Amount is within expected baseline bounds`,
        anomalyDetected: false
      });
    }

    // 2. Failed Attempts Factor
    let failedPoints = 0;
    if (input.isSimulatedAttack || input.recentFailedAttemptsCount >= 3) {
      failedPoints = this.config.weights.failedAttemptsMax;
      factors.push({
        signal: 'RAPID_FAILED_ATTEMPTS',
        points: failedPoints,
        maxPoints: this.config.weights.failedAttemptsMax,
        description: `${input.recentFailedAttemptsCount || 4} consecutive failed verification/PIN attempts detected in last 5 minutes`,
        anomalyDetected: true
      });
      reasons.push(`Multiple failed authentication/PIN attempts recorded immediately prior to this transaction`);
    } else if (input.recentFailedAttemptsCount === 1) {
      failedPoints = Math.round(this.config.weights.failedAttemptsMax * 0.4);
      factors.push({
        signal: 'SINGLE_FAILED_ATTEMPT',
        points: failedPoints,
        maxPoints: this.config.weights.failedAttemptsMax,
        description: `1 prior failed attempt recorded`,
        anomalyDetected: false
      });
    } else {
      factors.push({
        signal: 'NO_FAILED_ATTEMPTS',
        points: 0,
        maxPoints: this.config.weights.failedAttemptsMax,
        description: `No failed attempts recorded`,
        anomalyDetected: false
      });
    }

    // 3. Device Anomaly Factor
    let devicePoints = 0;
    const isNewDevice = input.isSimulatedAttack || !input.knownDeviceFingerprints.includes(input.deviceFingerprint);
    if (isNewDevice) {
      devicePoints = this.config.weights.newDeviceMax;
      factors.push({
        signal: 'UNRECOGNIZED_DEVICE',
        points: devicePoints,
        maxPoints: this.config.weights.newDeviceMax,
        description: `Device fingerprint does not match patient's known authorized hardware profile`,
        anomalyDetected: true
      });
      reasons.push(`New or untrusted device fingerprint detected without prior MFA binding`);
    } else {
      factors.push({
        signal: 'RECOGNIZED_DEVICE',
        points: 0,
        maxPoints: this.config.weights.newDeviceMax,
        description: `Recognized trusted client device`,
        anomalyDetected: false
      });
    }

    // 4. Frequency Anomaly Factor
    let freqPoints = 0;
    if (input.recentTransactionsCountLastHour > 3) {
      freqPoints = this.config.weights.frequencyAnomalyMax;
      factors.push({
        signal: 'HIGH_VELOCITY_TRANSACTIONS',
        points: freqPoints,
        maxPoints: this.config.weights.frequencyAnomalyMax,
        description: `${input.recentTransactionsCountLastHour} transactions initiated in the past hour (velocity threshold exceeded)`,
        anomalyDetected: true
      });
      reasons.push(`Unusual payment frequency/velocity detected`);
    } else {
      factors.push({
        signal: 'NORMAL_VELOCITY',
        points: 0,
        maxPoints: this.config.weights.frequencyAnomalyMax,
        description: `Transaction frequency within normal limits`,
        anomalyDetected: false
      });
    }

    // 5. Temporal Anomaly Factor (e.g. 01:00 AM - 05:00 AM)
    let temporalPoints = 0;
    const isOffHours = input.hourOfDay >= 0 && input.hourOfDay < 5;
    if (input.isSimulatedAttack || isOffHours) {
      temporalPoints = this.config.weights.temporalAnomalyMax;
      factors.push({
        signal: 'OFF_HOURS_ACTIVITY',
        points: temporalPoints,
        maxPoints: this.config.weights.temporalAnomalyMax,
        description: `Transaction executed at off-peak time (${String(input.hourOfDay).padStart(2, '0')}:00 UTC) inconsistent with clinic operating hours`,
        anomalyDetected: true
      });
      reasons.push(`Transaction initiated during atypical off-peak hours outside regular clinic schedule`);
    } else {
      factors.push({
        signal: 'STANDARD_HOURS',
        points: 0,
        maxPoints: this.config.weights.temporalAnomalyMax,
        description: `Transaction during regular operational hours`,
        anomalyDetected: false
      });
    }

    // Calculate total score
    let totalScore = amountPoints + failedPoints + devicePoints + freqPoints + temporalPoints;
    
    // For demo simulated attack, ensure exact target score 87
    if (input.isSimulatedAttack) {
      totalScore = 87;
    }

    totalScore = Math.min(100, Math.max(0, totalScore));

    // Determine risk level
    let riskLevel: RiskLevel = 'LOW';
    let recommendedAction = 'Approved: Transaction cleared for immediate settlement.';

    if (totalScore > this.config.mediumThreshold) {
      riskLevel = 'HIGH';
      recommendedAction = 'Quarantined: Additional biometric or in-person verification required before disbursement.';
    } else if (totalScore > this.config.lowThreshold) {
      riskLevel = 'MEDIUM';
      recommendedAction = 'Review: Flagged for provider confirmation and secondary SMS one-time password.';
    }

    return {
      riskScore: totalScore,
      riskLevel,
      reasons: reasons.length > 0 ? reasons : ['All telemetry parameters match normal historical patient profile.'],
      factors,
      recommendedAction
    };
  }

  /**
   * Generates realistic synthetic AI analysis for demo mode
   */
  private generateSyntheticDemoAiAssessment(
    input: RiskEvaluationInput,
    deterministic: DeterministicRiskResult
  ): AiRiskAnalysisResult {
    if (input.isSimulatedAttack || deterministic.riskLevel === 'HIGH') {
      return {
        model: 'ibm/granite-13b-chat-v2',
        region: 'eu-de',
        riskLevel: 'HIGH',
        riskScore: 88,
        signals: [
          `Severe financial variance: Billed amount (${input.currency} ${input.amount.toLocaleString()}) represents 41.7x historical outpatient average`,
          'Untrusted hardware signature with mismatched client fingerprint',
          'Repetitive credential failures in short temporal window indicating possible automated brute-force'
        ],
        explanation: 'watsonx.ai contextual analysis detected severe behavioral divergence from baseline clinical fee schedules coupled with unverified hardware. High probability of account takeover or compromised mobile session.',
        recommendedAction: 'BLOCK',
        status: 'SIMULATED_DEMO',
        latencyMs: 142
      };
    }

    if (deterministic.riskLevel === 'MEDIUM') {
      return {
        model: 'ibm/granite-13b-chat-v2',
        region: 'eu-de',
        riskLevel: 'MEDIUM',
        riskScore: deterministic.riskScore,
        signals: [
          'Payment amount exceeds routine primary-care threshold but aligns with specialist or diagnostic fee schedules',
          'Secondary verification recommended to prevent billing discrepancies'
        ],
        explanation: 'watsonx.ai identified moderate fee elevation relative to patient routine consultation history. Telemetry suggests legitimate high-value diagnostic or laboratory procedure, pending provider review.',
        recommendedAction: 'REVIEW',
        status: 'SIMULATED_DEMO',
        latencyMs: 98
      };
    }

    return {
      model: 'ibm/granite-13b-chat-v2',
      region: 'eu-de',
      riskLevel: 'LOW',
      riskScore: deterministic.riskScore,
      signals: [
        'Transaction telemetry matches expected outpatient consultation baseline',
        'Recognized hardware fingerprint and standard operational hours'
      ],
      explanation: 'watsonx.ai foundation model analysis indicates high-trust transaction. Telemetry is fully consistent with established clinical visit behavior.',
      recommendedAction: 'ALLOW',
      status: 'SIMULATED_DEMO',
      latencyMs: 84
    };
  }
}

export const riskEngine = new TransactionRiskEngine();

