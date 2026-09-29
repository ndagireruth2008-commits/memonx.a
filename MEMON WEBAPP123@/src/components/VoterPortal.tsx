import React, { useState, useEffect } from 'react';
import { School, Position, Candidate, StudentVoter } from '../types';
import {
  verifyStudentVoterAsync,
  castStudentVoteAsync,
  getPositionsBySchool,
  getCandidatesBySchool,
  getSchools
} from '../services/storage';
import { MemonLogo } from './MemonLogo';
import {
  ShieldCheck,
  Check,
  Vote,
  Lock,
  School as SchoolIcon,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Info,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface VoterPortalProps {
  initialSchool?: School | null;
  onOpenSchoolLogin: () => void;
  onOpenSchoolRegister: () => void;
}

export const VoterPortal: React.FC<VoterPortalProps> = ({
  initialSchool,
  onOpenSchoolLogin,
  onOpenSchoolRegister,
}) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(initialSchool?.id || '');
  const [schoolIdentifier, setSchoolIdentifier] = useState<string>(initialSchool?.schoolCode || '');
  const [voterCode, setVoterCode] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Authenticated voter session
  const [activeSchool, setActiveSchool] = useState<School | null>(initialSchool || null);
  const [activeVoter, setActiveVoter] = useState<StudentVoter | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  // Voting State: positionId -> candidateId
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [selectedCandidatePreview, setSelectedCandidatePreview] = useState<Candidate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVotedSuccess, setHasVotedSuccess] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    const list = getSchools();
    setSchools(list);
    if (!selectedSchoolId && list.length > 0) {
      setSelectedSchoolId(list[0].id);
      setSchoolIdentifier(list[0].schoolCode);
    }
  }, []);

  const handleSchoolSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedSchoolId(id);
    const found = schools.find((s) => s.id === id);
    if (found) {
      setSchoolIdentifier(found.schoolCode);
      setAuthError(null);
    }
  };

  const handleVerifyVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanCode = voterCode.trim();
    if (!cleanCode) {
      setAuthError('Please enter the Student Voter ID given to you on your printed slip.');
      return;
    }

    setIsVerifying(true);
    try {
      // Async lookup: checks local store first, then queries central server
      const result = await verifyStudentVoterAsync(cleanCode);
      setIsVerifying(false);

      if (!result.success || !result.school || !result.voter) {
        setAuthError(result.error || 'Authentication failed. Please check your Voter ID and try again.');
        return;
      }

      setActiveSchool(result.school);
      setActiveVoter(result.voter);
      const pos = result.positions || getPositionsBySchool(result.school.id);
      const cand = result.candidates || getCandidatesBySchool(result.school.id);
      setPositions(pos);
      setCandidates(cand);
    } catch (err: any) {
      setIsVerifying(false);
      setAuthError(err.message || 'Authentication error. Please check your network and try again.');
    }
  };

  const positionsWithCandidates = positions.filter((p) => candidates.some((c) => c.positionId === p.id));
  const isAllPositionsVoted =
    positionsWithCandidates.length === 0 ||
    positionsWithCandidates.every((p) => selections[p.id] !== undefined && selections[p.id] !== '');

  const unvotedPositions = positionsWithCandidates.filter((p) => !selections[p.id]);

  const handleSelectCandidate = (positionId: string, candidateId: string) => {
    setSelections((prev) => ({
      ...prev,
      [positionId]: candidateId,
    }));
    setAuthError(null);
  };

  const handleAbstainPosition = (positionId: string) => {
    setSelections((prev) => ({
      ...prev,
      [positionId]: 'ABSTAIN',
    }));
    setAuthError(null);
  };

  const handleOpenConfirm = () => {
    // If no selections at all and candidates exist
    const selectedCount = Object.keys(selections).filter((k) => selections[k] !== undefined).length;
    if (positionsWithCandidates.length > 0 && selectedCount === 0) {
      setAuthError('Please select your preferred candidates on the ballot before submitting.');
      // Smooth scroll to first position
      const firstCard = document.getElementById(`position-card-${positions[0]?.id}`);
      if (firstCard) {
        firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setAuthError(null);
    setConfirmModalOpen(true);
  };

  const handleConfirmSubmitVote = async () => {
    if (!activeSchool || !activeVoter) return;

    setIsSubmitting(true);
    try {
      // Clean selections (remove internal ABSTAIN marker for calculation if needed, or cast)
      const sanitizedSelections: Record<string, string> = {};
      Object.entries(selections).forEach(([posId, candId]) => {
        const idStr = String(candId || '');
        if (idStr && idStr !== 'ABSTAIN') {
          sanitizedSelections[posId] = idStr;
        }
      });

      const res = await castStudentVoteAsync({
        schoolId: activeSchool.id,
        voterCode: activeVoter.voterCode,
        selections: sanitizedSelections,
      });

      setIsSubmitting(false);
      setConfirmModalOpen(false);

      if (res.success) {
        setHasVotedSuccess(true);
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#38bdf8', '#f59e0b', '#ec4899'],
        });
      } else {
        setAuthError(res.error || 'Failed to submit ballot. Please retry.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setAuthError(err.message || 'Submission error. Please retry.');
    }
  };

  const handleLogoutVoter = () => {
    setActiveVoter(null);
    setVoterCode('');
    setSelections({});
    setHasVotedSuccess(false);
    setAuthError(null);
  };

  return (
    <div className="min-h-screen bg-transparent text-[#E0E0E0] flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Utility Bar */}
      <header className="h-20 border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-40 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-white/50 font-semibold">
              Pupil Ballot Access
            </span>
          </div>

          <div className="flex flex-col items-center">
            <h1 className="text-base sm:text-lg font-bold tracking-[0.3em] text-white">MEMON XULE</h1>
            <div className="h-[1px] w-16 sm:w-20 bg-gradient-to-r from-transparent via-blue-500 to-transparent mt-0.5"></div>
          </div>

          <div className="flex items-center gap-3">
            {activeVoter ? (
              <div className="flex items-center gap-3">
                <div className="bg-[#121214] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>Pupil #{activeVoter.studentIndex}</span>
                  <span className="text-white/20">|</span>
                  <span className="font-mono text-blue-400 font-bold">{activeVoter.voterCode}</span>
                </div>
                <button
                  onClick={handleLogoutVoter}
                  className="text-xs text-white/40 hover:text-rose-400 transition underline underline-offset-4"
                >
                  Exit Ballot
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="open-school-register-btn"
                  onClick={onOpenSchoolRegister}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 rounded-xl text-xs font-semibold transition"
                >
                  Register School
                </button>
                <button
                  id="open-school-login-btn"
                  onClick={onOpenSchoolLogin}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-950/50 transition flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  School Portal Login
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        {!activeVoter ? (
          /* ================= STEP 1: CENTERED BRANDING & VOTER LOGIN ================= */
          <div className="w-full max-w-xl mx-auto my-auto flex flex-col items-center">
            {/* Centered Memon Xule Crest & Logo */}
            <div className="mb-6 animate-fade-in text-center">
              <MemonLogo size="xl" centered={true} />
              <p className="text-white/40 text-xs sm:text-sm mt-3 max-w-md mx-auto leading-relaxed">
                Empowering transparent, democratic school leadership elections. Enter your school and unique student voter code to cast your secret ballot.
              </p>
            </div>

            {/* Voter Sign-in Card */}
            <div className="w-full bg-[#121214] border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">Pupil Ballot Access</h3>
                  <p className="text-xs text-white/40">Enter the unique Voter ID printed on your slip to proceed</p>
                </div>
              </div>

              {authError && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">{authError}</div>
                </div>
              )}

              <form onSubmit={handleVerifyVoter} className="space-y-5">
                {/* Pupil Voter ID Number Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-blue-400">
                      Student Voter ID Code
                    </label>
                    <span className="text-[10px] text-white/40 font-mono">Found on your voter slip</span>
                  </div>
                  <input
                    id="voter-id-input"
                    type="text"
                    autoFocus
                    placeholder={schools.length > 0 ? `e.g. ${schools[0].schoolCode}-7K9P-4X2M` : 'e.g. N-737-7K9P-4X2M'}
                    value={voterCode}
                    onChange={(e) => setVoterCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-4 bg-black/50 border border-white/10 focus:border-blue-500 rounded-xl text-white text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono-code font-bold tracking-widest text-center placeholder:font-normal placeholder:tracking-normal placeholder:text-white/25 shadow-inner"
                  />
                  <p className="text-[11px] text-white/40 mt-1.5 text-center">
                    Enter the unique, unpredictable ID printed on your student voting card (e.g. <span className="font-mono text-blue-300">N-737-7K9P-4X2M</span> or <span className="font-mono text-blue-300">7K9P-4X2M</span>).
                  </p>

                  {schools.length > 1 ? (
                    <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white/40">Select School:</span>
                        <select
                          id="portal-school-select"
                          value={selectedSchoolId}
                          onChange={handleSchoolSelectChange}
                          className="bg-black/60 border border-white/10 text-blue-400 font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                        >
                          {schools.map((s) => (
                            <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                              {s.name} ({s.schoolCode})
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[10px] text-white/30">
                        Your unique Student Voter ID automatically maps to your school, or you can select above.
                      </p>
                    </div>
                  ) : schools.length === 1 ? (
                    <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-white/60 flex items-center justify-between">
                      <span className="text-white/40">Connected School:</span>
                      <span className="font-mono text-blue-400 font-bold">
                        {schools[0].name} ({schools[0].schoolCode})
                      </span>
                    </div>
                  ) : null}
                </div>

                <button
                  id="submit-voter-verify-btn"
                  type="submit"
                  disabled={isVerifying || !voterCode.trim()}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-blue-950/60 transition flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isVerifying ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying ID & Loading Ballot...</span>
                    </div>
                  ) : (
                    <>
                      <span>Go To Official Ballot</span>
                      <ChevronRight className="w-4 h-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Security Guarantee Note */}
            <div className="mt-6 flex items-center gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                100% Secret & Anonymous Ballot
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-400" />
                Single-use ID Protection
              </span>
            </div>
          </div>
        ) : hasVotedSuccess ? (
          /* ================= STEP 3: VOTE CONFIRMED SECRETLY ================= */
          <div className="w-full max-w-lg mx-auto text-center py-8 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-xl ring-2 ring-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              Ballot Successfully Submitted!
            </h2>
            <p className="text-white/60 text-xs sm:text-sm mb-6 max-w-md mx-auto leading-relaxed">
              Thank you, <strong className="text-white">Pupil #{activeVoter.studentIndex}</strong>. Your vote for{' '}
              <strong className="text-blue-400">{activeSchool?.name}</strong> has been encrypted and recorded.
            </p>

            <div className="bg-[#121214] border border-white/10 rounded-2xl p-5 mb-6 text-left space-y-3 shadow-xl">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-white/5">
                <span className="text-white/40">Student Voter ID</span>
                <span className="font-mono text-white font-bold">{activeVoter.voterCode}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-3 border-b border-white/5">
                <span className="text-white/40">ID Usage Status</span>
                <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 font-semibold border border-rose-500/30 text-[11px] flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>Used & Permanently Locked</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-3 border-b border-white/5">
                <span className="text-white/40">Submission Confirmation</span>
                <span className="text-emerald-400 font-mono font-bold">100% Verified</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Official Results</span>
                <span className="text-blue-300 font-medium">To be revealed by Admin on Projector Display</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#121214] border border-white/5 text-white/50 text-xs flex items-center gap-3 mb-8 text-left">
              <Lock className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>Single-Use Security:</strong> This voter code has been deactivated and cannot be entered again. Results remain confidential until official announcement.
              </span>
            </div>

            <button
              id="finish-voting-session-btn"
              onClick={handleLogoutVoter}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-blue-950/60 cursor-pointer"
            >
              Finish & Return for Next Student
            </button>
          </div>
        ) : (
          /* ================= STEP 2: ACTIVE SECRET BALLOT ================= */
          <div className="w-full max-w-5xl mx-auto animate-fade-in pb-16">
            {/* School Header Banner */}
            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-semibold border border-blue-500/20 font-mono uppercase tracking-wider">
                      OFFICIAL BALLOT
                    </span>
                    <span className="text-xs text-white/40 font-mono">
                      Session: {activeSchool?.academicYear || '2024-2025'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {activeSchool?.name}
                  </h2>
                  <p className="text-xs text-white/40 mt-1">
                    {activeSchool?.electionTitle || 'Student Leadership & Guild Council Elections'}
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-[#1A1A1C] p-3.5 rounded-xl border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold font-mono">
                    #{activeVoter.studentIndex}
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Authenticated Voter</div>
                    <div className="text-sm font-bold font-mono text-white">{activeVoter.voterCode}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Voting Notice & Progress */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 px-2">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Info className="w-4 h-4 text-blue-400" />
                <span>
                  Please select <strong className="text-white">one candidate</strong> for each leadership post below:
                </span>
              </div>
              <div className="text-xs font-mono text-blue-400 font-semibold bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
                Selections Made: {Object.keys(selections).length} / {positions.length}
              </div>
            </div>

            {authError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Positions & Candidates List */}
            {positions.length === 0 ? (
              <div className="bg-[#121214] border border-white/10 rounded-2xl p-10 text-center text-white/50">
                <p className="text-base font-semibold text-white mb-1">No Election Titles Available</p>
                <p className="text-xs text-white/40">The school administration has not registered any candidate positions for this election yet.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {positions.map((pos, posIdx) => {
                  const posCandidates = candidates.filter((c) => c.positionId === pos.id);
                  const currentSelection = selections[pos.id];
                  const isAbstained = currentSelection === 'ABSTAIN';

                  return (
                    <div
                      key={pos.id}
                      id={`position-card-${pos.id}`}
                      className={`bg-[#121214] border rounded-2xl p-6 sm:p-8 shadow-lg transition-all duration-200 ${
                        currentSelection
                          ? 'border-blue-500/40 bg-[#121216]'
                          : 'border-white/5 hover:border-white/15'
                      }`}
                    >
                    {/* Position Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs font-mono">
                          {posIdx + 1}
                        </span>
                        <div>
                          <h3 className="text-lg font-bold text-white tracking-wide">{pos.title}</h3>
                          {pos.description && (
                            <p className="text-xs text-white/40 mt-0.5">{pos.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentSelection && currentSelection !== 'ABSTAIN' ? (
                          <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            Candidate Chosen
                          </div>
                        ) : isAbstained ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 font-medium">
                            <span>Abstained / Skipped</span>
                          </div>
                        ) : (
                          <div className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                            Selection Required
                          </div>
                        )}

                        {posCandidates.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAbstainPosition(pos.id)}
                            className={`px-3 py-1 rounded-full text-[11px] font-mono transition border ${
                              isAbstained
                                ? 'bg-slate-700 text-white border-slate-600'
                                : 'bg-white/5 hover:bg-white/10 text-white/50 border-white/10'
                            }`}
                          >
                            {isAbstained ? 'Abstained' : 'Skip Post'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Candidates Standing for this Post */}
                    {posCandidates.length === 0 ? (
                      <div className="p-6 text-center text-white/40 bg-black/30 rounded-xl border border-white/5 text-xs">
                        No candidates currently registered for this position.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {posCandidates.map((cand) => {
                          const isSelected = currentSelection === cand.id;

                          return (
                            <div
                              key={cand.id}
                              onClick={() => handleSelectCandidate(pos.id, cand.id)}
                              className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border relative flex flex-col justify-between group ${
                                isSelected
                                  ? 'bg-[#1A1A1C] border-blue-500 ring-2 ring-blue-500/30 shadow-xl shadow-blue-950/50 scale-[1.01]'
                                  : 'bg-black/30 hover:bg-[#1A1A1C]/60 border-white/5 hover:border-white/15'
                              }`}
                            >
                              <div>
                                {/* Candidate Photo & Ballot Number */}
                                <div className="relative mb-3.5 rounded-xl overflow-hidden aspect-square bg-[#121214] border border-white/10">
                                  <img
                                    src={cand.photoUrl}
                                    alt={cand.fullName}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-blue-300 border border-blue-500/30 font-mono text-[10px] font-bold shadow">
                                    #{cand.ballotNumber}
                                  </div>
                                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-400/30 font-mono text-[9px]">
                                    3D Candidate
                                  </div>
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-blue-950/40 backdrop-blur-[2px] flex items-center justify-center">
                                      <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl ring-4 ring-white/10 animate-scale-in">
                                        <Check className="w-6 h-6 stroke-[3]" />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Candidate Details */}
                                <div className="space-y-1">
                                  <h4 className="font-semibold text-sm text-white group-hover:text-blue-300 transition line-clamp-1">
                                    {cand.fullName}
                                  </h4>
                                  <div className="text-[10px] font-mono text-white/40 uppercase">
                                    {cand.gradeOrClass}
                                  </div>
                                  <p className="text-xs text-white/50 line-clamp-2 mt-2 leading-relaxed italic">
                                    "{cand.manifesto || 'Dedicated to serving the student body with excellence.'}"
                                  </p>
                                </div>
                              </div>

                              {/* Vote Selection Button */}
                              <div className="mt-4 pt-3 border-t border-white/5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectCandidate(pos.id, cand.id);
                                  }}
                                  className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-md'
                                      : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
                                  }`}
                                >
                                  {isSelected ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>Selected for {pos.title}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Vote for {cand.fullName.split(' ')[0]}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

            {/* Bottom Submit Sticky Bar */}
            <div className="sticky bottom-4 z-30 mt-10 bg-[#121214]/95 border-2 border-blue-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-blue-950/80 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>{isAllPositionsVoted ? 'Ballot Ready for Submission!' : 'Review & Submit Ballot'}</span>
                    {isAllPositionsVoted ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono uppercase font-bold">
                        Ready
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono uppercase font-bold">
                        {unvotedPositions.length} Post{unvotedPositions.length > 1 ? 's' : ''} Remaining
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/50">
                    {Object.keys(selections).length} of {positions.length} leadership positions chosen
                    {!isAllPositionsVoted && ' — click submit to review selections and seal your vote'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                <button
                  id="submit-ballot-btn"
                  onClick={handleOpenConfirm}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-blue-950/80 transition flex items-center justify-center gap-2.5 cursor-pointer transform active:scale-95 hover:shadow-blue-500/20"
                >
                  <Lock className="w-4 h-4" />
                  <span>Submit Official Vote</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-white/5">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Submit & Seal Ballot</h3>
                <p className="text-xs text-white/40">Review your final candidate choices below before submission</p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 mb-5 text-xs">
              {positions.map((pos) => {
                const candId = selections[pos.id];
                const isAbstain = candId === 'ABSTAIN';
                const cand = candidates.find((c) => c.id === candId);
                return (
                  <div key={pos.id} className="p-3 bg-black/50 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {cand ? (
                        <div className="relative shrink-0">
                          <img
                            src={cand.photoUrl}
                            alt={cand.fullName}
                            className="w-11 h-11 rounded-xl object-cover border border-blue-500/40"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-0 right-0 px-1 rounded bg-black/90 text-blue-300 font-mono text-[8px] font-bold">
                            #{cand.ballotNumber}
                          </span>
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs font-mono shrink-0">
                          —
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-blue-400 font-mono uppercase tracking-wider block font-semibold">
                          {pos.title}
                        </span>
                        <span className="font-bold text-white text-sm">
                          {cand ? cand.fullName : isAbstain ? 'Abstained (Skipped)' : 'No Candidate Selected'}
                        </span>
                      </div>
                    </div>
                    {cand ? (
                      <span className="text-[11px] text-white/50 font-mono text-right shrink-0">
                        {cand.gradeOrClass}
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/30 font-mono italic">
                        {isAbstain ? 'Abstained' : 'Unvoted'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs mb-6 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Permanent Single-Use Notice:</strong> Once you submit, your Student Voter ID (<strong>{activeVoter?.voterCode}</strong>) will be permanently locked and marked as used. You cannot vote again with this ID.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-semibold transition"
              >
                Go Back & Change
              </button>
              <button
                id="final-confirm-cast-vote-btn"
                onClick={handleConfirmSubmitVote}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-950/60 transition flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting Vote...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirm & Submit Vote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-6 text-center text-xs text-white/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MEMON XULE • Secure Digital School Voting Platform</span>
          <span className="text-[11px] text-white/30">Strictly Confidential Voting Engine • Multi-School DB</span>
        </div>
      </footer>
    </div>
  );
};
