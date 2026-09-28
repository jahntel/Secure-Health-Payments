import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Shield, ShieldAlert, Cpu, Activity, User, Building, LogOut, CheckCircle, ChevronDown, Zap } from 'lucide-react';
import { UserRole } from '../types.ts';
import { api } from '../api.ts';

interface NavbarProps {
  onOpenArchitecture: () => void;
  onSimulationTriggered: (data: any) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenArchitecture,
  onSimulationTriggered,
  activeTab,
  setActiveTab
}) => {
  const { user, quickSwitchRole, logout } = useAuth();
  const [simulating, setSimulating] = useState(false);
  const [simAlert, setSimAlert] = useState<string | null>(null);

  const handleSimulateAttack = async () => {
    setSimulating(true);
    try {
      const res = await api.simulateSuspiciousTransaction();
      setSimAlert(`🚨 HIGH RISK TRANSACTION GENERATED (${res.transaction.currency} ${res.transaction.amount.toLocaleString()} - Score: ${res.assessment.riskScore}/100)`);
      onSimulationTriggered(res);
      setTimeout(() => setSimAlert(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const roles: { role: UserRole; label: string; desc: string; icon: any }[] = [
    { role: 'PATIENT', label: 'Patient View', desc: 'Faith Kimani', icon: User },
    { role: 'PROVIDER', label: 'Hospital Provider', desc: 'AfyaCare Clinic', icon: Building },
    { role: 'SECURITY_ADMIN', label: 'Security Admin / SOC', desc: 'CISO Amina Noor', icon: Shield }
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      
      {/* Simulation Alert Banner */}
      {simAlert && (
        <div className="bg-red-500/15 border-b border-red-500/40 text-red-300 text-xs px-4 py-2 font-mono flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
            <span className="font-semibold">{simAlert}</span>
            <span className="text-slate-400 text-[11px] ml-auto">Flagged by IBM watsonx.ai Engine • Quarantined</span>
          </div>
        </div>
      )}

      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white uppercase">Secure Health</span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  PAYMENTS GATEWAY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>IBM DataPower & Guardium Secured</span>
              </p>
            </div>
          </div>

          {/* Center Role Switcher (Hackathon judging switcher) */}
          <div className="hidden lg:flex items-center gap-1 p-1 bg-slate-950/70 border border-slate-800/80 rounded-xl">
            {roles.map(r => {
              const isActive = user?.role === r.role;
              const Icon = r.icon;
              return (
                <button
                  key={r.role}
                  onClick={() => quickSwitchRole(r.role)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <div className="text-left">
                    <span className="block leading-none">{r.label}</span>
                    <span className={`text-[10px] opacity-75 block mt-0.5 leading-none ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {r.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2.5">

            {/* Architecture Modal Trigger */}
            <button
              onClick={onOpenArchitecture}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 transition"
              title="View IBM Security Architecture & Gateway Policies"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>IBM Architecture</span>
            </button>

            {/* Hackathon Attack Simulation Button */}
            <button
              onClick={handleSimulateAttack}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-md shadow-red-950/40 transition active:scale-95 disabled:opacity-50"
              title="Simulate suspicious payment attack for hackathon demo"
            >
              <Zap className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : 'text-amber-200'}`} />
              <span>{simulating ? 'Simulating...' : 'Simulate Attack'}</span>
            </button>

          </div>

        </div>

        {/* Mobile / Tablet Role Switcher */}
        <div className="lg:hidden flex items-center justify-between py-2 border-t border-slate-800/80 overflow-x-auto gap-2">
          {roles.map(r => {
            const isActive = user?.role === r.role;
            const Icon = r.icon;
            return (
              <button
                key={r.role}
                onClick={() => quickSwitchRole(r.role)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
