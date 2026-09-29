import React, { useState, useEffect } from 'react';
import { School, Position, Candidate, StudentVoter, SchoolElectionResults } from '../types';
import {
  getPositionsBySchool,
  savePosition,
  deletePosition,
  getCandidatesBySchool,
  saveCandidate,
  saveCandidateWithTypedPrefectTitle,
  deleteCandidate,
  getVotersBySchool,
  addPupilsToSchool,
  addPupilsToSchoolAsync,
  regenerateAllVoterIds,
  regenerateAllVoterIdsAsync,
  getSchoolElectionResults,
  resetSchoolVotes,
  updateSchool,
  renewSchoolLicense,
  isSchoolLicenseActive,
  exportSchoolDatabaseJson,
  DEFAULT_AVATARS,
  AVATAR_3D_COLLECTION,
  OFFICIAL_PAYPAL_URL,
  OFFICIAL_PAYMENT_GATEWAY,
  OFFICIAL_PAYMENT_RECIPIENT,
  OFFICIAL_LICENSE_FEE
} from '../services/storage';
import { SecurePaymentModal } from './SecurePaymentModal';
import {
  Users,
  Vote,
  Award,
  BarChart3,
  Tv,
  Printer,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Upload,
  LogOut,
  Settings,
  Sparkles,
  Search,
  CreditCard,
  Calendar,
  Check,
  Copy,
  Smartphone,
  FileCheck2,
  Receipt,
  ExternalLink,
  Crown,
  Medal,
  Rotate3d
} from 'lucide-react';
import { MemonLogo } from './MemonLogo';

// High-fidelity candidate portrait assets
import FEMALE_PREFECT_IMG from '../assets/images/student_prefect_portrait_female_1790355660462.jpg';
import MALE_PREFECT_IMG from '../assets/images/student_prefect_portrait_male_1790355671730.jpg';

const getAdminCandPhoto = (cand?: any, index: number = 0) => {
  if (cand?.photoUrl && typeof cand.photoUrl === 'string' && cand.photoUrl.trim().length > 10) {
    return cand.photoUrl;
  }
  return index % 2 === 0 ? FEMALE_PREFECT_IMG : MALE_PREFECT_IMG;
};

interface AdminDashboardProps {
  school: School;
  onLogout: () => void;
  onOpenProjector: () => void;
  onOpenPrintCards: () => void;
}

