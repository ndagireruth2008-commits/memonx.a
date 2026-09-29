import React, { useState, useEffect } from 'react';
import { School, SchoolElectionResults, PositionResult, Candidate } from '../types';
import { getSchoolElectionResults } from '../services/storage';
import {
  Trophy,
  Maximize2,
  Minimize2,
  Users,
  Award,
  Sparkles,
  ArrowLeft,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Crown,
  BarChart3,
  LayoutGrid,
  RefreshCw,
  Medal,
  Volume2,
  VolumeX,
  TrendingUp,
  ShieldCheck,
  Star,
  CheckCircle2,
  Flame,
  Rotate3d,
  Box
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MemonLogo } from './MemonLogo';
import { Podium3DStage } from './Podium3DStage';

// High-fidelity domain images and 3D renders
import AUDITORIUM_BG from '../assets/images/grand_election_auditorium_1790355626297.jpg';
import GOLD_TROPHY_IMG from '../assets/images/gold_winner_trophy_3d_1790355637230.jpg';
import SILVER_MEDAL_IMG from '../assets/images/runner_up_silver_medal_1790355648027.jpg';
import FEMALE_PREFECT_IMG from '../assets/images/student_prefect_portrait_female_1790355660462.jpg';
import MALE_PREFECT_IMG from '../assets/images/student_prefect_portrait_male_1790355671730.jpg';

interface ProjectorDisplayProps {
  school: School;
  onExit: () => void;
}

type ProjectorMode = 'stage3d' | 'podium' | 'reveal' | 'leaderboard' | 'bento' | 'turnout';

// Zero-broken-image fallback for student leaders
const getCandPhoto = (cand?: Candidate, index: number = 0) => {
  if (cand?.photoUrl && typeof cand.photoUrl === 'string' && cand.photoUrl.trim().length > 10) {
    return cand.photoUrl;
  }
  return index % 2 === 0 ? FEMALE_PREFECT_IMG : MALE_PREFECT_IMG;
};

// Synthesize pleasant celebratory fanfare chime using pure browser Web Audio API (0 dependencies)
function playFanfareChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      
      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.65);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.7);
    });
  } catch (e) {
    // Graceful silent fallback
  }
}

