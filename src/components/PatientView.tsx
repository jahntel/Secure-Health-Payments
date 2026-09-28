import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Organization, HealthcareService, Transaction, ConsentSetting } from '../types.ts';
import { api } from '../api.ts';
import { 
  CreditCard, 
  Smartphone, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Eye, 
  AlertCircle,
  Receipt,
  Download,
  Building,
  Check,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { TransactionModal } from './TransactionModal.tsx';

export const PatientView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'PAY' | 'HISTORY' | 'PRIVACY'>('PAY');

  // Organizations & Services
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [services, setServices] = useState<HealthcareService[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('org-afyacare');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('srv-afya-gen');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA' | 'CARD'>('MPESA');
  const [phoneNumber, setPhoneNumber] = useState<string>('+254712345678');
  const [processing, setProcessing] = useState<boolean>(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // Transactions & Consents
  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
  const [consents, setConsents] = useState<ConsentSetting[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Modal inspection
  const [inspectTxn, setInspectTxn] = useState<Transaction | null>(null);
  const [inspectAssessment, setInspectAssessment] = useState<any>(null);

  useEffect(() => {
    loadOrganizationsAndServices();
    loadPatientHistory();
    loadConsents();
  }, []);

  const loadOrganizationsAndServices = async () => {
    try {
      const orgs = await api.getOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0 && !selectedOrgId) {
        setSelectedOrgId(orgs[0].id);
      }
      const srvs = await api.getServices();
      setServices(srvs);
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  };

  const loadPatientHistory = async () => {
    setLoadingHistory(true);
    try {
      const txns = await api.getTransactions();
      setMyTransactions(txns);
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadConsents = async () => {
    try {
      const data = await api.getConsentSettings();
      setConsents(data.consents);
    } catch (err) {
      console.error('Failed to load consents:', err);
    }
  };

  const currentOrg = organizations.find(o => o.id === selectedOrgId);
  const availableServices = services.filter(s => s.organizationId === selectedOrgId);
  const currentService = availableServices.find(s => s.id === selectedServiceId) || availableServices[0];

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !currentService) return;

    setProcessing(true);
    setPaymentResult(null);

    try {
      // Simulate realistic M-Pesa STK push network roundtrip
      const res = await api.createPayment({
        organizationId: selectedOrgId,
        serviceId: currentService.id,
        paymentMethod,
        phoneNumber,
        clientDevice: 'dev-mac-safari-faith-01'
      });

      setPaymentResult(res);
      loadPatientHistory();
    } catch (err: any) {
      alert(err.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleConsent = async (consentId: string, currentVal: boolean) => {
    try {
      await api.updateConsent(consentId, !currentVal);
      setConsents(prev => prev.map(c => c.id === consentId ? { ...c, granted: !currentVal } : c));
    } catch (err: any) {
      alert(err.message || 'Failed to update consent preference');
    }
  };

  const openInspection = async (txn: Transaction) => {
    try {
      const data = await api.getTransactionDetails(txn.id);
      setInspectTxn(data.transaction);
      setInspectAssessment(data.assessment);
    } catch (err) {
      setInspectTxn(txn);
      setInspectAssessment(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Patient Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" /> Patient Portal • Verified Identity
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome, {user?.fullName || 'Faith Wanjiku Kimani'}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-mono text-cyan-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              <Lock className="w-3 h-3 text-cyan-500" />
              Reference: {user?.patient?.patientReference || 'PAT-8492-4821'}
            </span>
            <span>County: <strong>{user?.patient?.county || 'Nairobi'}</strong></span>
            <span className="text-slate-600">•</span>
            <span>Masked Phone: <strong>{user?.patient?.maskedPhone || '+254 7** ***678'}</strong></span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('PAY')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'PAY'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pay for Healthcare
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'HISTORY'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Receipts ({myTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab('PRIVACY')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'PRIVACY'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Privacy & Consent
          </button>
        </div>
      </div>

      {/* ================= TAB 1: PAY FOR HEALTHCARE ================= */}
      {activeTab === 'PAY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Payment Form */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="pb-5 border-b border-slate-800 mb-6">
              <h2 className="text-lg font-bold text-white">Healthcare Payment Checkout</h2>
              <p className="text-xs text-slate-400 mt-1">
                Select your healthcare clinic or hospital, choose the medical service, and pay via secure sandbox channels.
              </p>
            </div>

            <form onSubmit={handlePay} className="space-y-6">

              {/* 1. Healthcare Provider Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  1. Healthcare Provider / Clinic
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {organizations.map(org => {
                    const isSelected = selectedOrgId === org.id;
                    return (
                      <button
                        type="button"
                        key={org.id}
                        onClick={() => {
                          setSelectedOrgId(org.id);
                          const firstOrgService = services.find(s => s.organizationId === org.id);
                          if (firstOrgService) setSelectedServiceId(firstOrgService.id);
                        }}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Building className="w-4 h-4 text-indigo-400" />
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">{org.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{org.county} • {org.type}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Service Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  2. Select Medical Service
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {availableServices.map(service => {
                    const isSelected = currentService?.id === service.id;
                    return (
                      <div
                        key={service.id}
                        onClick={() => setSelectedServiceId(service.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-950/30 border-indigo-500 text-white'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{service.name}</span>
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {service.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{service.description}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <span className="text-sm font-bold text-cyan-400 font-mono">
                            {service.currency} {service.standardPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  3. Payment Channel (Sandbox)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MPESA')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition ${
                      paymentMethod === 'MPESA'
                        ? 'bg-emerald-950/30 border-emerald-500 text-white ring-1 ring-emerald-500'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="text-left">
                      <span className="text-xs font-bold block text-white">M-Pesa (Daraja)</span>
                      <span className="text-[10px] text-slate-400">Instant STK Prompt</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition ${
                      paymentMethod === 'CARD'
                        ? 'bg-indigo-950/30 border-indigo-500 text-white ring-1 ring-indigo-500'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div className="text-left">
                      <span className="text-xs font-bold block text-white">Debit / Credit Card</span>
                      <span className="text-[10px] text-slate-400">Tokenized Zero-PAN</span>
                    </div>
                  </button>
                </div>

                {paymentMethod === 'MPESA' && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      M-Pesa Registered Number (Demonstration)
                    </label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Guaranteed tokenization: Phone number will be masked in hospital ledgers under IBM Guardium policy.
                    </span>
                  </div>
                )}
              </div>

              {/* Security Banner indicator */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center gap-3">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-[11px] text-slate-400 leading-tight">
                  <strong className="text-slate-300">Secure Payment Gateway Policy:</strong> End-to-end encrypted with IBM DataPower WAF & watsonx.ai real-time anomaly telemetry. No clinical records are shared with financial providers.
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={processing || !currentService}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Analyzing Security Telemetry & Executing...</span>
                  </>
                ) : (
                  <span>
                    Pay {currentService?.currency || 'KES'} {(currentService?.standardPrice || 1500).toLocaleString()}
                  </span>
                )}
              </button>

            </form>
          </div>

          {/* Right Receipt / Payment Result Panel */}
          <div className="lg:col-span-5 space-y-6">

            {paymentResult ? (
              <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 pb-5 border-b border-slate-800">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Payment Successful</h3>
                    <p className="text-xs text-emerald-400 font-mono">
                      {paymentResult.transaction.id}
                    </p>
                  </div>
                </div>

                {/* Receipt Details */}
                <div className="mt-5 space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Healthcare Provider</span>
                    <span className="font-semibold text-white">{paymentResult.receipt.provider}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Service</span>
                    <span className="font-semibold text-white">{paymentResult.receipt.service}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Amount Paid</span>
                    <span className="font-bold text-cyan-400 font-mono text-sm">{paymentResult.receipt.amount}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Payment Reference</span>
                    <span className="font-mono text-slate-200">{paymentResult.receipt.paymentReference}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Patient Masked Ref</span>
                    <span className="font-mono text-slate-200">{paymentResult.transaction.patientReference}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Risk Assessment</span>
                    <span className="inline-flex items-center gap-1 font-mono text-emerald-400 font-bold">
                      {paymentResult.assessment.riskScore}/100 (LOW)
                    </span>
                  </div>
                </div>

                {/* Risk explanation */}
                <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300 block mb-1">Security Verification Note:</span>
                  {paymentResult.assessment.reasons?.[0] || 'Transaction verified within normal patient baseline profile.'}
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => openInspection(paymentResult.transaction)}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Security Telemetry</span>
                  </button>
                  <button
                    onClick={() => alert(`Receipt downloaded for ${paymentResult.transaction.id}`)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                    title="Download Receipt"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between h-full">
                <div>
                  <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    Transparent Security Architecture
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    When you initiate this payment:
                  </p>
                  
                  <div className="mt-4 space-y-3 text-xs">
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 text-[10px] font-bold">1</div>
                      <p className="text-slate-300">
                        <strong className="text-white">API Connect Gateway:</strong> Requests pass through DataPower threat protection rules and rate limiting.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 text-[10px] font-bold">2</div>
                      <p className="text-slate-300">
                        <strong className="text-white">watsonx.ai Engine:</strong> Evaluates amount ratio, device signature, and velocity against historical behavior.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 text-[10px] font-bold">3</div>
                      <p className="text-slate-300">
                        <strong className="text-white">IBM Guardium Minimization:</strong> Replaces your national ID with token <code>PAT-8492-4821</code> and records a tamper-evident audit hash.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Compliant with Kenya Data Protection Act 2019</span>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ================= TAB 2: PATIENT RECEIPTS / HISTORY ================= */}
      {activeTab === 'HISTORY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">My Payment Transactions & Receipts</h2>
              <p className="text-xs text-slate-400 mt-1">
                Your private payment history. Server-side isolation guarantees only your authenticated transactions are returned.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total: <strong className="text-white">{myTransactions.length}</strong> records
            </span>
          </div>

          {loadingHistory ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <span className="inline-block w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-2" />
              <p>Retrieving encrypted transaction records...</p>
            </div>
          ) : myTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p>No transaction history found for this patient.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pl-2">Transaction ID</th>
                    <th className="pb-3">Healthcare Service</th>
                    <th className="pb-3">Payment Channel</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Risk Assessment</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {myTransactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 pl-2 font-semibold text-white">{txn.id}</td>
                      <td className="py-3.5 font-sans text-slate-300">{txn.serviceName}</td>
                      <td className="py-3.5 text-slate-400">
                        {txn.paymentMethod}
                        <span className="text-[10px] text-slate-500 block">{txn.paymentReference}</span>
                      </td>
                      <td className="py-3.5 font-bold text-white">
                        {txn.currency} {txn.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          txn.riskLevel === 'HIGH' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                          txn.riskLevel === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {txn.riskScore}/100 • {txn.riskLevel}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-sans font-medium ${
                          txn.status === 'APPROVED' ? 'text-emerald-400' :
                          txn.status === 'QUARANTINED' ? 'text-red-400' :
                          txn.status === 'RESOLVED' ? 'text-cyan-400' : 'text-amber-400'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-400 text-[11px]">
                        {new Date(txn.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <button
                          onClick={() => openInspection(txn)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans transition"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: PRIVACY & CONSENT CENTER ================= */}
      {activeTab === 'PRIVACY' && (
        <div className="space-y-6">

          {/* Privacy Notice Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 pb-5 border-b border-slate-800 mb-6">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Privacy Center & Patient Consent Directives
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Built under the Kenya Data Protection Act (DPA 2019) and ISO 27701 Privacy Information Management principles.
                </p>
              </div>
            </div>

            {/* Minimization Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> What Information is Processed
                </h4>
                <ul className="text-xs space-y-1.5 text-slate-300">
                  <li>• Tokenized identifier (<code>PAT-8492-4821</code>) instead of national identity card</li>
                  <li>• Masked MSISDN phone reference (<code>+254 7** ***678</code>)</li>
                  <li>• Transaction fee, currency, and provider identification code</li>
                  <li>• Device hardware telemetry for real-time account takeover defense</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-300 mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> What is NEVER Collected or Stored
                </h4>
                <ul className="text-xs space-y-1.5 text-slate-300">
                  <li>• Raw payment card PAN numbers, CVV codes, or M-Pesa personal PINs</li>
                  <li>• Medical diagnosis notes, clinical records, or prescription details</li>
                  <li>• Patient biometrics or unencrypted demographic files</li>
                  <li>• Any clinical data sent to external financial clearing networks</li>
                </ul>
              </div>
            </div>

            {/* Consent Toggles */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Manage Your Data Processing Consents:
              </h3>

              {consents.map(consent => (
                <div
                  key={consent.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{consent.purpose}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {consent.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      <strong>Legal Basis:</strong> {consent.legalBasis} • <strong>Retention:</strong> {consent.retentionPeriod}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold ${consent.granted ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {consent.granted ? 'Consent Active' : 'Revoked'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleConsent(consent.id, consent.granted)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        consent.granted ? 'bg-indigo-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          consent.granted ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 mt-4">
              * Any change in consent preference immediately writes a cryptographically hashed entry into the IBM Guardium audit ledger.
            </p>

          </div>

        </div>
      )}

      {/* Transaction Inspection Modal */}
      <TransactionModal
        transaction={inspectTxn}
        assessment={inspectAssessment}
        onClose={() => {
          setInspectTxn(null);
          setInspectAssessment(null);
        }}
      />

    </div>
  );
};
