import React, { useState } from 'react';
import { School } from '../types';
import {
  registerSchoolAsync,
  authenticateSchoolAsync,
  OFFICIAL_PAYPAL_URL,
  OFFICIAL_PAYMENT_GATEWAY,
  OFFICIAL_PAYMENT_RECIPIENT,
  OFFICIAL_LICENSE_FEE,
  OFFICIAL_LICENSE_DURATION_DAYS,
  isSchoolLicenseActive,
} from '../services/storage';
import {
  School as SchoolIcon,
  Lock,
  Mail,
  FileText,
  Users,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Smartphone,
} from 'lucide-react';
import { MemonLogo } from './MemonLogo';
import { SecurePaymentModal } from './SecurePaymentModal';

interface SchoolAuthModalProps {
  mode: 'login' | 'register';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (school: School) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export const SchoolAuthModal: React.FC<SchoolAuthModalProps> = ({
  mode,
  isOpen,
  onClose,
  onSuccess,
  onSwitchMode,
}) => {
  // Register Form Fields
  const [name, setName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentCount, setStudentCount] = useState<number>(50);
  const [motto, setMotto] = useState('');

  // Login Form Fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Gated Payment Modal for school activation
  const [paymentPendingSchool, setPaymentPendingSchool] = useState<School | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(OFFICIAL_PAYPAL_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !regNumber.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required registration fields.');
      return;
    }

    if (studentCount <= 0) {
      setError('Number of pupils must be at least 1.');
      return;
    }

    setLoading(true);
    try {
      // Create school with pending_payment status until payment via PayPal is verified
      const res = await registerSchoolAsync({
        name,
        regNumber,
        email,
        password,
        studentCount: Number(studentCount),
        motto,
        isPaid: false, // Will be activated through payment confirmation
      });
      setLoading(false);

      if (!res.success || !res.school) {
        setError(res.error || 'Failed to register school.');
        return;
      }

      // Prompt payment to unlock election setup
      setPaymentPendingSchool(res.school);
      setIsPaymentModalOpen(true);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setError('Please enter your School Email / Registration Number and Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await authenticateSchoolAsync(loginIdentifier, loginPassword);
      setLoading(false);

      if (!res.success || !res.school) {
        setError(res.error || 'Invalid credentials. Please verify your email and password.');
        return;
      }

      // Check if license is active
      const licenseCheck = isSchoolLicenseActive(res.school);
      if (!licenseCheck.active || res.school.licenseStatus === 'pending_payment') {
        // Prompt for payment to unlock license
        setPaymentPendingSchool(res.school);
        setIsPaymentModalOpen(true);
        return;
      }

      onSuccess(res.school);
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Login failed. Please check your network and credentials.');
    }
  };

  const handlePaymentConfirmed = (activatedSchool: School) => {
    setIsPaymentModalOpen(false);
    setPaymentPendingSchool(null);
    onSuccess(activatedSchool);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-[#121214] border border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl shadow-black/80 relative my-8 animate-scale-in text-slate-100">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-6">
            <MemonLogo size="sm" centered={true} />
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-white mt-3 font-brand">
              {mode === 'login' ? 'School Administrator Login' : 'Register New School Database'}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {mode === 'login'
                ? 'Access candidate management, print voter ID cards, and launch projector display'
                : 'Sign up your school & activate your 1-month election license with instant pupil IDs'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* ================= LOGIN FORM ================= */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-white/40 font-semibold mb-1.5 uppercase tracking-wider">
                  School Email, Registration # or Code
                </label>
                <div className="relative">
                  <input
                    id="school-login-ident-input"
                    type="text"
                    placeholder="Enter School Email or Registration Number"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                  <SchoolIcon className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/40 font-semibold mb-1.5 uppercase tracking-wider">
                  School Admin Password
                </label>
                <div className="relative">
                  <input
                    id="school-login-password-input"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                  <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-200/90 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Universal Device Access:</strong> Sign in from any computer, phone, or tablet using the same email and password.
                </span>
              </div>

              <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl text-[11px] text-white/60 flex items-center justify-between">
                <span>Official Payment Gateway: <strong className="text-blue-300 font-mono">PayPal / Cards</strong></span>
                <span className="text-[10px] text-amber-300 font-mono">50k UGX / 1 Month</span>
              </div>

              <button
                id="submit-school-login-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter School Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-3 border-t border-white/5">
                <span className="text-white/40">New school? </span>
                <button
                  type="button"
                  onClick={() => onSwitchMode('register')}
                  className="text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  Register Your School & Activate Election
                </button>
              </div>
            </form>
          ) : (
            /* ================= REGISTER FORM ================= */
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-white/40 font-semibold mb-1 uppercase tracking-wider">
                  1. School Full Name *
                </label>
                <div className="relative">
                  <input
                    id="reg-school-name-input"
                    type="text"
                    placeholder="e.g. St. Augustine Academy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                  <SchoolIcon className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 font-semibold mb-1 uppercase tracking-wider">
                    2. School Registration # *
                  </label>
                  <div className="relative">
                    <input
                      id="reg-school-number-input"
                      type="text"
                      placeholder="e.g. SA-9921-XULE"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
                      required
                    />
                    <FileText className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-white/40 font-semibold mb-1 uppercase tracking-wider">
                    3. Number of Pupils (Voters) *
                  </label>
                  <div className="relative">
                    <input
                      id="reg-school-students-input"
                      type="number"
                      min="1"
                      max="3000"
                      placeholder="e.g. 100"
                      value={studentCount}
                      onChange={(e) => setStudentCount(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
                      required
                    />
                    <Users className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 font-semibold mb-1 uppercase tracking-wider">
                    4. School Email *
                  </label>
                  <div className="relative">
                    <input
                      id="reg-school-email-input"
                      type="email"
                      placeholder="admin@yourschool.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      required
                    />
                    <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-white/40 font-semibold mb-1 uppercase tracking-wider">
                    5. Admin Password *
                  </label>
                  <div className="relative">
                    <input
                      id="reg-school-password-input"
                      type="password"
                      placeholder="Secret Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      required
                    />
                    <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/40 font-semibold mb-1 uppercase tracking-wider">
                  6. School Motto / Vision (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Striving for Excellence & Virtue"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              {/* 50,000 UGX Vote Setup Fee via PayPal for 1-Month Duration */}
              <div className="p-4 bg-gradient-to-br from-blue-950/40 via-slate-900 to-indigo-950/40 border-2 border-blue-500/40 rounded-2xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold block">
                      1-Month Voting License Activation
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-mono font-bold uppercase">
                      50,000 UGX
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-black/60 rounded-xl border border-white/10 flex items-center justify-between gap-3">
                  <div className="truncate">
                    <span className="text-[10px] text-white/40 font-mono block">OFFICIAL PAYMENT GATEWAY:</span>
                    <span className="text-xs font-mono font-bold text-blue-400 truncate block">PayPal Secure Checkout</span>
                    <span className="text-[10px] text-white/50 block font-mono">({OFFICIAL_PAYPAL_URL})</span>
                  </div>
                  <a
                    href={OFFICIAL_PAYPAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition"
                  >
                    <span>Open Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-white/60 leading-relaxed">
                  Schools pay a license fee of <strong className="text-white">50,000 UGX</strong> via <strong className="text-blue-300">PayPal / Debit Card</strong> to activate student voting for <strong className="text-amber-400">1 Month (30 Days)</strong>. Next, you will confirm payment with your transaction reference.
                </p>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white/70 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Instantly prepares <strong className="text-white">{studentCount || 0} unique Student Voter IDs</strong> upon payment confirmation.
                </span>
              </div>

              <button
                id="submit-school-register-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-blue-950/60 transition flex items-center justify-center gap-2 cursor-pointer transform active:scale-95"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Proceed to 50,000 UGX Payment & Activate</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-white/40">Already registered? </span>
                <button
                  type="button"
                  onClick={() => onSwitchMode('login')}
                  className="text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  Sign In to School Portal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Gated Secure Payment Modal */}
      {paymentPendingSchool && (
        <SecurePaymentModal
          isOpen={isPaymentModalOpen}
          school={paymentPendingSchool}
          onClose={() => setIsPaymentModalOpen(false)}
          onPaymentSuccess={handlePaymentConfirmed}
          title="Activate 1-Month Election License"
          subtitle={`Complete payment of 50,000 UGX via PayPal to unlock election setup for ${paymentPendingSchool.name}.`}
          isInitialSetup={true}
        />
      )}
    </>
  );
};