export const ProjectorDisplay: React.FC<ProjectorDisplayProps> = ({ school, onExit }) => {
  const [results, setResults] = useState<SchoolElectionResults>(() => getSchoolElectionResults(school.id));
  const [mode, setMode] = useState<ProjectorMode>('stage3d');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // For Reveal & Podium Position Navigator
  const [activePositionIndex, setActivePositionIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Poll for live results updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = getSchoolElectionResults(school.id);
      setResults(fresh);
    }, 3000);
    return () => clearInterval(interval);
  }, [school.id]);

  // Handle auto-advance carousel for reveal or podium mode
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const len = results.positionsResults.length;
    if (isAutoPlaying && (mode === 'reveal' || mode === 'podium') && len > 0) {
      timer = setInterval(() => {
        setIsRevealed(false);
        setActivePositionIndex((prev) => (prev + 1) % len);
        setTimeout(() => {
          setIsRevealed(true);
          triggerConfetti();
          if (soundEnabled) playFanfareChime();
        }, 900);
      }, 8000);
    }
    return () => clearInterval(timer);
  }, [isAutoPlaying, mode, results.positionsResults.length, soundEnabled]);

  const triggerConfetti = (type: 'burst' | 'fireworks' = 'burst') => {
    if (type === 'burst') {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#10b981', '#38bdf8', '#a855f7'],
      });
    } else {
      // Fireworks multi-burst
      const end = Date.now() + 1500;
      const interval: any = setInterval(() => {
        if (Date.now() > end) {
          return clearInterval(interval);
        }
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: { x: Math.random(), y: Math.random() * 0.4 + 0.2 },
          colors: ['#fbbf24', '#38bdf8', '#10b981', '#ec4899', '#f97316'],
        });
      }, 250);
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentPosition = results.positionsResults[activePositionIndex];

  const handleRevealWinner = () => {
    setIsRevealed(true);
    triggerConfetti('fireworks');
    if (soundEnabled) playFanfareChime();
  };

  const handleNextPosition = () => {
    const len = results.positionsResults.length;
    if (len <= 1) return;
    setIsRevealed(false);
    setActivePositionIndex((prev) => (prev + 1) % len);
  };

  const handlePrevPosition = () => {
    const len = results.positionsResults.length;
    if (len <= 1) return;
    setIsRevealed(false);
    setActivePositionIndex((prev) => (prev - 1 + len) % len);
  };

  const isDark = theme === 'dark';

  return (
    <div
      id="memon-projector-display-root"
      className={`min-h-screen transition-colors duration-300 flex flex-col justify-between overflow-x-hidden select-none font-sans ${
        isDark ? 'bg-[#060709] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Projector Control HUD (Cinematic & Clean) */}
      <header
        className={`px-6 py-3.5 flex items-center justify-between border-b backdrop-blur-xl z-30 sticky top-0 ${
          isDark ? 'bg-[#0B0D12]/90 border-white/10 shadow-2xl' : 'bg-white/90 border-slate-200 shadow-md'
        }`}
      >
        {/* School & Brand Info */}
        <div className="flex items-center gap-4">
          <button
            id="exit-projector-btn"
            onClick={onExit}
            className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
              isDark
                ? 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 hover:border-white/20'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Projector</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-brand font-extrabold text-base tracking-wider uppercase text-white">
                {school.name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>Auditorium Projections</span>
              </span>
            </div>
            <p className="text-xs text-white/50">
              Reg: {school.regNumber} • {school.electionTitle || 'Student Leadership Elections'}
            </p>
          </div>
        </div>

        {/* Display Style Mode Switcher */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center p-1 rounded-2xl border text-xs font-semibold ${
              isDark ? 'bg-black/60 border-white/10' : 'bg-slate-200 border-slate-300'
            }`}
          >
            <button
              id="mode-stage3d-btn"
              onClick={() => setMode('stage3d')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                mode === 'stage3d'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'opacity-70 hover:opacity-100 text-amber-300'
              }`}
            >
              <Rotate3d className="w-3.5 h-3.5" />
              <span>3D Models Stage</span>
            </button>
            <button
              id="mode-podium-btn"
              onClick={() => setMode('podium')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                mode === 'podium'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                  : 'opacity-60 hover:opacity-100 text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Podium Stage</span>
            </button>
            <button
              id="mode-reveal-btn"
              onClick={() => {
                setMode('reveal');
                setIsRevealed(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                mode === 'reveal'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20'
                  : 'opacity-60 hover:opacity-100 text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reveal Ceremony</span>
            </button>
            <button
              id="mode-leaderboard-btn"
              onClick={() => setMode('leaderboard')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                mode === 'leaderboard'
                  ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20'
                  : 'opacity-60 hover:opacity-100 text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </button>
            <button
              id="mode-bento-btn"
              onClick={() => setMode('bento')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                mode === 'bento'
                  ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20'
                  : 'opacity-60 hover:opacity-100 text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Full Council</span>
            </button>
            <button
              id="mode-turnout-btn"
              onClick={() => setMode('turnout')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                mode === 'turnout'
                  ? 'bg-teal-600 text-white font-bold shadow-lg shadow-teal-500/20'
                  : 'opacity-60 hover:opacity-100 text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Turnout Stats</span>
            </button>
          </div>

          {/* Quick HUD Actions */}
          <button
            onClick={() => {
              triggerConfetti('fireworks');
              if (soundEnabled) playFanfareChime();
            }}
            title="Launch Confetti Fireworks"
            className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Celebration Sound' : 'Enable Celebration Sound'}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/5 text-white/40 border-white/10'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title="Toggle theme"
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isDark ? 'bg-white/5 text-amber-300 border-white/10' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={handleToggleFullscreen}
            title="Toggle fullscreen for projector"
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isDark ? 'bg-white/5 text-slate-200 border-white/10' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Projector Stage Area */}
      <main className="flex-1 flex flex-col justify-center p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {results.positionsResults.length === 0 ? (
          <div className={`p-16 text-center rounded-3xl border ${isDark ? 'bg-[#0E1017] border-white/10' : 'bg-white border-slate-200'}`}>
            <Award className="w-16 h-16 mx-auto mb-4 text-amber-400 opacity-60" />
            <h3 className="text-2xl font-bold font-brand text-white">No Leadership Positions Configured</h3>
            <p className="text-xs text-white/50 mt-1 max-w-md mx-auto">
              The school administration has not registered any candidate positions or offices for this election yet. Return to the Admin Dashboard to set up positions and candidates.
            </p>
          </div>
        ) : (
          <>
            {/* ================= STYLE 0: INTERACTIVE 3D WEBGL PODIUM STAGE (THREE.JS 3D MODELS) ================= */}
            {mode === 'stage3d' && currentPosition && (
              <div className="w-full h-[760px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative animate-fade-in my-auto">
                <Podium3DStage
                  positionResult={currentPosition}
                  soundEnabled={soundEnabled}
                  onNextPosition={handleNextPosition}
                  onPrevPosition={handlePrevPosition}
                  hasMultiplePositions={results.positionsResults.length > 1}
                  positionIndex={activePositionIndex}
                  totalPositions={results.positionsResults.length}
                />
              </div>
            )}

            {/* ================= STYLE 1: 3D OLYMPIC GUILD PODIUM STAGE (WINNER & ALL CONTENDERS) ================= */}
            {mode === 'podium' && currentPosition && (
              <div className="space-y-8 animate-fade-in">
                {/* Position Switcher Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrevPosition}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                        Office #{activePositionIndex + 1} of {results.positionsResults.length}
                      </span>
                      <h2 className="text-2xl sm:text-4xl font-extrabold font-brand tracking-wide text-white">
                        {currentPosition.position.title}
                      </h2>
                    </div>
                    <button
                      onClick={handleNextPosition}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setMode('stage3d')}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                      title="Launch Interactive 3D WebGL Orbit Stage"
                    >
                      <Rotate3d className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
                      <span>3D WebGL Stage</span>
                    </button>
                    <div className="px-4 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                      {currentPosition.totalVotes} Total Ballots Cast
                    </div>
                    <button
                      onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                      className={`px-4 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                        isAutoPlaying
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-white/5 text-white/70 border-white/10 hover:text-white'
                      }`}
                    >
                      {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>Auto-Carousel</span>
                    </button>
                  </div>
                </div>

                {/* THE 3-TIER GRAND PODIUM */}
                {(() => {
                  const sorted = [...currentPosition.candidates].sort((a, b) => b.votes - a.votes);
                  const first = sorted[0];
                  const second = sorted[1];
                  const third = sorted[2];
                  const rest = sorted.slice(3);

                  const winnerVotes = first?.votes || 0;

                  return (
                    <div className="space-y-10">
                      {/* Main 3D Pedestals Container */}
                      <div className="flex flex-col md:flex-row items-end justify-center gap-4 sm:gap-6 pt-10 pb-4 max-w-4xl mx-auto">
                        
                        {/* 2ND PLACE (SILVER - 1ST RUNNER-UP) */}
                        {second ? (
                          <div className="w-full md:w-1/3 flex flex-col items-center order-2 md:order-1 animate-scale-in">
                            {/* Candidate Avatar & Silver Medal */}
                            <div className="relative mb-3 group">
                              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-800 shadow-xl ring-4 ring-slate-300/20">
                                <img
                                  src={getCandPhoto(second, 1)}
                                  alt={second.fullName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-950 flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white">
                                2
                              </div>
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-300/40 text-[10px] font-mono text-slate-200 font-bold uppercase tracking-wider whitespace-nowrap shadow">
                                1st Runner-Up
                              </div>
                            </div>

                            <div className="text-center mb-3">
                              <h4 className="font-bold text-base text-slate-200 line-clamp-1">{second.fullName}</h4>
                              <p className="text-[11px] text-white/50 font-mono">{second.gradeOrClass}</p>
                              <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-mono">
                                <span className="font-bold text-slate-300">{second.votes} votes</span>
                                <span className="text-white/40">({second.percentage}%)</span>
                              </div>
                              {winnerVotes > second.votes && (
                                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-mono">
                                  -{winnerVotes - second.votes} votes behind
                                </span>
                              )}
                            </div>

                            {/* Silver Pedestal Pillar with 3D Medal Render */}
                            <div className="w-full h-36 sm:h-44 rounded-t-2xl bg-gradient-to-b from-slate-400/30 via-slate-600/20 to-slate-800/40 border-t-2 border-x-2 border-slate-300/40 flex flex-col items-center justify-between p-3 shadow-lg backdrop-blur-md relative overflow-hidden">
                              <div className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase flex items-center gap-1">
                                <Medal className="w-3.5 h-3.5" />
                                <span>Silver Runner-Up</span>
                              </div>
                              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg border border-slate-300/40 bg-black/40 my-0.5">
                                <img src={SILVER_MEDAL_IMG} alt="3D Silver Medal" className="w-full h-full object-cover" />
                              </div>
                              <div className="text-3xl font-extrabold font-brand text-slate-200/90">2ND</div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full md:w-1/3 hidden md:block order-2 md:order-1" />
                        )}

                        {/* 1ST PLACE (GOLD - THE ELECTED WINNER) */}
                        {first && (
                          <div className="w-full md:w-1/3 flex flex-col items-center order-1 md:order-2 z-10 animate-scale-in">
                            {/* Crown & Radiant Halo Avatar */}
                            <div className="relative mb-3">
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-bounce">
                                <Crown className="w-10 h-10 stroke-[2.5]" />
                              </div>
                              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-4 border-amber-400 bg-slate-900 shadow-2xl ring-8 ring-amber-400/20">
                                <img
                                  src={getCandPhoto(first, 0)}
                                  alt={first.fullName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 flex items-center justify-center font-extrabold text-sm shadow-xl border-2 border-white">
                                1
                              </div>
                              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-extrabold text-xs font-mono uppercase tracking-wider whitespace-nowrap shadow-xl flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>ELECTED WINNER</span>
                              </div>
                            </div>

                            <div className="text-center mb-3 mt-1">
                              <h3 className="text-xl sm:text-2xl font-extrabold font-brand text-amber-300 tracking-wide line-clamp-1">
                                {first.fullName}
                              </h3>
                              <p className="text-xs text-emerald-400 font-mono font-semibold">{first.gradeOrClass}</p>
                              <div className="mt-1 flex items-center justify-center gap-2 text-sm font-mono">
                                <span className="font-extrabold text-amber-400 text-base">{first.votes} votes</span>
                                <span className="text-emerald-400 font-bold">({first.percentage}%)</span>
                              </div>
                              {second && (
                                <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                                  +{first.votes - second.votes} vote victory lead
                                </span>
                              )}
                            </div>

                            {/* Gold Pedestal Pillar with 3D Trophy Render */}
                            <div className="w-full h-48 sm:h-56 rounded-t-3xl bg-gradient-to-b from-amber-500/40 via-amber-600/30 to-slate-900 border-t-4 border-x-4 border-amber-400/70 flex flex-col items-center justify-between p-3.5 shadow-2xl backdrop-blur-md relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-b from-amber-400/10 to-transparent pointer-events-none" />
                              <div className="text-xs font-mono font-bold tracking-widest text-amber-300 uppercase flex items-center gap-1.5">
                                <Crown className="w-3.5 h-3.5" />
                                <span>Gold Champion</span>
                              </div>
                              {/* 3D Gold Trophy Visual Badge */}
                              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400/60 bg-black/60 my-0.5">
                                <img src={GOLD_TROPHY_IMG} alt="3D Gold Trophy" className="w-full h-full object-cover" />
                              </div>
                              <div className="text-5xl font-extrabold font-brand text-amber-300 drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)]">
                                1ST
                              </div>
                              <div className="text-[11px] font-mono font-bold text-amber-200 uppercase tracking-widest bg-amber-500/20 px-3 py-0.5 rounded-full border border-amber-400/30">
                                Guild Prefect
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3RD PLACE (BRONZE - 2ND RUNNER-UP) */}
                        {third ? (
                          <div className="w-full md:w-1/3 flex flex-col items-center order-3 animate-scale-in">
                            {/* Candidate Avatar & Bronze Medal */}
                            <div className="relative mb-3 group">
                              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-700 bg-slate-800 shadow-xl ring-4 ring-amber-700/20">
                                <img
                                  src={getCandPhoto(third, 2)}
                                  alt={third.fullName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-lg border-2 border-amber-300">
                                3
                              </div>
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-800 border border-amber-700/40 text-[10px] font-mono text-amber-200 font-bold uppercase tracking-wider whitespace-nowrap shadow">
                                2nd Runner-Up
                              </div>
                            </div>

                            <div className="text-center mb-3">
                              <h4 className="font-bold text-base text-amber-200 line-clamp-1">{third.fullName}</h4>
                              <p className="text-[11px] text-white/50 font-mono">{third.gradeOrClass}</p>
                              <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-mono">
                                <span className="font-bold text-amber-300">{third.votes} votes</span>
                                <span className="text-white/40">({third.percentage}%)</span>
                              </div>
                              {winnerVotes > third.votes && (
                                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-mono">
                                  -{winnerVotes - third.votes} votes behind
                                </span>
                              )}
                            </div>

                            {/* Bronze Pedestal Pillar */}
                            <div className="w-full h-28 sm:h-36 rounded-t-2xl bg-gradient-to-b from-amber-700/30 via-amber-800/20 to-slate-800/40 border-t-2 border-x-2 border-amber-600/40 flex flex-col items-center justify-between p-3 shadow-lg backdrop-blur-md">
                              <div className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                                Bronze Contender
                              </div>
                              <div className="text-3xl font-extrabold font-brand text-amber-300/80">3RD</div>
                              <div className="text-[10px] font-mono text-amber-400">2nd Runner-Up</div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full md:w-1/3 hidden md:block order-3" />
                        )}
                      </div>

                      {/* HONOR ROLL OF CONTENDERS (RUNNERS-UP / 4TH PLACE & BEYOND) */}
                      {rest.length > 0 && (
                        <div className="p-6 rounded-3xl bg-[#0B0D12] border border-white/10 shadow-xl">
                          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
                            <span className="text-xs font-mono uppercase tracking-widest text-white/50 font-bold flex items-center gap-2">
                              <Medal className="w-4 h-4 text-blue-400" />
                              <span>Commended Student Contenders & Ballot Roll</span>
                            </span>
                            <span className="text-xs text-white/40 font-mono">
                              Honoring democratic participation
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {rest.map((cand, idx) => (
                              <div
                                key={cand.id}
                                className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <img
                                      src={cand.photoUrl}
                                      alt={cand.fullName}
                                      className="w-12 h-12 rounded-xl object-cover border border-white/10"
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center border border-white/10">
                                      {idx + 4}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-bold text-sm text-white line-clamp-1">{cand.fullName}</div>
                                    <div className="text-[11px] text-white/40 font-mono">{cand.gradeOrClass}</div>
                                  </div>
                                </div>

                                <div className="text-right font-mono">
                                  <div className="text-sm font-bold text-slate-200">{cand.votes} votes</div>
                                  <div className="text-[11px] text-white/40">{cand.percentage}%</div>
                                  <div className="text-[10px] text-rose-400 font-mono">-{winnerVotes - cand.votes} behind</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ================= STYLE 2: DRAMATIC WINNER & CONTENDERS REVEAL CEREMONY ================= */}
            {mode === 'reveal' && currentPosition && (
              <div className="animate-fade-in flex flex-col items-center justify-center text-center py-4">
                {/* Position Carousel Navigator */}
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={handlePrevPosition}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition cursor-pointer"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="px-6 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-sm font-bold">
                    Position {activePositionIndex + 1} of {results.positionsResults.length}
                  </div>

                  <button
                    onClick={handleNextPosition}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition cursor-pointer"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  <button
                    onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                    className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                      isAutoPlaying
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-white/5 text-white/70 border-white/10'
                    }`}
                  >
                    {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>Auto-Slideshow</span>
                  </button>
                </div>

                <div className="max-w-4xl w-full mx-auto">
                  <span className="text-xs uppercase tracking-widest text-amber-400 font-mono font-bold block mb-2">
                    Official Assembly Proclamation
                  </span>
                  <h2 className="text-3xl sm:text-6xl font-extrabold font-brand tracking-wide mb-8 text-white">
                    {currentPosition.position.title}
                  </h2>

                  {!isRevealed ? (
                    /* Suspense Sealed Vault */
                    <div className="rounded-3xl p-12 border-2 border-dashed border-amber-500/40 bg-[#0E1017] flex flex-col items-center justify-center space-y-6 shadow-2xl">
                      <div className="w-28 h-28 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center animate-pulse ring-8 ring-amber-500/10">
                        <Trophy className="w-14 h-14" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl sm:text-3xl font-bold font-brand text-white">
                          Auditorium Ballots Cryptographically Sealed
                        </h3>
                        <p className="text-sm text-white/60 max-w-md mx-auto">
                          <strong>{currentPosition.totalVotes}</strong> student votes have been counted and audited for this post.
                        </p>
                      </div>
                      <button
                        id="trigger-reveal-winner-btn"
                        onClick={handleRevealWinner}
                        className="px-10 py-5 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-extrabold text-xl rounded-2xl shadow-2xl shadow-amber-500/30 transform hover:scale-105 active:scale-95 transition flex items-center gap-3 cursor-pointer"
                      >
                        <Sparkles className="w-6 h-6" />
                        <span>REVEAL WINNER & STANDINGS</span>
                      </button>
                    </div>
                  ) : (
                    /* Glorious Winner & Contenders Presentation */
                    <div className="space-y-8 animate-scale-in">
                      {/* WINNER SHOWCASE CARD */}
                      <div className="rounded-3xl p-8 sm:p-12 border-4 border-amber-400 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#121520] via-[#0B0D14] to-[#0B0D14] shadow-amber-500/20 text-center">
                        <div className="absolute top-4 right-4">
                          <button
                            onClick={() => triggerConfetti('fireworks')}
                            className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>More Confetti</span>
                          </button>
                        </div>

                        {(() => {
                          const sorted = [...currentPosition.candidates].sort((a, b) => b.votes - a.votes);
                          const winner = sorted[0];
                          const runnerUp = sorted[1];

                          if (!winner || winner.votes === 0) {
                            return (
                              <div className="py-8 space-y-4">
                                <div className="text-2xl font-bold text-amber-400">Election Standstill / Tie</div>
                                <p className="text-sm text-white/70">
                                  No votes have been recorded for this position yet or a deadlock exists.
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="flex flex-col items-center space-y-6">
                              {/* Winner Badge, 3D Trophy & Laurel */}
                              <div className="flex items-center justify-center gap-6 sm:gap-8">
                                <div className="hidden sm:flex flex-col items-center animate-fade-in">
                                  <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400/60 bg-black/70 p-1">
                                    <img src={GOLD_TROPHY_IMG} alt="3D Gold Championship Trophy" className="w-full h-full object-cover rounded-xl" />
                                  </div>
                                  <span className="text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider mt-1">3D Gold Cup</span>
                                </div>

                                <div className="relative">
                                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.9)] animate-bounce">
                                    <Crown className="w-12 h-12 stroke-[2.5]" />
                                  </div>
                                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-4 border-amber-400 shadow-2xl ring-8 ring-amber-400/20 bg-slate-900">
                                    <img
                                      src={getCandPhoto(winner, 0)}
                                      alt={winner.fullName}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold font-mono text-xs shadow-xl uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>ELECTED WINNER</span>
                                  </div>
                                </div>

                                <div className="hidden sm:flex flex-col items-center animate-fade-in">
                                  <button
                                    onClick={() => setMode('stage3d')}
                                    className="w-24 h-24 rounded-2xl border-2 border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-slate-950 p-2 flex flex-col items-center justify-center gap-1.5 text-amber-300 hover:scale-105 hover:border-amber-400 transition cursor-pointer shadow-lg"
                                    title="View this Winner on the 3D Orbit Stage"
                                  >
                                    <Rotate3d className="w-7 h-7 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                                    <span className="text-[10px] font-bold text-center leading-tight">3D Orbit Stage</span>
                                  </button>
                                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-1">Interactive</span>
                                </div>
                              </div>

                              {/* Name & Title */}
                              <div className="space-y-1 mt-2">
                                <h3 className="text-3xl sm:text-5xl font-extrabold font-brand tracking-wider text-amber-300">
                                  {winner.fullName}
                                </h3>
                                <p className="text-base sm:text-lg font-mono font-semibold text-emerald-400">
                                  {winner.gradeOrClass}
                                </p>
                                {winner.manifesto && (
                                  <p className="text-xs sm:text-sm text-white/60 italic max-w-lg mx-auto pt-2">
                                    "{winner.manifesto}"
                                  </p>
                                )}
                              </div>

                              {/* Winning Stats Pod */}
                              <div className="grid grid-cols-2 gap-4 max-w-md w-full my-4">
                                <div className="p-4 rounded-2xl bg-black/60 border border-white/10 text-center">
                                  <div className="text-xs text-white/50 uppercase font-mono">Ballots Received</div>
                                  <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-400 mt-0.5">
                                    {winner.votes}
                                  </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-black/60 border border-white/10 text-center">
                                  <div className="text-xs text-white/50 uppercase font-mono">Vote Share</div>
                                  <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 mt-0.5">
                                    {winner.percentage}%
                                  </div>
                                </div>
                              </div>

                              {/* HEAD-TO-HEAD BATTLE METER (WINNER VS RUNNER-UP) */}
                              {runnerUp && (
                                <div className="w-full max-w-xl mx-auto p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                                  <div className="flex items-center justify-between text-xs font-mono font-semibold">
                                    <span className="text-amber-400 flex items-center gap-1.5">
                                      <Crown className="w-3.5 h-3.5" />
                                      {winner.fullName.split(' ')[0]} ({winner.votes})
                                    </span>
                                    <span className="text-emerald-400 font-bold">
                                      +{winner.votes - runnerUp.votes} Vote Margin
                                    </span>
                                    <span className="text-slate-300">
                                      {runnerUp.fullName.split(' ')[0]} ({runnerUp.votes})
                                    </span>
                                  </div>
                                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                                    <div
                                      className="bg-amber-400 h-full transition-all duration-1000"
                                      style={{
                                        width: `${
                                          winner.votes + runnerUp.votes > 0
                                            ? (winner.votes / (winner.votes + runnerUp.votes)) * 100
                                            : 50
                                        }%`,
                                      }}
                                    />
                                    <div
                                      className="bg-slate-400 h-full transition-all duration-1000"
                                      style={{
                                        width: `${
                                          winner.votes + runnerUp.votes > 0
                                            ? (runnerUp.votes / (winner.votes + runnerUp.votes)) * 100
                                            : 50
                                        }%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* RUNNERS-UP & CONTENDERS HONOR GALLERY */}
                      {(() => {
                        const sorted = [...currentPosition.candidates].sort((a, b) => b.votes - a.votes);
                        const contenders = sorted.slice(1);
                        const winner = sorted[0];

                        if (contenders.length === 0) return null;

                        return (
                          <div className="rounded-3xl p-6 sm:p-8 bg-[#0E1017] border border-white/10 text-left">
                            <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/5">
                              <div>
                                <span className="text-xs uppercase font-mono tracking-widest text-slate-400 font-bold flex items-center gap-2">
                                  <Medal className="w-4 h-4 text-slate-300" />
                                  <span>Democratic Runners-Up & Candidate Honor Roll</span>
                                </span>
                                <p className="text-xs text-white/40 mt-0.5">
                                  Recognizing the outstanding leadership and campaign efforts of all student candidates
                                </p>
                              </div>
                              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-white/60">
                                {contenders.length} Contender{contenders.length > 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                              {contenders.map((cand, idx) => {
                                const rank = idx + 2;
                                const isSecond = rank === 2;
                                const isThird = rank === 3;
                                const voteDeficit = (winner?.votes || 0) - cand.votes;

                                return (
                                  <div
                                    key={cand.id}
                                    className={`rounded-2xl p-5 border transition flex flex-col justify-between ${
                                      isSecond
                                        ? 'bg-slate-900/60 border-slate-400/40 shadow-lg shadow-slate-500/10'
                                        : isThird
                                        ? 'bg-amber-950/20 border-amber-700/40'
                                        : 'bg-black/40 border-white/5'
                                    }`}
                                  >
                                    <div>
                                      {/* Rank Header */}
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`w-6 h-6 rounded-full font-mono text-xs font-extrabold flex items-center justify-center ${
                                              isSecond
                                                ? 'bg-slate-300 text-slate-950 shadow'
                                                : isThird
                                                ? 'bg-amber-700 text-amber-100 shadow'
                                                : 'bg-white/10 text-white/70'
                                            }`}
                                          >
                                            {rank}
                                          </span>
                                          <span
                                            className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                                              isSecond
                                                ? 'text-slate-200'
                                                : isThird
                                                ? 'text-amber-300'
                                                : 'text-white/50'
                                            }`}
                                          >
                                            {isSecond ? '1st Runner-Up' : isThird ? '2nd Runner-Up' : 'Contender'}
                                          </span>
                                        </div>

                                        <span className="text-[10px] font-mono text-white/40">
                                          Ballot #{cand.ballotNumber}
                                        </span>
                                      </div>

                                      {/* Photo & Details */}
                                      <div className="flex items-center gap-3.5 mb-3">
                                        <div className="relative shrink-0">
                                          <img
                                            src={getCandPhoto(cand, idx + 1)}
                                            alt={cand.fullName}
                                            className={`w-14 h-14 rounded-xl object-cover border-2 ${
                                              isSecond
                                                ? 'border-slate-300'
                                                : isThird
                                                ? 'border-amber-600'
                                                : 'border-white/10'
                                            }`}
                                            referrerPolicy="no-referrer"
                                          />
                                          {isSecond && (
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full overflow-hidden border border-slate-300 shadow">
                                              <img src={SILVER_MEDAL_IMG} alt="3D Medal" className="w-full h-full object-cover" />
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <h4 className="font-bold text-sm text-white line-clamp-1">
                                            {cand.fullName}
                                          </h4>
                                          <div className="text-[11px] text-white/50 font-mono">
                                            {cand.gradeOrClass}
                                          </div>
                                          {cand.manifesto && (
                                            <p className="text-[10px] text-white/40 line-clamp-1 italic mt-0.5">
                                              "{cand.manifesto}"
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Vote Tally & Deficit */}
                                    <div className="pt-3 border-t border-white/5 flex items-center justify-between font-mono text-xs">
                                      <div>
                                        <span className="font-extrabold text-white text-sm">{cand.votes}</span>
                                        <span className="text-white/40 ml-1">votes ({cand.percentage}%)</span>
                                      </div>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono">
                                        -{voteDeficit} behind
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= STYLE 3: ASSEMBLY LEADERBOARD (TIERED RANKINGS) ================= */}
            {mode === 'leaderboard' && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Auditorium Live Standings Board
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-extrabold font-brand tracking-wider text-white">
                    Official Election Leaderboard
                  </h2>
                  <p className="text-sm text-white/60 mt-1">
                    Turnout: <strong className="text-emerald-400">{results.totalVoted}</strong> of <strong className="text-white">{results.totalEligible}</strong> pupils voted ({results.turnoutPercentage}%)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {results.positionsResults.map((posRes) => {
                    const sorted = [...posRes.candidates].sort((a, b) => b.votes - a.votes);
                    const winnerVotes = sorted[0]?.votes || 0;

                    return (
                      <div
                        key={posRes.position.id}
                        className="rounded-3xl p-6 sm:p-8 border-2 border-white/10 bg-[#0E1017] shadow-2xl relative overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          {/* Position Header */}
                          <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
                            <div>
                              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-mono font-bold">
                                Leadership Post
                              </span>
                              <h3 className="text-xl sm:text-2xl font-bold font-brand text-white">
                                {posRes.position.title}
                              </h3>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-white/50 font-mono">Ballots Cast</span>
                              <div className="text-xl font-extrabold font-mono text-emerald-400">
                                {posRes.totalVotes}
                              </div>
                            </div>
                          </div>

                          {/* Candidates Ranked Cards */}
                          <div className="space-y-4">
                            {sorted.map((cand, idx) => {
                              const rank = idx + 1;
                              const isWinner = rank === 1 && cand.votes > 0;
                              const isSecond = rank === 2;
                              const isThird = rank === 3;
                              const deficit = winnerVotes - cand.votes;

                              return (
                                <div
                                  key={cand.id}
                                  className={`p-3.5 rounded-2xl border transition-all ${
                                    isWinner
                                      ? 'bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent border-amber-400/50 shadow-md ring-1 ring-amber-400/20'
                                      : isSecond
                                      ? 'bg-slate-900/50 border-slate-400/30'
                                      : isThird
                                      ? 'bg-amber-950/15 border-amber-700/20'
                                      : 'bg-black/40 border-white/5'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      {/* Rank Badge */}
                                      <span
                                        className={`w-6 h-6 rounded-full font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                                          isWinner
                                            ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                                            : isSecond
                                            ? 'bg-slate-300 text-slate-950'
                                            : isThird
                                            ? 'bg-amber-700 text-amber-100'
                                            : 'bg-white/10 text-white/60'
                                        }`}
                                      >
                                        {rank}
                                      </span>

                                      {/* Avatar */}
                                      <img
                                        src={getCandPhoto(cand, idx)}
                                        alt={cand.fullName}
                                        className={`w-10 h-10 rounded-xl object-cover border shrink-0 ${
                                          isWinner ? 'border-amber-400' : 'border-white/10'
                                        }`}
                                        referrerPolicy="no-referrer"
                                      />

                                      <div>
                                        <div className="font-bold text-sm text-white flex items-center gap-2">
                                          <span>{cand.fullName}</span>
                                          {isWinner && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-mono uppercase font-extrabold flex items-center gap-1">
                                              <Crown className="w-2.5 h-2.5" />
                                              Winner
                                            </span>
                                          )}
                                          {isSecond && (
                                            <span className="px-2 py-0.5 rounded-full bg-slate-300/15 text-slate-300 border border-slate-300/25 text-[9px] font-mono uppercase font-bold">
                                              Runner-Up
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-white/40 font-mono">
                                          #{cand.ballotNumber} • {cand.gradeOrClass}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Vote Numbers & Margin */}
                                    <div className="text-right font-mono">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <span className="text-base font-extrabold text-white">{cand.votes}</span>
                                        <span className="text-xs text-white/50 font-bold">({cand.percentage}%)</span>
                                      </div>
                                      {!isWinner && deficit > 0 && (
                                        <span className="text-[10px] text-rose-400 font-mono">-{deficit} behind</span>
                                      )}
                                      {isWinner && sorted.length > 1 && sorted[1].votes < cand.votes && (
                                        <span className="text-[10px] text-emerald-400 font-mono">
                                          +{cand.votes - sorted[1].votes} lead
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Visual Progress Bar */}
                                  <div className="w-full h-2.5 rounded-full bg-black/60 overflow-hidden border border-white/5">
                                    <div
                                      className={`h-full rounded-full transition-all duration-1000 ${
                                        isWinner
                                          ? 'bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 shadow-md shadow-amber-400/20'
                                          : isSecond
                                          ? 'bg-slate-300'
                                          : isThird
                                          ? 'bg-amber-600'
                                          : 'bg-white/20'
                                      }`}
                                      style={{ width: `${Math.max(3, cand.percentage)}%` }}
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

            {/* ================= STYLE 4: FULL PREFECTORIAL COUNCIL (BENTO GRID) ================= */}
            {mode === 'bento' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <h2 className="text-3xl sm:text-4xl font-extrabold font-brand tracking-wider text-white">
                    Full Prefectorial Council & Guild Board
                  </h2>
                  <p className="text-xs text-white/50 font-mono mt-1">
                    Auditorium Council Chamber Overview • {school.name}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.positionsResults.map((posRes) => {
                    const sorted = [...posRes.candidates].sort((a, b) => b.votes - a.votes);
                    const winner = sorted[0];
                    const runnerUp = sorted[1];

                    return (
                      <div
                        key={posRes.position.id}
                        className="rounded-3xl p-6 border-2 border-white/10 bg-[#0E1017] shadow-xl flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
                            <div>
                              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold">
                                Office
                              </span>
                              <h3 className="text-lg font-bold font-brand text-white line-clamp-1">
                                {posRes.position.title}
                              </h3>
                            </div>
                            <span className="text-xs font-mono text-emerald-400 font-bold">
                              {posRes.totalVotes} votes
                            </span>
                          </div>

                          {winner && winner.votes > 0 ? (
                            <div className="space-y-3">
                              {/* Elected Winner Spotlight */}
                              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center gap-3">
                                <div className="relative">
                                  <img
                                    src={getCandPhoto(winner, 0)}
                                    alt={winner.fullName}
                                    className="w-14 h-14 rounded-xl object-cover border-2 border-amber-400 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <Crown className="w-4 h-4 text-amber-400 absolute -top-1.5 -right-1.5" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">
                                    Elected Winner
                                  </div>
                                  <div className="text-sm font-bold text-white line-clamp-1">{winner.fullName}</div>
                                  <div className="text-[11px] text-white/50 font-mono">{winner.gradeOrClass}</div>
                                  <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                                    {winner.votes} votes ({winner.percentage}%)
                                  </div>
                                </div>
                              </div>

                              {/* Runner-Up Contender */}
                              {runnerUp && (
                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-400/40 shrink-0 relative">
                                      <img src={getCandPhoto(runnerUp, 1)} alt={runnerUp.fullName} className="w-full h-full object-cover" />
                                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-slate-300 text-slate-950 font-mono text-[8px] font-bold flex items-center justify-center">
                                        2
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-white/80 font-semibold line-clamp-1">
                                        {runnerUp.fullName}
                                      </span>
                                      <span className="text-[10px] text-white/40 font-mono block">Runner-Up</span>
                                    </div>
                                  </div>
                                  <div className="text-right font-mono">
                                    <span className="text-slate-300 font-bold">{runnerUp.votes} votes</span>
                                    <span className="text-[10px] text-rose-400 block">
                                      -{winner.votes - runnerUp.votes} behind
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-6 text-center text-xs text-white/40 bg-black/30 rounded-2xl">
                              No ballots cast for this post
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================= STYLE 5: TURNOUT & STATS ================= */}
            {mode === 'turnout' && (
              <div className="max-w-4xl mx-auto w-full text-center space-y-8 animate-fade-in py-6">
                <MemonLogo size="md" centered={true} />

                <h2 className="text-3xl sm:text-5xl font-extrabold font-brand tracking-wider text-white">
                  Student Participation & Voter Turnout
                </h2>

                {/* Giant Turnout Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
                  <div className="p-8 rounded-3xl border border-white/10 bg-[#0E1017] shadow-xl">
                    <div className="text-xs font-mono uppercase text-white/50 mb-1">Eligible Pupils</div>
                    <div className="text-5xl font-extrabold font-mono text-white">{results.totalEligible}</div>
                    <div className="text-xs text-white/40 mt-2">Registered student voter slips</div>
                  </div>

                  <div className="p-8 rounded-3xl border border-emerald-500/40 bg-emerald-950/20 shadow-xl">
                    <div className="text-xs font-mono uppercase text-emerald-400 mb-1">Ballots Cast</div>
                    <div className="text-5xl font-extrabold font-mono text-emerald-400">{results.totalVoted}</div>
                    <div className="text-xs text-emerald-300/70 mt-2">Verified anonymous votes</div>
                  </div>

                  <div className="p-8 rounded-3xl border border-amber-500/40 bg-amber-950/20 shadow-xl">
                    <div className="text-xs font-mono uppercase text-amber-400 mb-1">Overall Turnout</div>
                    <div className="text-5xl font-extrabold font-mono text-amber-400">{results.turnoutPercentage}%</div>
                    <div className="text-xs text-amber-300/70 mt-2">School democratic participation</div>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="space-y-2 max-w-2xl mx-auto">
                  <div className="flex justify-between text-xs font-mono text-white/70">
                    <span>0%</span>
                    <span className="font-bold text-emerald-400">
                      {results.totalVoted} of {results.totalEligible} pupils voted
                    </span>
                    <span>100%</span>
                  </div>
                  <div className="w-full h-6 rounded-full bg-slate-900 overflow-hidden p-1 border border-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-400 transition-all duration-1000 shadow-lg shadow-emerald-500/20"
                      style={{ width: `${results.turnoutPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer Info on Projector */}
      <footer className="px-6 py-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50 font-mono">
        <span>MEMON XULE • Official School E-Voting Results Broadcaster</span>
        <span className="flex items-center gap-1.5 text-emerald-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Live database sync active
        </span>
      </footer>
    </div>
  );
};
