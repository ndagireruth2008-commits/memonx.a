import React, { useState, useEffect } from 'react';
import { School, StudentVoter } from './types';
import {
  getSchools,
  getSchoolById,
  getVotersBySchool,
  initStorageSync,
  subscribeToDataSync,
} from './services/storage';
import { VoterPortal } from './components/VoterPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { ProjectorDisplay } from './components/ProjectorDisplay';
import { PrintableVoterCards } from './components/PrintableVoterCards';
import { SchoolAuthModal } from './components/SchoolAuthModals';
import { AntigravityBackground } from './components/AntigravityBackground';

type AppView = 'voter' | 'admin' | 'projector' | 'print-cards';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('voter');
  const [activeAdminSchool, setActiveAdminSchool] = useState<School | null>(null);
  const [votersForPrint, setVotersForPrint] = useState<StudentVoter[]>([]);
  
  // Auth Modal state
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Initialize central cross-device synchronization engine
  useEffect(() => {
    initStorageSync();

    const unsubscribe = subscribeToDataSync((syncedDb) => {
      // If admin is logged in, keep activeAdminSchool in sync with server changes
      if (activeAdminSchool) {
        const updated = syncedDb.schools.find((s) => s.id === activeAdminSchool.id);
        if (updated) {
          setActiveAdminSchool(updated);
        }
      } else {
        const savedSchoolId = localStorage.getItem('memon_active_admin_school');
        if (savedSchoolId) {
          const sch = syncedDb.schools.find((s) => s.id === savedSchoolId);
          if (sch) {
            setActiveAdminSchool(sch);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [activeAdminSchool?.id]);

  // Restore saved admin session if exists
  useEffect(() => {
    try {
      const savedSchoolId = localStorage.getItem('memon_active_admin_school');
      if (savedSchoolId) {
        const sch = getSchoolById(savedSchoolId);
        if (sch) {
          setActiveAdminSchool(sch);
        }
      }
    } catch (e) {
      console.error('Session restore error:', e);
    }
  }, []);

  const handleSchoolAuthSuccess = (school: School) => {
    setActiveAdminSchool(school);
    localStorage.setItem('memon_active_admin_school', school.id);
    setCurrentView('admin');
  };

  const handleAdminLogout = () => {
    setActiveAdminSchool(null);
    localStorage.removeItem('memon_active_admin_school');
    setCurrentView('voter');
  };

  const handleOpenPrintCards = () => {
    if (activeAdminSchool) {
      const vts = getVotersBySchool(activeAdminSchool.id);
      setVotersForPrint(vts);
      setCurrentView('print-cards');
    }
  };

  const handleOpenProjector = () => {
    if (activeAdminSchool) {
      setCurrentView('projector');
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950/80 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Dynamic Antigravity Canvas Background */}
      <AntigravityBackground />

      {/* 1. Pupil Voter Portal View (Default) */}
      {(currentView === 'voter' || !activeAdminSchool) && (
        <VoterPortal
          initialSchool={activeAdminSchool}
          onOpenSchoolLogin={() => {
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
          }}
          onOpenSchoolRegister={() => {
            setAuthModalMode('register');
            setIsAuthModalOpen(true);
          }}
        />
      )}

      {/* 2. School Admin Dashboard View */}
      {currentView === 'admin' && activeAdminSchool && (
        <AdminDashboard
          school={activeAdminSchool}
          onLogout={handleAdminLogout}
          onOpenProjector={handleOpenProjector}
          onOpenPrintCards={handleOpenPrintCards}
        />
      )}

      {/* 3. Auditorium Projector Display View */}
      {currentView === 'projector' && activeAdminSchool && (
        <ProjectorDisplay
          school={activeAdminSchool}
          onExit={() => setCurrentView('admin')}
        />
      )}

      {/* 4. Printable Student Voter Slips View */}
      {currentView === 'print-cards' && activeAdminSchool && (
        <PrintableVoterCards
          school={activeAdminSchool}
          voters={votersForPrint}
          onBack={() => setCurrentView('admin')}
        />
      )}

      {/* School Sign-in / Registration Modal */}
      <SchoolAuthModal
        mode={authModalMode}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleSchoolAuthSuccess}
        onSwitchMode={(m) => setAuthModalMode(m)}
      />
    </div>
  );
}
