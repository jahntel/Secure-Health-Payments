import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Transaction, DashboardMetrics, SecurityEvent } from '../types.ts';
import { api } from '../api.ts';
import { 
  Building2, 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Filter, 
  Search, 
  Eye, 
  Clock, 
  Shield, 
  Lock, 
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { TransactionModal } from './TransactionModal.tsx';

export const ProviderDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Transaction for modal
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, txns] = await Promise.all([
        api.getDashboardMetrics(),
        api.getTransactions()
      ]);
      setMetrics(m);
      setTransactions(txns);
    } catch (err) {
      console.error('Failed to load provider dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInspect = async (txn: Transaction) => {
    try {
      const data = await api.getTransactionDetails(txn.id);
      setSelectedTxn(data.transaction);
      setSelectedAssessment(data.assessment);
    } catch (err) {
      setSelectedTxn(txn);
      setSelectedAssessment(null);
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (filterStatus === 'FLAGGED' && t.status !== 'FLAGGED') return false;
    if (filterStatus === 'HIGH_RISK' && t.riskLevel !== 'HIGH') return false;
    if (filterStatus === 'APPROVED' && t.status !== 'APPROVED') return false;
    if (filterStatus === 'RESOLVED' && t.status !== 'RESOLVED') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.patientReference.toLowerCase().includes(q) ||
        t.serviceName.toLowerCase().includes(q) ||
        t.paymentReference.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
            <Building2 className="w-4 h-4" /> Healthcare Provider Dashboard • Tenant Isolated
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {user?.organization?.name || 'AfyaCare Clinic'} — Payment Security
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <strong className="text-slate-200">{user?.fullName || 'Dr. Kevin Ochieng'}</strong> • Strict multi-tenant data boundaries enforced on the server.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top 5 Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

        {/* 1. Total Transactions */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Total Transactions
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-white">
              {metrics?.totalTransactions || 0}
            </span>
            <span className="text-xs text-slate-400">All-time</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Tenant: {user?.organizationId || 'org-afyacare'}
          </span>
        </div>

        {/* 2. Today's Revenue */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Today's Revenue
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              KES {(metrics?.todayRevenue || 0).toLocaleString()}
            </span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            ✓ Cleared & Reconciled
          </span>
        </div>

        {/* 3. Flagged Transactions */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Flagged for Review
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {metrics?.flaggedCount || 0}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[11px] text-amber-400/80 mt-1 block">
            Medium risk telemetry
          </span>
        </div>

        {/* 4. High-Risk / Quarantined */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            High-Risk Quarantined
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-red-400">
              {metrics?.highRiskCount || 0}
            </span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-[11px] text-red-400/80 mt-1 block">
            Action required by SOC
          </span>
        </div>

        {/* 5. Payment Success Rate */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Success Rate
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {metrics?.successRate || 100}%
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">
            High Gateway Throughput
          </span>
        </div>

      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Risk Distribution Breakdown */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Transaction Risk Profile Distribution</h3>
              <p className="text-xs text-slate-400">Telemetry categorized by real-time risk scores</p>
            </div>
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {metrics?.riskDistribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.riskDistribution}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {metrics.riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">Loading chart data...</p>
            )}
          </div>
        </div>

        {/* Payment Channels Pie Chart */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Payment Channel Settlement</h3>
              <p className="text-xs text-slate-400">Breakdown across M-Pesa, Card, and Insurance</p>
            </div>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {metrics?.paymentMethods ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {metrics.paymentMethods.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">Loading chart data...</p>
            )}
          </div>
        </div>

      </div>

      {/* Transaction Table with Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">Organization Payment Ledger</h2>
            <p className="text-xs text-slate-400 mt-1">
              All transactions evaluated for {user?.organization?.name || 'AfyaCare Clinic'}. Identifiers masked under IBM Guardium policy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Txn, Ref, Service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              {['ALL', 'APPROVED', 'FLAGGED', 'HIGH_RISK', 'RESOLVED'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    filterStatus === st ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="pb-3 pl-2">Transaction ID</th>
                <th className="pb-3">Patient Ref (Masked)</th>
                <th className="pb-3">Service</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Payment Channel</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Risk Assessment</th>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3 pr-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredTransactions.map(txn => (
                <tr key={txn.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 pl-2 font-semibold text-white">{txn.id}</td>
                  <td className="py-3.5 text-cyan-400 flex items-center gap-1 font-semibold">
                    <Lock className="w-3 h-3 text-cyan-500" />
                    {txn.patientReference}
                  </td>
                  <td className="py-3.5 font-sans text-slate-300 max-w-[180px] truncate" title={txn.serviceName}>
                    {txn.serviceName}
                  </td>
                  <td className="py-3.5 font-bold text-white">
                    {txn.currency} {txn.amount.toLocaleString()}
                  </td>
                  <td className="py-3.5 text-slate-400">
                    {txn.paymentMethod}
                    <span className="text-[10px] text-slate-500 block">{txn.paymentReference}</span>
                  </td>
                  <td className="py-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-sans font-semibold ${
                      txn.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      txn.status === 'QUARANTINED' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                      txn.status === 'RESOLVED' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      txn.riskLevel === 'HIGH' ? 'text-red-400' :
                      txn.riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {txn.riskScore}/100 • {txn.riskLevel}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-400 text-[11px]">
                    {new Date(txn.createdAt).toLocaleDateString()} {new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3.5 pr-2 text-right">
                    <button
                      onClick={() => handleInspect(txn)}
                      className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-sans transition flex items-center gap-1.5 ml-auto"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{txn.status === 'FLAGGED' || txn.status === 'QUARANTINED' ? 'Review Flag' : 'Inspect'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Transaction Details & Review Modal */}
      <TransactionModal
        transaction={selectedTxn}
        assessment={selectedAssessment}
        onClose={() => {
          setSelectedTxn(null);
          setSelectedAssessment(null);
        }}
        onResolved={loadData}
        canResolve={true}
      />

    </div>
  );
};
