import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { SecurityEvent, AuditLog, Transaction } from '../types.ts';
import { api } from '../api.ts';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Cpu, 
  FileText, 
  AlertTriangle, 
  Sliders, 
  Terminal, 
  CheckCircle, 
  XCircle, 
  Zap, 
  Eye, 
  Clock, 
  Check, 
  Activity, 
  Lock,
  Layers,
  RefreshCw,
  Brain
} from 'lucide-react';
import { TransactionModal } from './TransactionModal.tsx';

export const SecurityAdminView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'AUDIT' | 'RISK_ENGINE' | 'GATEWAY' | 'WATSONX'>('ALERTS');
  
  // Data states
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [chainIntegrity, setChainIntegrity] = useState<any>(null);
  const [riskConfig, setRiskConfig] = useState<any>(null);
  const [gatewayPolicies, setGatewayPolicies] = useState<any>(null);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Attack simulator
  const [simulating, setSimulating] = useState(false);
  const [attackSuccessBanner, setAttackSuccessBanner] = useState<any>(null);

  // Selected Transaction for modal
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);

  // Verify Hash Chain
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [chainVerifiedSuccess, setChainVerifiedSuccess] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [events, auditData, rConfig, policies, metrics] = await Promise.all([
        api.getSecurityEvents(),
        api.getAuditLogs(),
        api.getRiskConfig(),
        api.getSecurityPolicies(),
        api.getDashboardMetrics()
      ]);
      setSecurityEvents(events);
      setAuditLogs(auditData.logs);
      setChainIntegrity(auditData.chainIntegrity);
      setRiskConfig(rConfig);
      setGatewayPolicies(policies);
      setDashboardMetrics(metrics);
    } catch (err) {
      console.error('Failed to load SOC data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateAttack = async () => {
    setSimulating(true);
    try {
      const res = await api.simulateSuspiciousTransaction();
      setAttackSuccessBanner(res);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Simulation error');
    } finally {
      setSimulating(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    setChainVerifiedSuccess(false);
    try {
      const data = await api.getAuditLogs();
      setChainIntegrity(data.chainIntegrity);
      setChainVerifiedSuccess(true);
      setTimeout(() => setChainVerifiedSuccess(false), 4000);
    } catch (err: any) {
      alert('Verification failed');
    } finally {
      setVerifyingChain(false);
    }
  };

  const handleSaveRiskConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateRiskConfig(riskConfig);
      alert('Risk scoring weights updated and recorded in IBM Guardium audit ledger.');
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to update config');
    }
  };

  const handleOpenTransaction = async (txnId: string) => {
    try {
      const data = await api.getTransactionDetails(txnId);
      setSelectedTxn(data.transaction);
      setSelectedAssessment(data.assessment);
    } catch (err: any) {
      alert('Could not retrieve transaction details');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4" /> Security Operations Center (SOC) • IBM Intelligence Core
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Security Intelligence & Threat Defense
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <strong className="text-slate-200">{user?.fullName || 'Amina Noor (CISO)'}</strong> • System-wide telemetry, IBM DataPower WAF policies, and watsonx risk scoring.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateAttack}
            disabled={simulating}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-lg shadow-red-950/40 transition active:scale-95 flex items-center gap-2"
          >
            <Zap className={`w-4 h-4 ${simulating ? 'animate-spin' : ''}`} />
            <span>{simulating ? 'Simulating Anomaly...' : 'Simulate Suspicious Transaction'}</span>
          </button>

          <button
            onClick={loadAllData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Attack Scenario Banner Result (When triggered) */}
      {attackSuccessBanner && (
        <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/50 text-white animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 shrink-0">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-red-200">
                    🚨 HIGH-RISK TRANSACTION DETECTED ({attackSuccessBanner.transaction.currency} {attackSuccessBanner.transaction.amount.toLocaleString()})
                  </h3>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                    RISK SCORE: {attackSuccessBanner.assessment.riskScore}/100
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Transaction <strong className="font-mono text-white">{attackSuccessBanner.transaction.id}</strong> was automatically quarantined by IBM watsonx.ai risk policy.
                </p>

                {/* Factors list */}
                <div className="mt-3 space-y-1.5">
                  <span className="text-xs font-semibold text-red-300 uppercase tracking-wider block">Risk Reasons:</span>
                  {attackSuccessBanner.assessment.reasons.map((r: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 bg-red-950/60 p-2 rounded-lg border border-red-900/50">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedTxn(attackSuccessBanner.transaction);
                      setSelectedAssessment(attackSuccessBanner.assessment);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Investigate Transaction Payload</span>
                  </button>
                  <button
                    onClick={() => setAttackSuccessBanner(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setAttackSuccessBanner(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* SOC Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-1 sm:space-x-4 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('ALERTS')}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 ${
            activeTab === 'ALERTS'
              ? 'border-red-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>Security Alerts ({securityEvents.filter(e => e.status === 'OPEN').length} Open)</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 ${
            activeTab === 'AUDIT'
              ? 'border-cyan-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>IBM Guardium Audit Ledger (SHA-256 Chained)</span>
        </button>

        <button
          onClick={() => setActiveTab('RISK_ENGINE')}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 ${
            activeTab === 'RISK_ENGINE'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Risk Engine & watsonx Thresholds</span>
        </button>

        <button
          onClick={() => setActiveTab('GATEWAY')}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 ${
            activeTab === 'GATEWAY'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>DataPower WAF & Threat Policies</span>
        </button>

        <button
          onClick={() => setActiveTab('WATSONX')}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 ${
            activeTab === 'WATSONX'
              ? 'border-purple-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Brain className="w-4 h-4 text-purple-400" />
          <span>IBM watsonx.ai Model & Intelligence</span>
        </button>
      </div>

      {/* ================= TAB 1: SECURITY ALERTS ================= */}
      {activeTab === 'ALERTS' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-1">Active Security Incidents & Threat Feed</h2>
            <p className="text-xs text-slate-400 mb-6">
              Telemetry flagged as Medium or High Risk across all tenants. All actions are logged with immutable cryptographic hashes.
            </p>

            <div className="space-y-3">
              {securityEvents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p>No open security alerts. All transaction signals within safe baseline parameters.</p>
                </div>
              ) : (
                securityEvents.map(evt => (
                  <div
                    key={evt.id}
                    className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      evt.status === 'RESOLVED'
                        ? 'bg-slate-950/40 border-slate-800 opacity-60'
                        : evt.severity === 'HIGH'
                        ? 'bg-red-950/20 border-red-500/40'
                        : 'bg-amber-950/20 border-amber-500/30'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          evt.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {evt.severity} SEVERITY
                        </span>
                        <span className="text-xs font-mono font-bold text-white">{evt.id}</span>
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(evt.timestamp).toLocaleString()}
                        </span>
                        {evt.status === 'RESOLVED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-medium">
                            ✓ RESOLVED
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs font-bold text-slate-100">{evt.title}</h3>

                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <p><strong>Recommended Action:</strong> {evt.recommendedAction}</p>
                        {evt.indicators && (
                          <p className="text-slate-400"><strong>Key Trigger:</strong> {evt.indicators[0]}</p>
                        )}
                        {evt.investigationNotes && (
                          <p className="text-cyan-400"><strong>Resolution Note:</strong> {evt.investigationNotes} (by {evt.investigatedBy})</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {evt.transactionId && (
                        <button
                          onClick={() => handleOpenTransaction(evt.transactionId!)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Transaction</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: IBM GUARDIUM AUDIT LEDGER ================= */}
      {activeTab === 'AUDIT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">IBM Guardium Cryptographic Audit Trail</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  TAMPER EVIDENT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Every login, payment, risk evaluation, and consent shift is chained via SHA-256 hashes back to the genesis block.
              </p>
            </div>

            {/* Chain Integrity Verifier Button */}
            <button
              onClick={handleVerifyChain}
              disabled={verifyingChain}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950/40 transition active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck className={`w-4 h-4 ${verifyingChain ? 'animate-spin' : ''}`} />
              <span>{verifyingChain ? 'Verifying Hashes...' : 'Verify Cryptographic Chain Integrity'}</span>
            </button>
          </div>

          {/* Verification Badge */}
          {chainIntegrity && (
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              chainIntegrity.isValid
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/30 border-red-500/50 text-red-300'
            }`}>
              <div className="flex items-center gap-3">
                {chainIntegrity.isValid ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <div>
                  <span className="font-bold text-xs">
                    {chainIntegrity.isValid
                      ? `Cryptographic Audit Chain 100% Intact (${chainIntegrity.totalVerified} entries validated)`
                      : `Chain Integrity Compromised at ${chainIntegrity.brokenAt}`}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    No log tampering detected. Formatted to IBM Guardium Data Security & Compliance standards.
                  </p>
                </div>
              </div>

              {chainVerifiedSuccess && (
                <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/40">
                  ✓ Re-verified Now
                </span>
              )}
            </div>
          )}

          {/* Log Stream */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pl-2">Timestamp</th>
                  <th className="pb-3">Event Type</th>
                  <th className="pb-3">Actor / Role</th>
                  <th className="pb-3">Resource</th>
                  <th className="pb-3">Result</th>
                  <th className="pb-3">Entry SHA-256 Hash</th>
                  <th className="pb-3 pr-2">Chained Parent Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.slice(0, 30).map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition text-[11px]">
                    <td className="py-2.5 pl-2 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 font-bold text-indigo-300">
                      {log.eventType}
                    </td>
                    <td className="py-2.5 text-slate-300 font-sans">
                      {log.actorEmail}
                      <span className="text-[10px] text-slate-500 block font-mono">({log.actorRole})</span>
                    </td>
                    <td className="py-2.5 text-slate-400">{log.resource}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.result === 'ALERT' ? 'bg-red-500/20 text-red-400' :
                        log.result === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {log.result}
                      </span>
                    </td>
                    <td className="py-2.5 text-cyan-400 font-mono text-[10px]" title={log.entryHash}>
                      {log.entryHash.slice(0, 14)}...
                    </td>
                    <td className="py-2.5 pr-2 text-slate-500 font-mono text-[10px]" title={log.previousHash}>
                      {log.previousHash.slice(0, 14)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ================= TAB 3: RISK ENGINE CONFIGURATION ================= */}
      {activeTab === 'RISK_ENGINE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="pb-5 border-b border-slate-800 mb-6">
            <h2 className="text-lg font-bold text-white">Transaction Risk Engine Thresholds</h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure telemetry feature weights evaluated by the IBM watsonx.ai risk model. Changes require administrative privilege and are recorded in the audit trail.
            </p>
          </div>

          {riskConfig && (
            <form onSubmit={handleSaveRiskConfig} className="space-y-6 max-w-2xl">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Low Risk Threshold Max (0 - X)
                  </label>
                  <input
                    type="number"
                    value={riskConfig.lowThreshold}
                    onChange={(e) => setRiskConfig({ ...riskConfig, lowThreshold: parseInt(e.target.value) || 29 })}
                    className="w-full text-sm p-2 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-bold font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Standard: 29. Transactions below this pass immediately.</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Medium Risk Threshold Max (X - Y)
                  </label>
                  <input
                    type="number"
                    value={riskConfig.mediumThreshold}
                    onChange={(e) => setRiskConfig({ ...riskConfig, mediumThreshold: parseInt(e.target.value) || 69 })}
                    className="w-full text-sm p-2 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 font-bold font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Standard: 69. Transactions above this are Quarantined (High Risk).</span>
                </div>
              </div>

              {/* Feature Weights */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Signal Weights (Max Points per Telemetry Anomaly)
                </h3>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Amount Anomaly (Ratio to Historical Visit Average)</span>
                      <strong className="font-mono text-indigo-400">{riskConfig.weights?.amountAnomalyMax} pts</strong>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="40"
                      value={riskConfig.weights?.amountAnomalyMax || 30}
                      onChange={(e) => setRiskConfig({
                        ...riskConfig,
                        weights: { ...riskConfig.weights, amountAnomalyMax: parseInt(e.target.value) }
                      })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Rapid Failed Authentication / PIN Attempts</span>
                      <strong className="font-mono text-indigo-400">{riskConfig.weights?.failedAttemptsMax} pts</strong>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="35"
                      value={riskConfig.weights?.failedAttemptsMax || 25}
                      onChange={(e) => setRiskConfig({
                        ...riskConfig,
                        weights: { ...riskConfig.weights, failedAttemptsMax: parseInt(e.target.value) }
                      })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Unrecognized Device Hardware Signature</span>
                      <strong className="font-mono text-indigo-400">{riskConfig.weights?.newDeviceMax} pts</strong>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="25"
                      value={riskConfig.weights?.newDeviceMax || 18}
                      onChange={(e) => setRiskConfig({
                        ...riskConfig,
                        weights: { ...riskConfig.weights, newDeviceMax: parseInt(e.target.value) }
                      })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Transaction Velocity / Frequency Spike</span>
                      <strong className="font-mono text-indigo-400">{riskConfig.weights?.frequencyAnomalyMax} pts</strong>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="25"
                      value={riskConfig.weights?.frequencyAnomalyMax || 15}
                      onChange={(e) => setRiskConfig({
                        ...riskConfig,
                        weights: { ...riskConfig.weights, frequencyAnomalyMax: parseInt(e.target.value) }
                      })}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-950/40"
              >
                Apply & Save Policy Thresholds
              </button>

            </form>
          )}

        </div>
      )}

      {/* ================= TAB 4: IBM DATAPOWER GATEWAY POLICIES ================= */}
      {activeTab === 'GATEWAY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="pb-5 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">IBM API Connect & DataPower Gateway Policies</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Active gateway-level threat protection rules, TLS configuration, and rate limiting status.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE • ENFORCING
              </span>
            </div>
          </div>

          {/* Active Policies List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">
                Security Policies Enforced
              </h3>
              <ul className="text-xs space-y-2 text-slate-300">
                {gatewayPolicies?.gateway?.activePolicies?.map((p: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">
                Gateway Appliance Metadata
              </h3>
              <div className="text-xs space-y-2 text-slate-300">
                <p><strong>Appliance:</strong> {gatewayPolicies?.gateway?.gatewayName || 'IBM DataPower X3'}</p>
                <p><strong>Mode:</strong> {gatewayPolicies?.gateway?.mode || 'LOCAL_DATAPOWER_SIMULATOR'}</p>
                <p><strong>Upstream:</strong> {gatewayPolicies?.gateway?.connectedUrl}</p>
                <p><strong>Rate Limit:</strong> 60 requests/minute per client IP (Token Bucket)</p>
              </div>
            </div>
          </div>

          {/* Policy Traffic Metrics */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Inspected Endpoints & Threat Detection Metrics
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="pb-3 pl-2">Endpoint</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3">Requests Inspected</th>
                    <th className="pb-3">Threat Blocks</th>
                    <th className="pb-3">WAF Hits</th>
                    <th className="pb-3 pr-2">Avg Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2.5 pl-2 font-bold text-white">/api/payments</td>
                    <td className="py-2.5 text-cyan-400">POST</td>
                    <td className="py-2.5">142</td>
                    <td className="py-2.5 text-emerald-400">0</td>
                    <td className="py-2.5 text-emerald-400">0</td>
                    <td className="py-2.5 pr-2 font-mono">18 ms</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2.5 pl-2 font-bold text-white">/api/auth/login</td>
                    <td className="py-2.5 text-cyan-400">POST</td>
                    <td className="py-2.5">89</td>
                    <td className="py-2.5 text-amber-400">3 (Failed PIN)</td>
                    <td className="py-2.5 text-emerald-400">0</td>
                    <td className="py-2.5 pr-2 font-mono">12 ms</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2.5 pl-2 font-bold text-white">/api/demo/suspicious-transaction</td>
                    <td className="py-2.5 text-amber-400">POST</td>
                    <td className="py-2.5">14</td>
                    <td className="py-2.5 text-red-400">14 (Quarantined)</td>
                    <td className="py-2.5 text-red-400">14</td>
                    <td className="py-2.5 pr-2 font-mono">24 ms</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB 5: IBM WATSONX.AI INTELLIGENCE ================= */}
      {activeTab === 'WATSONX' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="pb-5 border-b border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">IBM watsonx.ai Foundation Model Risk Engine</h2>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    dashboardMetrics?.aiMetrics?.watsonxStatus?.configured
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  }`}>
                    {dashboardMetrics?.aiMetrics?.watsonxStatus?.configured ? 'LIVE CLOUD RUNTIME' : 'DEMO ADAPTER MODE'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Hybrid healthcare payment risk architecture integrating IBM IAM authentication, Granite foundation models, and authoritative deterministic fraud controls.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Region: <strong className="text-white">{dashboardMetrics?.aiMetrics?.watsonxStatus?.region || 'eu-de'}</strong></span>
              </div>
            </div>
          </div>

          {/* Model & Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block mb-1">
                Foundation Model
              </span>
              <p className="text-sm font-bold text-white font-mono">
                {dashboardMetrics?.aiMetrics?.watsonxStatus?.model || 'ibm/granite-13b-chat-v2'}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Trained on enterprise data for structured reasoning & explainable risk signals.
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block mb-1">
                IBM Cloud IAM Security
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white font-mono">
                  {dashboardMetrics?.aiMetrics?.watsonxStatus?.tokenCached ? 'Token Cached (Active)' : 'Automated IAM Lifecycle'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                API keys NEVER exposed to client. Server-side bearer tokens refreshed 5 min prior to expiry.
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
                EU Data Residency (eu-de)
              </span>
              <p className="text-sm font-bold text-white font-mono truncate" title={dashboardMetrics?.aiMetrics?.watsonxStatus?.endpoint}>
                {dashboardMetrics?.aiMetrics?.watsonxStatus?.endpoint || 'https://eu-de.ml.cloud.ibm.com'}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Project: {dashboardMetrics?.aiMetrics?.watsonxStatus?.projectId || 'd37637****bae0'}
              </span>
            </div>

          </div>

          {/* Hybrid Decision Authority Rule Matrix */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Hybrid Risk Decision Authority Rules
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  How the system combines deterministic fraud rules with watsonx.ai contextual analysis safely.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                DEFENSE IN DEPTH
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-red-400 mb-1">
                  <ShieldAlert className="w-4 h-4" /> Deterministic HIGH Risk
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Authoritative Precedence:</strong> When deterministic security flags HIGH, transaction remains quarantined. AI cannot downgrade or override high-risk flags.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
                  <AlertTriangle className="w-4 h-4" /> AI Contextual Escalation
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Safety Uplift:</strong> If deterministic rules classify LOW risk but watsonx.ai detects abnormal behavioral divergence, transaction escalates to REVIEW.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-cyan-400 mb-1">
                  <CheckCircle className="w-4 h-4" /> Resilient Fallback
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Zero Downtime:</strong> If IBM watsonx.ai times out or errors, payments continue processing safely on authoritative deterministic fraud rules.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy & Data Minimization Card */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Kenya DPA 2019 & HIPAA Zero-PII Sanitization
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Before sending telemetry to watsonx.ai, the backend sanitizes the payload through IBM Guardium data minimization filters:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Patient Name</span>
                <span className="text-emerald-400 text-[11px]">STRIPPED (Pseudonym only)</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Phone Number</span>
                <span className="text-emerald-400 text-[11px]">MASKED (+254 7** ***000)</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Credit Card PAN</span>
                <span className="text-emerald-400 text-[11px]">ZERO STORED (Tokenized)</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Clinical Diagnoses</span>
                <span className="text-emerald-400 text-[11px]">EXCLUDED (Category only)</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Transaction Details Modal */}
      <TransactionModal
        transaction={selectedTxn}
        assessment={selectedAssessment}
        onClose={() => {
          setSelectedTxn(null);
          setSelectedAssessment(null);
        }}
        onResolved={loadAllData}
        canResolve={true}
      />

    </div>
  );
};
