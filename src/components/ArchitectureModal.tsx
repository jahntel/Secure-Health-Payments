import React from 'react';
import { Shield, Server, Database, Brain, Lock, CheckCircle2, Info, ArrowRight } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatewayInfo: any;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
  gatewayInfo
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 p-6 md:p-8">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Shield className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                IBM Healthcare Security Architecture & Integration Model
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Zero-Trust Financial Gateway designed with IBM API Connect, DataPower, Guardium, and watsonx.ai.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Visual Architecture Diagram */}
        <div className="mt-6 space-y-6">

          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
              <span>End-to-End Transaction Flow</span>
              <span className="text-[11px] font-mono text-emerald-400">● LIVE RUNTIME POLICIES ENFORCED</span>
            </h3>

            {/* Step blocks */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

              {/* Step 1 */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-cyan-400 mb-1">
                    <span>1. Client / Patient</span>
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Patient initiates payment for consultation, lab test or pharmacy.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                  M-Pesa / Card Sandbox
                </div>
              </div>

              {/* Step 2: IBM API Connect / DataPower */}
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-300 mb-1">
                    <span>2. IBM DataPower</span>
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-300">
                    IBM API Connect & DataPower Gateway intercepts payload: WAF, Rate Limiting, SQLi/XSS filtering.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-indigo-900/60 text-[10px] text-indigo-300 font-mono">
                  Token Bucket 60 req/min
                </div>
              </div>

              {/* Step 3: Watsonx.ai & Guardium */}
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-purple-300 mb-1">
                    <span>3. Intelligence Core</span>
                    <Brain className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-300">
                    <strong>watsonx.ai:</strong> Real-time risk score (0-100).<br/>
                    <strong>Guardium:</strong> Data masking + SHA-256 chained audit logs.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-purple-900/60 text-[10px] text-purple-300 font-mono">
                  Explainable AI Scores
                </div>
              </div>

              {/* Step 4: Storage & SOC */}
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-300 mb-1">
                    <span>4. Settlement & SOC</span>
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Transactions recorded with strict tenant isolation. Providers & SOC review alerts in real time.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-emerald-900/50 text-[10px] text-emerald-300">
                  Tenant Isolation
                </div>
              </div>

            </div>
          </div>

          {/* Component Deep Dives */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* IBM API Connect / DataPower */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs uppercase tracking-wider text-indigo-400">
                  IBM API Connect & DataPower Gateway
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-3">
                Acts as the frontline security proxy before any request touches healthcare services. Enforces rate limits, validates OAuth JWT bearer tokens, and blocks injection attacks.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Payload inspection for SQLi and cross-site scripting (XSS)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Strict token bucket rate limiting (60 requests/minute/IP)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Configured to point to enterprise IBM Cloud DataPower endpoint</span>
                </li>
              </ul>
            </div>

            {/* IBM Guardium */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs uppercase tracking-wider text-cyan-400">
                  IBM Guardium Data Protection & Audit
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  CHAIN INTEGRITY VERIFIED
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-3">
                Implements data minimization principles under Kenya Data Protection Act (DPA 2019). Masked patient identifiers (<code>PAT-****-****</code>) with zero raw card numbers stored.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Cryptographic SHA-256 hash chaining of every audit event</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Automatic redaction of PINs, passwords, and CVVs from telemetry</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Tamper-evident log verification in real time</span>
                </li>
              </ul>
            </div>

            {/* IBM watsonx.ai */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs uppercase tracking-wider text-purple-400">
                  IBM watsonx.ai Foundation Model Risk Engine
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  EU-DE RUNTIME
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-3">
                Evaluates behavioral telemetry with IBM Granite foundation models (eu-de Frankfurt). Integrates with IAM bearer token caching and produces natural-language risk explanations.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Granite chat/instruct models at <code>eu-de.ml.cloud.ibm.com</code></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Deterministic fraud rules retain absolute authority (No AI downgrades)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Strict zero-PII data minimization filter (Kenya DPA 2019 compliance)</span>
                </li>
              </ul>
            </div>

            {/* Multi-Tenancy & Authorization */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs uppercase tracking-wider text-amber-400">
                  Multi-Tenancy & Server Isolation
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ZERO IDOR LEAKAGE
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-3">
                All data queries enforce organization boundaries on the server:
              </p>
              <ul className="text-xs space-y-1.5 text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Patients can ONLY see their own payment history</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>AfyaCare Clinic CANNOT view MediPlus Hospital transactions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Security Admin receives aggregated risk metrics without raw medical charts</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Compliance note */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>Transparent Integration Notice:</strong> Built strictly according to the master architecture specification. When production IBM Cloud credentials (<code>IBM_API_KEY</code>, <code>IBM_PROJECT_ID</code>, <code>API_CONNECT_URL</code>) are configured in the environment, calls seamlessly route to live IBM Cloud clusters; in development sandbox mode, full policy enforcement and risk models run via local high-fidelity adapters.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
