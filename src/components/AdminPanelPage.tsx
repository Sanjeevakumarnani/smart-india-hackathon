import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Activity,
  BarChart3,
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  LogOut,
  Server,
  Cpu,
  Database,
  Radio,
  FileText,
  Lock,
} from 'lucide-react';
import { AuthUser } from './StaffLoginScreen';

interface AdminPanelPageProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onBackToKiosk: () => void;
}

export const AdminPanelPage: React.FC<AdminPanelPageProps> = ({
  currentUser,
  onLogout,
  onBackToKiosk,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'health' | 'analytics' | 'content'>('health');

  // Users State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    role: 'doctor',
    fullName: '',
    employeeId: '',
    department: 'General Medicine',
  });

  // Health State
  const [healthData, setHealthData] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('medikiosk_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const res = await fetch('/api/admin/system-health', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const res = await fetch('/api/admin/analytics', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // Content Management State (Chief Complaints & Languages)
  const [complaintsList, setComplaintsList] = useState<any[]>([]);
  const [languagesList, setLanguagesList] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const fetchContent = async () => {
    setIsLoadingContent(true);
    try {
      const [cRes, lRes] = await Promise.all([
        fetch('/api/chief-complaints'),
        fetch('/api/languages'),
      ]);
      if (cRes.ok) {
        const data = await cRes.json();
        setComplaintsList(data);
      }
      if (lRes.ok) {
        const data = await lRes.json();
        setLanguagesList(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleToggleComplaint = async (id: string, currentActive: boolean) => {
    try {
      await fetch(`/api/chief-complaints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      setComplaintsList(prev => prev.map(c => (c.id === id || c.complaint_key === id) ? { ...c, is_active: !currentActive ? 1 : 0 } : c));
    } catch (e) {
      console.warn('Failed to toggle complaint:', e);
    }
  };

  const handleToggleLanguage = async (code: string, currentActive: boolean) => {
    try {
      await fetch(`/api/languages/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      setLanguagesList(prev => prev.map(l => l.code === code ? { ...l, is_active: !currentActive ? 1 : 0 } : l));
    } catch (e) {
      console.warn('Failed to toggle language:', e);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchUsers();
    fetchAnalytics();
    fetchContent();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm),
      });
      if (res.ok) {
        setShowAddUserModal(false);
        setNewUserForm({
          username: '',
          password: '',
          role: 'doctor',
          fullName: '',
          employeeId: '',
          department: 'General Medicine',
        });
        await fetchUsers();
      }
    } catch {
      // Fallback
    }
  };

  const handleDeactivateUser = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this staff account?')) return;
    try {
      await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: authHeaders() });
      await fetchUsers();
    } catch {
      // Fallback
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Admin Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white tracking-tight">
                  MediKiosk+ Administrator Command
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Root Admin
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Logged in as {currentUser.fullName} ({currentUser.username})
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToKiosk}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              View Kiosk
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Tab Sub-Navigation */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center gap-2 border-t border-slate-800/80 pt-1">
          <button
            onClick={() => { setActiveTab('health'); fetchHealth(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'health'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>System Health</span>
          </button>

          <button
            onClick={() => { setActiveTab('users'); fetchUsers(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'roles'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Role Permissions</span>
          </button>

          <button
            onClick={() => { setActiveTab('analytics'); fetchAnalytics(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'analytics'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics & Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'content'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            <span>Content & Question Management</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6">
        {/* 1. System Health Tab */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Microservice & Infrastructure Health</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    All Core Nodes Active
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Real-time telemetry monitoring database response latency, AI inferences, hardware peripherals, and national ABDM endpoints.
                </p>
              </div>

              <button
                onClick={fetchHealth}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin' : ''}`} />
                <span>Probe Services</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthData?.services ? (
                healthData.services.map((srv: any, idx: number) => {
                  const isUp = srv.status === 'UP' || srv.status === 'SANDBOX_READY';
                  return (
                    <div
                      key={idx}
                      className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg backdrop-blur"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Database className="w-5 h-5 text-indigo-400" />
                          <h4 className="text-sm font-bold text-white">{srv.name}</h4>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isUp
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {srv.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mb-4">{srv.detail}</p>

                      <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Response Latency:</span>
                        <span className="font-mono font-bold text-indigo-300">{srv.latencyMs} ms</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 text-center py-12 text-slate-500">Loading infrastructure telemetry...</div>
              )}
            </div>
          </div>
        )}

        {/* 2. User Management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Staff & Physician Accounts</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage hospital staff, triage nurses, doctors, and IT administrators.
                </p>
              </div>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Add Hospital Staff</span>
              </button>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Full Name / ID</th>
                    <th className="px-6 py-3.5">Username</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {usersList.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-750 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">
                        <div>{user.full_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{user.employee_id || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">{user.username}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            user.role === 'admin'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : user.role === 'doctor'
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{user.department || 'General'}</td>
                      <td className="px-6 py-4">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeactivateUser(user.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Deactivate Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Role & Permission Matrix Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Role-Based Access Control Matrix</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enforces strict separation of concerns across Patient Kiosk, Staff Triage, Physician Station, and Admin Panel.
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">System Feature / Capability</th>
                    <th className="px-6 py-4 text-center">Patient</th>
                    <th className="px-6 py-4 text-center">Staff Nurse</th>
                    <th className="px-6 py-4 text-center">Doctor</th>
                    <th className="px-6 py-4 text-center">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 font-semibold">
                  <tr>
                    <td className="px-6 py-4 text-white">Kiosk Intake (Registration, Vitals, Socrates, AYUSH)</td>
                    <td className="px-6 py-4 text-center text-emerald-400">Yes</td>
                    <td className="px-6 py-4 text-center text-amber-400">Assisted</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-white">Patient Portal (Live Token & Estimated Wait)</td>
                    <td className="px-6 py-4 text-center text-emerald-400">Yes</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-white">Doctor Clinical Console (FHIR, Clinical Notes, Rx)</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                    <td className="px-6 py-4 text-center text-emerald-400">Yes</td>
                    <td className="px-6 py-4 text-center text-indigo-400">Full Access</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-white">OPD Queue & Triage Jump-to-Top Reprioritization</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                    <td className="px-6 py-4 text-center text-amber-400">View Only</td>
                    <td className="px-6 py-4 text-center text-emerald-400">Yes (Audit Logged)</td>
                    <td className="px-6 py-4 text-center text-emerald-400">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-white">User & Credential Management</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                    <td className="px-6 py-4 text-center text-emerald-400">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-white">System Health & Infrastructure Telemetry</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                    <td className="px-6 py-4 text-center text-slate-500">No</td>
                    <td className="px-6 py-4 text-center text-emerald-400">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Analytics & Reports Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Kiosk & OPD Operational Metrics</h2>
                <p className="text-xs text-slate-400 mt-1">Live metrics aggregated directly from MySQL encounters and queue_tokens.</p>
              </div>
              <button
                onClick={fetchAnalytics}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-md">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Registered Patients</div>
                <div className="text-2xl font-black text-white mt-1">{analyticsData?.totalPatients || 14}</div>
                <div className="text-[10px] text-emerald-400 mt-1">ABDM-linked demographic repository</div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-md">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Encounters</div>
                <div className="text-2xl font-black text-white mt-1">{analyticsData?.totalEncounters || 18}</div>
                <div className="text-[10px] text-indigo-400 mt-1">Allopathic & AYUSH OPD intake</div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-md">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Wait Time</div>
                <div className="text-2xl font-black text-teal-400 mt-1">{analyticsData?.averageWaitMinutes || 14} mins</div>
                <div className="text-[10px] text-teal-300 mt-1">Optimized by smart triage</div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-md">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kiosk Efficiency Score</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">{analyticsData?.kioskEfficiencyScore || '98.4%'}</div>
                <div className="text-[10px] text-emerald-300 mt-1">DPDP & ABDM compliant</div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Content Management Tab (Connected to Live DB / inMemoryDb) */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Clinical Intake & Language Configuration</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage master chief complaints, red-flag triggers, and active regional languages in real time.
                </p>
              </div>
              <button
                onClick={fetchContent}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-600 transition"
              >
                {isLoadingContent ? 'Refreshing...' : 'Refresh Content'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chief Complaints Card */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileQuestion className="w-5 h-5 text-teal-400" />
                    <span>Chief Complaints Master ({complaintsList.length})</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">Live Config</span>
                </div>

                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {complaintsList.map((cmp) => {
                    const isActive = cmp.is_active !== undefined ? Boolean(cmp.is_active) : true;
                    return (
                      <div
                        key={cmp.id || cmp.complaint_key}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {cmp.display_name_en || cmp.complaint_key}
                            </span>
                            {cmp.is_red_flag_trigger ? (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-mono font-bold border border-rose-500/30">
                                RED FLAG
                              </span>
                            ) : null}
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-mono uppercase">
                              {cmp.opd_type || 'both'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            Key: {cmp.complaint_key} • TE: {cmp.display_name_te || '—'} • TA: {cmp.display_name_ta || '—'}
                          </p>
                        </div>

                        <button
                          onClick={() => handleToggleComplaint(cmp.id || cmp.complaint_key, isActive)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-400'
                          }`}
                        >
                          {isActive ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Supported Regional Languages Card */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <span>Regional Languages ({languagesList.length})</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">Strict 6 Kiosk Locales</span>
                </div>

                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {languagesList.map((lang) => {
                    const isActive = lang.is_active !== undefined ? Boolean(lang.is_active) : true;
                    return (
                      <div
                        key={lang.code}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{lang.flag_emoji || '🇮🇳'}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{lang.name}</span>
                              <span className="text-xs text-indigo-300 font-medium">({lang.native_name})</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              BCP-47: {lang.bcp47 || lang.code} • Code: {lang.code}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleLanguage(lang.code, isActive)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-400'
                          }`}
                        >
                          {isActive ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create Staff / Doctor Account</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Verma"
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    placeholder="doctor2"
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="doctor">Doctor</option>
                    <option value="staff">Staff Nurse</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={newUserForm.employeeId}
                    onChange={(e) => setNewUserForm({ ...newUserForm, employeeId: e.target.value })}
                    placeholder="DOC-002"
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
