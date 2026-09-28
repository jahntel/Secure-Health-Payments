import React, { useState } from 'react';
import { Transaction, TransactionRiskAssessment } from '../types.ts';
import { api } from '../api.ts';
import { Shield, AlertTriangle, CheckCircle, XCircle, Lock, Eye, Terminal, Clock, FileText, Check } from 'lucide-react';

interface TransactionModalProps {
  transaction: Transaction | null;
  assessment: TransactionRiskAssessment | null;
  onClose: () => void;
  onResolved?: () => void;
  canResolve?: boolean;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  transaction,
  assessment,
  onClose,
  onResolved,
  canResolve = false
}) => {
  const [resolving, setResolving] = useState(false);
  const [notes, setNotes] = useState('');
  const [resolveSuccess, setResolveSuccess] = useState(false);

  if (!transaction) return null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'MEDIUM': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"><CheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'QUARANTINED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30"><XCircle className="w-3.5 h-3.5" /> Quarantined (High Risk)</span>;
      case 'FLAGGED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30"><AlertTriangle className="w-3.5 h-3.5" /> Flagged for Review</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"><Check className="w-3.5 h-3.5" /> Cleared by SOC</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-300 border border-slate-500/30">{status}</span>;
    }
  };

  const handleResolve = async () => {
    if (!notes) {
      alert('Please provide investigation or verification notes');
      return;
    }
    setResolving(true);
    try {
      // Find event if any, or call resolve endpoint
      await api.resolveSecurityEvent(transaction.id, notes);
      setResolveSuccess(true);
      setTimeout(() => {
        onResolved?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      // Fallback if not an event ID
      alert(err.message || 'Updated transaction status');
      onResolved?.();
      onClose();
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 p-6 md:p-8">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl font-bold tracking-tight text-white">{transaction.id}</span>
              {getStatusBadge(transaction.status)}
              {transaction.isSimulatedAttack && (
                <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded">
                  Demo Attack Trigger
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {new Date(transaction.createdAt).toUTCString()}
              <span className="text-slate-600">•</span>
              <span>Tenant: <strong className="text-slate-300">{transaction.organizationId}</strong></span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-6 space-y-6">

          {/* Core Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Billed Amount</span>
              <p className="text-lg font-bold text-white mt-0.5">
                {transaction.currency} {transaction.amount.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Healthcare Service</span>
              <p className="text-sm font-semibold text-slate-200 mt-0.5 truncate" title={transaction.serviceName}>
                {transaction.serviceName}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Payment Channel</span>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">
                {transaction.paymentMethod}
              </p>
              <p className="text-[11px] text-slate-400 font-mono">{transaction.paymentReference}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Patient Ref</span>
              <p className="text-sm font-semibold font-mono text-cyan-400 mt-0.5 flex items-center gap-1">
                <Lock className="w-3 h-3 text-cyan-500" />
                {transaction.patientReference}
              </p>
              <p className="text-[11px] text-slate-500">Guardium Tokenized</p>
            </div>
          </div>

          {/* Risk Scoring & Explainable AI Section */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/30 space-y-4">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800/80 gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">Security Risk Intelligence Assessment</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Final Score:</span>
                <span className={`px-2.5 py-0.5 rounded text-sm font-bold font-mono border ${getRiskColor(transaction.riskLevel)}`}>
                  {transaction.riskScore} / 100
                </span>
                <span className={`text-xs font-semibold uppercase ${getRiskColor(transaction.riskLevel)}`}>
                  {transaction.riskLevel} RISK
                </span>
              </div>
            </div>

            {/* AI Engine & Status attribution */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Analysis Engine: <strong className="text-indigo-300">{assessment?.aiEngineDetails || 'IBM watsonx.ai Granite Model (eu-de)'}</strong>
                </span>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">
                {assessment?.evaluatedAt ? new Date(assessment.evaluatedAt).toLocaleTimeString() : ''}
              </span>
            </div>

            {/* Deterministic Override Notification if applicable */}
            {assessment?.deterministicOverridesAi && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Authoritative Security Rule Overrode AI:</strong> Deterministic fraud controls enforced a {assessment.riskLevel} risk quarantine to protect healthcare settlement.
                </span>
              </div>
            )}

            {/* IBM watsonx.ai Natural Language Explanation */}
            {assessment?.aiAssessment && (
              <div className="p-3.5 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" /> watsonx.ai Contextual Explanation
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    AI Rec: {assessment.aiAssessment.recommendedAction}
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed italic bg-slate-950/60 p-2.5 rounded-md border border-slate-900">
                  "{assessment.aiAssessment.explanation}"
                </p>
                {assessment.aiAssessment.signals && assessment.aiAssessment.signals.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider block">Contextual Risk Signals:</span>
                    <ul className="space-y-1">
                      {assessment.aiAssessment.signals.map((sig, sIdx) => (
                        <li key={sIdx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                          <span className="text-indigo-400">•</span>
                          <span>{sig}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Deterministic Signals & Indicators */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Authoritative Deterministic Signals:</span>
              <div className="space-y-1.5">
                {assessment?.factors && assessment.factors.length > 0 ? (
                  assessment.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div className="flex items-center gap-2">
                        {factor.anomalyDetected ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <span>{factor.description}</span>
                      </div>
                      <span className={`font-mono text-[11px] font-bold ${factor.points > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {factor.points} / {factor.maxPoints} pts
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No telemetry anomalies detected.</p>
                )}
              </div>
            </div>

            {/* Recommended Policy Action */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">Authoritative Recommendation</span>
              <p className="text-xs text-slate-200">
                {assessment?.recommendedAction || 'Cleared for standard processing.'}
              </p>
            </div>
          </div>

          {/* Privacy & Guardium Compliance Masking */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/30">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                IBM Guardium Sensitive Data Minimization Check
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800">
                <span className="text-slate-500 block">Patient Identity</span>
                <span className="font-mono text-slate-200">{transaction.patientReference} (No PII)</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800">
                <span className="text-slate-500 block">Masked MSISDN/Phone</span>
                <span className="font-mono text-slate-200">{transaction.phoneNumberMasked || '+254 7** ***000'}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800">
                <span className="text-slate-500 block">Card PAN / CVV</span>
                <span className="font-mono text-emerald-400">Zero PAN Stored (Tokenized)</span>
              </div>
            </div>
          </div>

          {/* Resolution section for Provider / Admin */}
          {canResolve && transaction.status !== 'APPROVED' && transaction.status !== 'RESOLVED' && (
            <div className="p-4 rounded-xl border border-amber-900/30 bg-amber-950/10">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Provider Incident Review & Override
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Review this transaction with the patient. Enter verification notes to clear the flag and authorize settlement.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Verified patient in-clinic ID and national identity card. Confirmed authorized payment."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleResolve}
                  disabled={resolving || resolveSuccess}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 transition flex items-center gap-2"
                >
                  {resolving ? 'Updating Audit Log...' : resolveSuccess ? 'Resolved & Cleared' : 'Authorize & Clear Flag'}
                </button>
              </div>
            </div>
          )}

          {transaction.status === 'RESOLVED' && (
            <div className="p-4 rounded-xl border border-emerald-900/30 bg-emerald-950/10 text-xs text-emerald-300">
              <span className="font-semibold block mb-1">✓ Cleared by {transaction.resolvedBy || 'Security Officer'}</span>
              <p className="text-slate-300">{transaction.resolutionNotes}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">Resolved on {new Date(transaction.resolvedAt || '').toLocaleString()}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
};
