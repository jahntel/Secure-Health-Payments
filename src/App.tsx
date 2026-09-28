import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { PatientView } from './components/PatientView.tsx';
import { ProviderDashboard } from './components/ProviderDashboard.tsx';
import { SecurityAdminView } from './components/SecurityAdminView.tsx';
import { ArchitectureModal } from './components/ArchitectureModal.tsx';
import { 
  ShieldCheck, 
  HelpCircle, 
  ExternalLink, 
  Cpu, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  PlayCircle,
  FileCode,
  Sparkles
} from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, loading, quickSwitchRole } = useAuth();
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [showDemoGuide, setShowDemoGuide] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono">Initializing IBM Security Policies & Gateway...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Top Navbar with quick role switcher */}
      <Navbar
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onSimulationTriggered={(data) => {
          // If in patient mode, we can suggest viewing provider or admin dashboard
        }}
        activeTab={user?.role || 'PATIENT'}
        setActiveTab={(tab: string) => quickSwitchRole(tab as any)}
      />

      {/* Hackathon Demo Walkthrough Ribbon */}
      {showDemoGuide && (
        <div className="bg-indigo-950/40 border-b border-indigo-800/40 text-xs py-2.5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-indigo-300">
              <PlayCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong className="text-white">3-Minute Hackathon Demo Flow:</strong> 1. As <em>Patient</em>, pay KES 1,500 for AfyaCare Consultation → 2. Switch to <em>Provider</em> to see cleared ledger → 3. Click <strong>"Simulate Attack"</strong> (KES 75,000 anomaly) → 4. Switch to <em>Security Admin</em> to inspect quarantined incident & SHA-256 Guardium chain.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsArchitectureOpen(true)}
                className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 text-[11px]"
              >
                Architecture Specs
              </button>
              <button
                onClick={() => setShowDemoGuide(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {user?.role === 'PATIENT' && <PatientView />}
        {user?.role === 'PROVIDER' && <ProviderDashboard />}
        {user?.role === 'SECURITY_ADMIN' && <SecurityAdminView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-slate-400 font-semibold">Secure Health Payments Gateway</span>
            <span>— "Protecting every healthcare payment: from transaction to trust."</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-cyan-400" /> Kenya DPA 2019 Ready
            </span>
            <span className="text-slate-700">•</span>
            <span>IBM watsonx.ai & Guardium Model</span>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => setIsArchitectureOpen(true)}
              className="text-indigo-400 hover:underline"
            >
              System Blueprint
            </button>
          </div>
        </div>
      </footer>

      {/* Architecture & Policies Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
        gatewayInfo={{}}
      />

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