type TabType = 'overview' | 'voters' | 'positions' | 'results' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  school: initialSchool,
  onLogout,
  onOpenProjector,
  onOpenPrintCards,
}) => {
  const [school, setSchool] = useState<School>(initialSchool);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // State collections
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voters, setVoters] = useState<StudentVoter[]>([]);
  const [results, setResults] = useState<SchoolElectionResults | null>(null);

  // Security password lock for results view
  const [isResultsUnlocked, setIsResultsUnlocked] = useState(false);
  const [resultsPasswordInput, setResultsPasswordInput] = useState('');
  const [resultsPasswordError, setResultsPasswordError] = useState<string | null>(null);

  // License & Payment State (50,000 UGX for 1 Month Vote)
  const [isRenewingLicense, setIsRenewingLicense] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Modals & form state
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const [positionForm, setPositionForm] = useState<{ id?: string; title: string; description: string }>({
    title: '',
    description: '',
  });

  // Candidate Registration - Type in prefect title directly (no dropdown required)
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [candidateForm, setCandidateForm] = useState<{
    id?: string;
    prefectTitle: string; // Typed directly by the school
    fullName: string;
    gradeOrClass: string;
    photoUrl: string;
    manifesto: string;
    ballotNumber: number;
  }>({
    prefectTitle: '',
    fullName: '',
    gradeOrClass: '',
    photoUrl: DEFAULT_AVATARS[0],
    manifesto: '',
    ballotNumber: 1,
  });

  // Pupil voters management state
  const [additionalPupilsCount, setAdditionalPupilsCount] = useState<number>(10);
  const [voterSearch, setVoterSearch] = useState('');
  const [voterFilter, setVoterFilter] = useState<'all' | 'unvoted' | 'voted'>('all');
  const [copiedVoterCode, setCopiedVoterCode] = useState<string | null>(null);

  // In-App Toast & Confirmation Modal (prevents window.alert/window.confirm blocked in sandboxed iframes)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

  const handleCopyVoterCode = (code: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedVoterCode(code);
        setTimeout(() => setCopiedVoterCode(null), 2000);
      }).catch(() => {});
    }
  };

  const refreshData = () => {
    const pos = getPositionsBySchool(school.id);
    const cand = getCandidatesBySchool(school.id);
    const vts = getVotersBySchool(school.id);
    const res = getSchoolElectionResults(school.id);

    setPositions(pos);
    setCandidates(cand);
    setVoters(vts);
    setResults(res);
  };

  useEffect(() => {
    refreshData();
  }, [school.id]);

  const licenseInfo = isSchoolLicenseActive(school);

  // Results Unlock check (as requested: entered with school's password)
  const handleUnlockResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (resultsPasswordInput === school.passwordHash) {
      setIsResultsUnlocked(true);
      setResultsPasswordError(null);
      setResults(getSchoolElectionResults(school.id));
    } else {
      setResultsPasswordError('Incorrect school password. Please enter the password you registered with.');
    }
  };

  // Position Handlers
  const handleSavePosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionForm.title.trim()) return;

    savePosition({
      id: positionForm.id,
      schoolId: school.id,
      title: positionForm.title.trim(),
      description: positionForm.description.trim(),
      order: positions.length + 1,
      maxSelections: 1,
    });

    setPositionForm({ title: '', description: '' });
    setIsAddingPosition(false);
    refreshData();
  };

  const handleDeletePosition = (id: string) => {
    setConfirmDialog({
      title: 'Delete Leadership Position',
      message: 'Are you sure you want to delete this leadership position and all standing candidates?',
      onConfirm: () => {
        deletePosition(id);
        refreshData();
        showToast('Leadership position removed.');
      },
    });
  };

  // Candidate Handlers - Types prefect title directly
  const handleSaveCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateForm.fullName.trim() || !candidateForm.prefectTitle.trim()) return;

    saveCandidateWithTypedPrefectTitle({
      id: candidateForm.id,
      schoolId: school.id,
      prefectTitle: candidateForm.prefectTitle.trim(),
      fullName: candidateForm.fullName.trim(),
      gradeOrClass: candidateForm.gradeOrClass.trim() || 'Senior Class',
      photoUrl: candidateForm.photoUrl || DEFAULT_AVATARS[0],
      manifesto: candidateForm.manifesto.trim(),
      ballotNumber: Number(candidateForm.ballotNumber) || 1,
    });

    setCandidateForm({
      prefectTitle: '',
      fullName: '',
      gradeOrClass: '',
      photoUrl: DEFAULT_AVATARS[0],
      manifesto: '',
      ballotNumber: 1,
    });
    setIsAddingCandidate(false);
    refreshData();
    showToast('Candidate saved successfully.');
  };

  const handleDeleteCandidate = (id: string) => {
    setConfirmDialog({
      title: 'Remove Candidate',
      message: 'Are you sure you want to remove this candidate from the election?',
      onConfirm: () => {
        deleteCandidate(id);
        refreshData();
        showToast('Candidate removed from the ballot.');
      },
    });
  };

  // Handle image upload from file system
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCandidateForm((prev) => ({
          ...prev,
          photoUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Pupil Management
  const handleAddMorePupils = async () => {
    if (additionalPupilsCount <= 0) return;
    await addPupilsToSchoolAsync(school.id, additionalPupilsCount);
    const updated = { ...school, studentCount: school.studentCount + additionalPupilsCount };
    setSchool(updated);
    refreshData();
    showToast(`Successfully generated ${additionalPupilsCount} new unpredictable Student Voter IDs.`);
  };

  const handleRegenerateAll = () => {
    setConfirmDialog({
      title: 'Regenerate All Pupil Voter IDs',
      message: 'Warning: This will clear all existing votes and generate brand new complex, unpredictable Voter IDs for all pupils. Proceed?',
      onConfirm: async () => {
        await regenerateAllVoterIdsAsync(school.id);
        refreshData();
        showToast('All student voter IDs have been regenerated with unpredictable cryptographic codes.');
      },
    });
  };

  const handleResetVotes = () => {
    setConfirmDialog({
      title: 'Reset Election Votes',
      message: 'Reset all cast votes to 0? Existing student voter IDs will be reset to Unvoted status.',
      onConfirm: () => {
        resetSchoolVotes(school.id);
        refreshData();
        showToast('Election votes reset successfully.');
      },
    });
  };

  const handleStatusChange = (status: 'draft' | 'active' | 'closed') => {
    const updated = updateSchool(school.id, { electionStatus: status });
    if (updated) setSchool(updated);
    showToast(`Election status updated to ${status}.`);
  };

  const handleExportDatabase = () => {
    const json = exportSchoolDatabaseJson(school.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${school.name.replace(/\s+/g, '_')}_Database_Backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Database backup downloaded.');
  };

  const filteredVoters = voters.filter((v) => {
    const vCode = (v.voterCode || '').toLowerCase();
    const matchesSearch =
      vCode.includes(voterSearch.toLowerCase()) || String(v.studentIndex).includes(voterSearch);
    if (voterFilter === 'unvoted') return matchesSearch && !v.hasVoted;
    if (voterFilter === 'voted') return matchesSearch && v.hasVoted;
    return matchesSearch;
  });

  const totalVoted = voters.filter((v) => v.hasVoted).length;
  const turnout = voters.length > 0 ? Math.round((totalVoted / voters.length) * 1000) / 10 : 0;

  return (
    <div className="min-h-screen bg-slate-950/70 backdrop-blur-[2px] text-slate-100 flex flex-col">
      {/* Top Admin Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-bold text-sm shadow-md font-mono">
              MX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-brand font-extrabold text-lg text-slate-100 line-clamp-1">{school.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
                  {school.schoolCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Reg: {school.regNumber} • {school.studentCount} Registered Pupils
              </p>
            </div>
          </div>

          {/* Quick Action Badges & Projector Launcher */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* 1-Month Election License (50,000 UGX) Status Badge */}
            <div
              onClick={() => setIsRenewingLicense(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/80 border border-blue-500/40 text-xs font-mono cursor-pointer hover:bg-blue-900/60 transition group"
              title="Click to view license & renew"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-bold text-white">50,000 UGX</span>
              <span className="text-white/40">•</span>
              <span className={licenseInfo.active ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-bold'}>
                {licenseInfo.active ? `${licenseInfo.daysRemaining}d Left` : 'Expired'}
              </span>
            </div>

            {/* Status Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => handleStatusChange('active')}
                className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1.5 ${
                  school.electionStatus === 'active'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Voting Active
              </button>
              <button
                onClick={() => handleStatusChange('draft')}
                className={`px-3 py-1 rounded-lg transition font-medium ${
                  school.electionStatus === 'draft' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => handleStatusChange('closed')}
                className={`px-3 py-1 rounded-lg transition font-medium ${
                  school.electionStatus === 'closed' ? 'bg-rose-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Closed
              </button>
            </div>

            {/* Print Voter Cards Button */}
            <button
              id="admin-open-print-btn"
              onClick={onOpenPrintCards}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print Voter Cards</span>
            </button>

            {/* Projector Presentation Launcher */}
            <button
              id="admin-open-projector-btn"
              onClick={onOpenProjector}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-amber-950/50 transition transform active:scale-95"
            >
              <Tv className="w-4 h-4" />
              <span>Projector Display</span>
            </button>

            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-400 transition"
              title="Logout from school portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 mt-4 pt-2 border-t border-slate-800/80 overflow-x-auto text-xs font-medium scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition shrink-0 ${
              activeTab === 'overview'
                ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('voters')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition shrink-0 ${
              activeTab === 'voters'
                ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pupil Voter IDs ({voters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('positions')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition shrink-0 ${
              activeTab === 'positions'
                ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Titles & Candidates ({candidates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition shrink-0 ${
              activeTab === 'results'
                ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Confidential Results</span>
            {!isResultsUnlocked && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition shrink-0 ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Database & Settings</span>
          </button>
        </div>
      </header>

      {/* Tab Body Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* 1-Month Election License Card (50,000 UGX Setup Fee via PayPal) */}
            <div className="bg-gradient-to-br from-blue-950/50 via-indigo-950/30 to-slate-900 border-2 border-blue-500/40 rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono text-[10px] uppercase font-bold tracking-wider">
                      Official Election Setup License
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">50,000 UGX</span>
                    <span className="text-xs font-mono text-white/50">• 1 Month (30 Days)</span>
                  </div>
                  <h3 className="text-lg font-bold text-white font-brand mt-1.5 flex items-center gap-2">
                    <span>1-Month Voting Access License</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${licenseInfo.active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                      {licenseInfo.active ? `${licenseInfo.daysRemaining} Days Remaining` : 'Expired / Pending'}
                    </span>
                  </h3>
                  <p className="text-xs text-white/70 mt-1 max-w-2xl leading-relaxed">
                    This school election portal is activated with a <strong>50,000 UGX</strong> one-time setup fee paid via <strong className="text-blue-300">PayPal / Debit Card</strong>.
                    {school.licenseExpiresAt && (
                      <span> License is active until <strong className="text-blue-300">{new Date(school.licenseExpiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</span>
                    )}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 text-[11px] font-mono text-white/60">
                    <span className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                      <span className="text-white/40">Gateway:</span>
                      <strong className="text-blue-300">PayPal / Cards</strong>
                      <a
                        href={OFFICIAL_PAYPAL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-white ml-1 inline-flex items-center gap-0.5"
                        title="Open PayPal"
                      >
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    </span>
                    <span>Method: <strong className="text-slate-200">{school.paymentMethod || 'PayPal'}</strong></span>
                    <span>Ref: <strong className="text-slate-200">{school.paymentReference || 'MX-PAY-88219'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex flex-row lg:flex-col gap-2.5 shrink-0">
                <button
                  id="admin-renew-license-btn"
                  onClick={() => setIsRenewingLicense(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-950/60 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Renew / Pay 50k via PayPal</span>
                </button>
                <button
                  id="admin-view-receipt-btn"
                  onClick={() => setShowReceiptModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Official Receipt</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-mono">
                  <span>REGISTERED PUPILS</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold font-mono text-slate-100">{voters.length}</div>
                <p className="text-xs text-slate-400 mt-1">Unique Voter IDs generated</p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-mono">
                  <span>BALLOTS CAST</span>
                  <Vote className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold font-mono text-emerald-400">{totalVoted}</div>
                <p className="text-xs text-slate-400 mt-1">{voters.length - totalVoted} pending votes</p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-mono">
                  <span>TURNOUT RATE</span>
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-3xl font-extrabold font-mono text-cyan-400">{turnout}%</div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-2">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${turnout}%` }} />
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-mono">
                  <span>CONTESTED TITLES</span>
                  <Award className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-extrabold font-mono text-purple-300">{positions.length}</div>
                <p className="text-xs text-slate-400 mt-1">{candidates.length} total student candidates</p>
              </div>
            </div>

            {/* Quick Workflow Action Banners */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4">
                    <Printer className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100 font-brand">1. Print Pupil Voter Cards</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Generate and print physical or digital voter slips for your {voters.length} students with unique access
                    codes.
                  </p>
                </div>
                <button
                  onClick={onOpenPrintCards}
                  className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md"
                >
                  Open Print Sheet
                </button>
              </div>

              <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-950 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4">
                    <Award className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100 font-brand">2. Leadership Titles & Candidates</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Define your school's custom leadership titles (e.g. Senior Prefect, Student President, Speaker) and register student candidates.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('positions')}
                  className="mt-6 w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-md"
                >
                  Manage Candidates ({candidates.length})
                </button>
              </div>

              <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-950 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-4">
                    <Tv className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100 font-brand">3. Auditorium Projector Mode</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Cast live results, animated bar charts, and winner reveal ceremonies directly onto school assembly
                    projectors.
                  </p>
                </div>
                <button
                  onClick={onOpenProjector}
                  className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-md"
                >
                  Launch Projector Screen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PUPIL VOTER IDS MANAGEMENT ================= */}
        {activeTab === 'voters' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header & Batch Controls */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-100 font-brand">Pupil Voter ID Numbers</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold">
                      UNPREDICTABLE IDS ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    High-entropy cryptographic IDs generated for the {voters.length} registered pupils. IDs are unpredictable to prevent voter guessing or fraud.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Add more pupils */}
                  <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={additionalPupilsCount}
                      onChange={(e) => setAdditionalPupilsCount(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-slate-900 rounded-lg text-xs font-mono text-center text-slate-200"
                    />
                    <button
                      onClick={handleAddMorePupils}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add IDs
                    </button>
                  </div>

                  <button
                    onClick={onOpenPrintCards}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    Print All Slips
                  </button>

                  <button
                    onClick={handleRegenerateAll}
                    className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                    title="Regenerate all student IDs with fresh unpredictable codes"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate All
                  </button>
                </div>
              </div>

              {/* Security Assurance Notice */}
              <div className="mt-4 p-3 bg-blue-950/40 border border-blue-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                  <p className="text-slate-300">
                    <strong className="text-blue-300">Unpredictable Security:</strong> Each student ID has a distinct 8-character cryptographic token (e.g. <span className="font-mono text-amber-300 font-bold">{voters[0]?.voterCode || 'N-737-7K9P-4X2M'}</span>). No sequential numbers exist, making student codes impossible to predict or guess.
                  </p>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Voter ID or pupil number..."
                    value={voterSearch}
                    onChange={(e) => setVoterSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVoterFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs transition ${
                      voterFilter === 'all' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 bg-slate-950'
                    }`}
                  >
                    All ({voters.length})
                  </button>
                  <button
                    onClick={() => setVoterFilter('unvoted')}
                    className={`px-3 py-1.5 rounded-xl text-xs transition ${
                      voterFilter === 'unvoted' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 bg-slate-950'
                    }`}
                  >
                    Ready ({voters.filter((v) => !v.hasVoted).length})
                  </button>
                  <button
                    onClick={() => setVoterFilter('voted')}
                    className={`px-3 py-1.5 rounded-xl text-xs transition ${
                      voterFilter === 'voted' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 bg-slate-950'
                    }`}
                  >
                    Voted ({voters.filter((v) => v.hasVoted).length})
                  </button>
                </div>
              </div>
            </div>

            {/* Voter IDs Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="max-h-[550px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950 sticky top-0 z-10 border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                    <tr>
                      <th className="py-3.5 px-6">Pupil Roll #</th>
                      <th className="py-3.5 px-6">Voter Access Code (Unpredictable)</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Voted Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredVoters.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-6 text-slate-300 font-bold">#{v.studentIndex}</td>
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-mono-code font-bold text-amber-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 tracking-wider">
                              {v.voterCode}
                            </span>
                            <button
                              onClick={() => handleCopyVoterCode(v.voterCode)}
                              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
                              title="Copy Voter Code"
                            >
                              {copiedVoterCode === v.voterCode ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          {v.hasVoted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-sans font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Voted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400 font-sans font-medium text-[11px]">
                              <Clock className="w-3.5 h-3.5" />
                              Ready to Vote
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-slate-400 font-sans">
                          {v.votedAt ? new Date(v.votedAt).toLocaleTimeString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: LEADERSHIP TITLES & CANDIDATES ================= */}
        {activeTab === 'positions' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header & Add Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-100 font-brand">Leadership Titles & Student Candidates</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Define the student prefect offices and the candidates standing for each title with their photos.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="add-new-position-btn"
                  onClick={() => {
                    setPositionForm({ title: '', description: '' });
                    setIsAddingPosition(true);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Add New Title/Post</span>
                </button>

                <button
                  id="add-new-candidate-btn"
                  onClick={() => {
                    setCandidateForm({
                      prefectTitle: positions[0]?.title || '',
                      fullName: '',
                      gradeOrClass: '',
                      photoUrl: DEFAULT_AVATARS[0],
                      manifesto: '',
                      ballotNumber: candidates.length + 1,
                    });
                    setIsAddingCandidate(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Candidate</span>
                </button>
              </div>
            </div>

            {/* Positions List with their Candidates */}
            {positions.length === 0 ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-10 sm:p-12 text-center shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-100 font-brand">No Leadership Titles Created Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 mb-6 leading-relaxed">
                  Your school can set up its own custom leadership structure. Create the leadership titles for your election (e.g. Senior Prefect, Student Council President, Class Representative, Speaker) and add candidates.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setPositionForm({ title: '', description: '' });
                      setIsAddingPosition(true);
                    }}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Add Leadership Title / Post</span>
                  </button>
                  <button
                    onClick={() => {
                      setCandidateForm({
                        prefectTitle: '',
                        fullName: '',
                        gradeOrClass: '',
                        photoUrl: DEFAULT_AVATARS[0],
                        manifesto: '',
                        ballotNumber: 1,
                      });
                      setIsAddingCandidate(true);
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Candidate Directly</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {positions.map((pos) => {
                  const posCandidates = candidates.filter((c) => c.positionId === pos.id);

                  return (
                    <div key={pos.id} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-100 font-brand">{pos.title}</h3>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-950 text-amber-400 border border-slate-800 font-mono">
                              {posCandidates.length} Candidates
                            </span>
                          </div>
                          {pos.description && <p className="text-xs text-slate-400 mt-1">{pos.description}</p>}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setCandidateForm({
                                prefectTitle: pos.title,
                                fullName: '',
                                gradeOrClass: '',
                                photoUrl: DEFAULT_AVATARS[0],
                                manifesto: '',
                                ballotNumber: posCandidates.length + 1,
                              });
                              setIsAddingCandidate(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            Add Candidate
                          </button>
                          <button
                            onClick={() => handleDeletePosition(pos.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-950 transition"
                            title="Delete position"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Candidates Grid */}
                      {posCandidates.length === 0 ? (
                        <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs text-slate-400">
                          No candidates added yet for {pos.title}. Click "Add Candidate" above.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {posCandidates.map((cand) => (
                            <div
                              key={cand.id}
                              className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between relative group hover:border-slate-700 transition"
                            >
                              <div>
                                <div className="relative mb-3 aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                                  <img
                                    src={cand.photoUrl}
                                    alt={cand.fullName}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-slate-950/90 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold">
                                    #{cand.ballotNumber}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteCandidate(cand.id)}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/90 text-slate-400 hover:text-rose-400 transition"
                                    title="Delete candidate"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <h4 className="font-bold text-slate-100 text-sm line-clamp-1">{cand.fullName}</h4>
                                <div className="text-xs font-mono text-emerald-400 font-semibold">{cand.gradeOrClass}</div>
                                <p className="text-xs text-slate-400 mt-2 line-clamp-2 italic">
                                  "{cand.manifesto || 'No manifesto entered.'}"
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                                <span className="font-mono">Standing for {pos.title}</span>
                                <button
                                  onClick={() => {
                                    setCandidateForm({
                                      id: cand.id,
                                      prefectTitle: pos.title,
                                      fullName: cand.fullName,
                                      gradeOrClass: cand.gradeOrClass,
                                      photoUrl: cand.photoUrl,
                                      manifesto: cand.manifesto,
                                      ballotNumber: cand.ballotNumber,
                                    });
                                    setIsAddingCandidate(true);
                                  }}
                                  className="text-amber-400 hover:underline font-semibold"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: CONFIDENTIAL RESULTS (PASSWORD PROTECTED) ================= */}
        {activeTab === 'results' && (
          <div className="space-y-8 animate-fade-in">
            {!isResultsUnlocked ? (
              /* Password Gatekeeper (Accessible ONLY by school administrators with their initial password) */
              <div className="max-w-md mx-auto my-12 bg-[#121214] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/80 text-center relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white font-brand tracking-wide">Administrator Results Vault</h3>
                <p className="text-xs text-white/50 mt-1.5 mb-6 leading-relaxed">
                  Confidential election tallying is strictly restricted to authorized administrators. Enter the initial password you set during school registration to view results.
                </p>

                {resultsPasswordError && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 text-left">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{resultsPasswordError}</span>
                  </div>
                )}

                <form onSubmit={handleUnlockResults} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 text-left">
                      Initial Administrator Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={resultsPasswordInput}
                      onChange={(e) => setResultsPasswordInput(e.target.value)}
                      className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center tracking-widest font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-blue-950/50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Unlock Election Results</span>
                  </button>
                </form>
                
                <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-white/30 flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Results remain hidden from voters & unauthenticated visitors</span>
                </div>
              </div>
            ) : (
              /* Unlocked Results Dashboard */
              <div className="space-y-8">
                {/* Results Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <h2 className="text-xl font-bold text-white font-brand">School Election Results & Tallies</h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono uppercase font-bold">
                        Decrypted Live
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      Confidential audit tally • {results?.totalVoted} ballots cast of {results?.totalEligible} registered pupils ({results?.turnoutPercentage}% total turnout)
                    </p>
                  </div>

                  <div className="flex items-center flex-wrap gap-2.5">
                    <button
                      onClick={() => {
                        setIsResultsUnlocked(false);
                        setResultsPasswordInput('');
                      }}
                      className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      title="Lock results vault immediately"
                    >
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Lock Vault</span>
                    </button>
                    
                    <button
                      onClick={onOpenProjector}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                    >
                      <Rotate3d className="w-4 h-4" />
                      <span>3D Projections Stage</span>
                    </button>
                    
                    <button
                      onClick={handleResetVotes}
                      className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold transition"
                    >
                      Reset Votes
                    </button>
                  </div>
                </div>

                {/* Overall Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-[#121214] border border-white/5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-white/40">Total Pupils</span>
                    <div className="text-2xl font-bold font-mono text-white mt-1">{results?.totalEligible}</div>
                    <span className="text-xs text-white/40">Registered eligible voters</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#121214] border border-white/5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-blue-400">Total Ballots Cast</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{results?.totalVoted}</div>
                    <span className="text-xs text-white/40">Verified secret submissions</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#121214] border border-white/5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400">Participation Rate</span>
                    <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">{results?.turnoutPercentage}%</div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${results?.turnoutPercentage || 0}%` }} />
                    </div>
                  </div>
                </div>

                {/* Results breakdown per position */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {results?.positionsResults.map((posRes) => {
                    const sorted = [...posRes.candidates].sort((a, b) => b.votes - a.votes);
                    const winnerVotes = sorted[0]?.votes || 0;

                    return (
                      <div
                        key={posRes.position.id}
                        className="bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between pb-4 mb-5 border-b border-white/5">
                            <div>
                              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 font-bold">
                                Leadership Post
                              </span>
                              <h3 className="text-lg font-bold text-white font-brand">{posRes.position.title}</h3>
                            </div>
                            <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-mono font-bold">
                              {posRes.totalVotes} votes cast
                            </span>
                          </div>

                          <div className="space-y-3.5">
                            {sorted.map((cand, idx) => {
                              const rank = idx + 1;
                              const isWinner = rank === 1 && cand.votes > 0;
                              const isSecond = rank === 2;
                              const isThird = rank === 3;
                              const deficit = winnerVotes - cand.votes;

                              return (
                                <div
                                  key={cand.id}
                                  className={`p-4 rounded-2xl border transition ${
                                    isWinner
                                      ? 'bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent border-amber-400/50 ring-1 ring-amber-400/20 shadow-md'
                                      : isSecond
                                      ? 'bg-slate-900/40 border-slate-300/30'
                                      : isThird
                                      ? 'bg-amber-950/15 border-amber-700/25'
                                      : 'bg-black/40 border-white/5'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-xs mb-2.5">
                                    <div className="flex items-center gap-3">
                                      {/* Rank pill */}
                                      <span
                                        className={`w-6 h-6 rounded-full font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                                          isWinner
                                            ? 'bg-amber-400 text-slate-950 font-extrabold shadow'
                                            : isSecond
                                            ? 'bg-slate-300 text-slate-950 font-bold'
                                            : isThird
                                            ? 'bg-amber-700 text-white'
                                            : 'bg-white/10 text-white/60'
                                        }`}
                                      >
                                        {rank}
                                      </span>

                                      <img
                                        src={getAdminCandPhoto(cand, idx)}
                                        alt={cand.fullName}
                                        className={`w-11 h-11 rounded-xl object-cover border-2 shadow-sm shrink-0 ${
                                          isWinner
                                            ? 'border-amber-400'
                                            : isSecond
                                            ? 'border-slate-300'
                                            : isThird
                                            ? 'border-amber-700'
                                            : 'border-white/10'
                                        }`}
                                        referrerPolicy="no-referrer"
                                      />
                                      <div>
                                        <div className="font-bold text-white flex items-center gap-2">
                                          <span>{cand.fullName}</span>
                                          {isWinner && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] uppercase font-mono font-extrabold border border-amber-400/40 flex items-center gap-1">
                                              <Crown className="w-2.5 h-2.5" />
                                              Elected Winner
                                            </span>
                                          )}
                                          {isSecond && (
                                            <span className="px-2 py-0.5 rounded-full bg-slate-300/15 text-slate-200 text-[10px] uppercase font-mono font-bold border border-slate-300/30">
                                              1st Runner-Up
                                            </span>
                                          )}
                                          {isThird && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-300 text-[10px] uppercase font-mono font-bold border border-amber-700/30">
                                              2nd Runner-Up
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[11px] text-white/40 font-mono">
                                          #{cand.ballotNumber} • {cand.gradeOrClass}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="text-right font-mono">
                                      <div className="flex items-center justify-end gap-1">
                                        <span className="text-base font-extrabold text-white">{cand.votes}</span>
                                        <span className="text-xs text-white/40">votes</span>
                                        <span className="text-xs text-emerald-400 font-bold ml-1">
                                          ({cand.percentage}%)
                                        </span>
                                      </div>
                                      {!isWinner && deficit > 0 && (
                                        <span className="text-[10px] text-rose-400 font-mono">
                                          -{deficit} behind winner
                                        </span>
                                      )}
                                      {isWinner && sorted.length > 1 && sorted[1].votes < cand.votes && (
                                        <span className="text-[10px] text-emerald-400 font-mono">
                                          +{cand.votes - sorted[1].votes} lead
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/5">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        isWinner
                                          ? 'bg-gradient-to-r from-amber-400 to-emerald-400 shadow-md'
                                          : isSecond
                                          ? 'bg-slate-300'
                                          : isThird
                                          ? 'bg-amber-600'
                                          : 'bg-white/20'
                                      }`}
                                      style={{ width: `${Math.max(2, cand.percentage)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: DATABASE & SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl font-bold text-slate-100 font-brand mb-1">School Database & Credentials</h2>
              <p className="text-xs text-slate-400 mb-6">
                Each school on Memon Xule operates with its own isolated local database.
              </p>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-slate-400">School Name</div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">{school.name}</div>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">{school.schoolCode}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-slate-400">Registration Number</div>
                    <div className="text-sm font-mono text-slate-200 mt-0.5">{school.regNumber}</div>
                  </div>
                  <span className="text-slate-400">{school.email}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-slate-400">Pupils Registered</div>
                    <div className="text-sm font-mono text-slate-200 mt-0.5">{school.studentCount} Students</div>
                  </div>
                  <button
                    onClick={onOpenPrintCards}
                    className="text-amber-400 hover:underline font-semibold"
                  >
                    View All IDs
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-blue-400 font-semibold flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      1-Month Voting Setup License (50,000 UGX)
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      Status: <strong className={licenseInfo.active ? 'text-emerald-400' : 'text-rose-400'}>{licenseInfo.active ? 'Active' : 'Expired'}</strong> • Expires: {school.licenseExpiresAt ? new Date(school.licenseExpiresAt).toLocaleDateString() : 'N/A'} ({licenseInfo.daysRemaining} days left)
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5 font-mono">
                      Paid via {school.paymentMethod || 'MTN MoMo'} (Ref: {school.paymentReference || 'MX-PAY-88219'})
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRenewingLicense(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-sm cursor-pointer"
                  >
                    Renew
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={handleExportDatabase}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Backup & Export Database JSON
                </button>

                <button
                  onClick={handleResetVotes}
                  className="px-4 py-2.5 text-rose-400 hover:text-rose-300 text-xs font-semibold transition"
                >
                  Clear & Reset Votes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD / EDIT POSITION */}
      {isAddingPosition && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 font-brand mb-4">Add Leadership Title / Post</h3>
            <form onSubmit={handleSavePosition} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Title Name</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Prefect, Student Council President, Class Representative, Speaker..."
                  value={positionForm.title}
                  onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description / Duties</label>
                <textarea
                  rows={3}
                  placeholder="Responsibilities and role of this student leader..."
                  value={positionForm.description}
                  onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingPosition(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Save Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CANDIDATE */}
      {isAddingCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 pb-4 mb-5 border-b border-white/5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-brand">
                  {candidateForm.id ? 'Edit Candidate Standing' : 'Register Candidate for Leadership Title'}
                </h3>
                <p className="text-xs text-white/40">Choose candidate title, student name, photo, and manifesto</p>
              </div>
            </div>

            <form onSubmit={handleSaveCandidate} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-white/70 font-semibold uppercase tracking-wider text-[10px]">
                    1. Candidate Title / Leadership Office *
                  </label>
                  <span className="text-[10px] text-blue-400 font-mono font-medium">Type or Choose Title</span>
                </div>
                <input
                  type="text"
                  placeholder="Type title (e.g. Senior Prefect, Student President, Class Representative, Speaker...)"
                  value={candidateForm.prefectTitle}
                  onChange={(e) => setCandidateForm({ ...candidateForm, prefectTitle: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border border-white/15 focus:border-blue-500 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-white/30"
                  required
                />
                
                {/* School Defined Titles Quick Select Chips */}
                {positions.length > 0 && (
                  <div className="mt-2.5">
                    <span className="text-[10px] text-white/40 block mb-1.5">Or tap your school's created titles:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {positions.map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setCandidateForm({ ...candidateForm, prefectTitle: pos.title })}
                          className={`px-2.5 py-1 rounded-lg text-[11px] border transition cursor-pointer ${
                            candidateForm.prefectTitle.toLowerCase() === pos.title.toLowerCase()
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/60 font-semibold shadow-sm'
                              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {pos.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-white/50 mb-1.5 font-semibold uppercase tracking-wider text-[10px]">
                  2. Student Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tariq Patel"
                  value={candidateForm.fullName}
                  onChange={(e) => setCandidateForm({ ...candidateForm, fullName: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1.5 font-semibold uppercase tracking-wider text-[10px]">
                    3. Class / Grade
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior 6 Sciences"
                    value={candidateForm.gradeOrClass}
                    onChange={(e) => setCandidateForm({ ...candidateForm, gradeOrClass: e.target.value })}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/50 mb-1.5 font-semibold uppercase tracking-wider text-[10px]">
                    4. Ballot Number (#)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={candidateForm.ballotNumber}
                    onChange={(e) => setCandidateForm({ ...candidateForm, ballotNumber: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Photo Upload & Association */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                <label className="block text-blue-400 mb-2 font-semibold uppercase tracking-wider text-[10px]">
                  5. Student Candidate Photo
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-3">
                  <div className="relative group shrink-0">
                    <img
                      src={candidateForm.photoUrl}
                      alt="Preview"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 bg-[#121214] shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-blue-300 font-mono text-[9px] font-bold">
                      #{candidateForm.ballotNumber || 1}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-950/40">
                      <Upload className="w-4 h-4" />
                      <span>Upload Student Photo</span>
                      <input type="file" accept="image/*" onChange={handlePhotoFileUpload} className="hidden" />
                    </label>
                    <p className="text-[11px] text-white/40 leading-tight">
                      Upload candidate portrait photo (JPG, PNG, WebP). This photo will appear on the voting ballot for students.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">
                    Select 3D Model Avatar or Preset:
                  </div>
                  <span className="text-[10px] text-blue-400 font-mono">12+ 3D Model Characters</span>
                </div>
                
                <div className="grid grid-cols-6 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 bg-black/30 rounded-xl border border-white/5">
                  {AVATAR_3D_COLLECTION.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setCandidateForm({ ...candidateForm, photoUrl: item.url })}
                      className={`relative rounded-xl overflow-hidden cursor-pointer border transition-all duration-150 group ${
                        candidateForm.photoUrl === item.url
                          ? 'border-blue-400 ring-2 ring-blue-400/50 scale-105 shadow-md shadow-blue-950/60'
                          : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                      }`}
                      title={item.label}
                    >
                      <img
                        src={item.url}
                        alt={item.label}
                        className="w-full aspect-square object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 py-0.5 px-1 text-[8px] text-center text-white/70 truncate font-mono">
                        {item.label.replace('3D ', '')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white/50 mb-1.5 font-semibold uppercase tracking-wider text-[10px]">
                  6. Manifesto / Campaign Quote
                </label>
                <textarea
                  rows={2}
                  placeholder="Key promises and vision for the school leadership post..."
                  value={candidateForm.manifesto}
                  onChange={(e) => setCandidateForm({ ...candidateForm, manifesto: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCandidate(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-950/50 cursor-pointer"
                >
                  Save & Publish Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SECURE PAYMENT GATEWAY (50,000 UGX VIA PAYPAL) */}
      {isRenewingLicense && (
        <SecurePaymentModal
          isOpen={isRenewingLicense}
          school={school}
          onClose={() => setIsRenewingLicense(false)}
          onPaymentSuccess={(updatedSchool) => {
            setSchool(updatedSchool);
            refreshData();
          }}
          title="Extend / Renew 1-Month Election License"
          subtitle={`Pay 50,000 UGX via PayPal to extend voting access for ${school.name} by another 30 days.`}
          isInitialSetup={false}
        />
      )}

      {/* MODAL: OFFICIAL DIGITAL PAYMENT RECEIPT CERTIFICATE */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121214] border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-scale-in text-slate-100">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              <LogOut className="w-5 h-5 rotate-180" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider">
                Official Electronic Certificate
              </span>
              <h3 className="text-xl font-bold text-white font-brand mt-1">Election License Payment Receipt</h3>
              <p className="text-xs text-white/50">Memon Xule Electronic Voting System Gateway</p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 space-y-4 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] text-white/40 block">RECEIPT NO.</span>
                  <span className="text-sm font-bold text-white">{school.receiptNumber || 'REC-MX-77291'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-white/40 block">AMOUNT PAID</span>
                  <span className="text-base font-black text-emerald-400 font-mono">50,000 UGX</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[10px]">PAYMENT METHOD</span>
                  <span className="text-white font-semibold">{school.paymentMethod || 'PayPal / Cards'}</span>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[10px]">TRANSACTION REF</span>
                  <span className="text-blue-300 font-semibold truncate block">{school.paymentReference || 'MX-PAY-1002'}</span>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[10px]">PAYMENT GATEWAY</span>
                  <span className="text-blue-400 font-bold">PayPal Secure Link</span>
                  <a
                    href={OFFICIAL_PAYPAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-white/60 hover:text-white block truncate flex items-center gap-1 mt-0.5"
                  >
                    <span>Open PayPal</span>
                    <ExternalLink className="w-2.5 h-2.5 inline" />
                  </a>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[10px]">VALIDITY PERIOD</span>
                  <span className="text-emerald-400 font-bold">1 Month (30 Days)</span>
                  <span className="text-[9px] text-white/50 block">
                    Expires: {school.licenseExpiresAt ? new Date(school.licenseExpiresAt).toLocaleDateString() : 'Active'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-black/60 rounded-xl border border-white/5 space-y-1 text-[11px] font-sans">
                <div className="flex justify-between">
                  <span className="text-white/40">Registered School:</span>
                  <span className="text-white font-semibold">{school.name} ({school.schoolCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Pupil Voter Capacity:</span>
                  <span className="text-white font-semibold">{school.studentCount} Student Voter IDs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Status:</span>
                  <span className="text-emerald-400 font-mono font-bold">CONFIRMED & ACTIVE</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print Certificate</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-950/60 cursor-pointer"
              >
                <span>Close Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation Dialog (Replaces window.confirm) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#121214] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  action();
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-950/60 transition cursor-pointer"
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Toast Notification (Replaces window.alert) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up flex items-center gap-3 px-4 py-3 rounded-xl bg-[#18181B] border border-white/10 text-xs text-white shadow-2xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/40 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
