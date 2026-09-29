import React, { useState } from 'react';
import { School } from '../types';
import {
  OFFICIAL_PAYPAL_URL,
  OFFICIAL_PAYMENT_GATEWAY,
  OFFICIAL_PAYMENT_RECIPIENT,
  OFFICIAL_LICENSE_FEE,
  OFFICIAL_LICENSE_DURATION_DAYS,
  confirmSchoolPayment,
} from '../services/storage';
import {
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  AlertCircle,
  Clock,
  Printer,
  CheckCircle2,
  X,
  FileCheck2,
  CreditCard,
  Building,
  Info,
  QrCode,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SecurePaymentModalProps {
  isOpen: boolean;
  school: School;
  onClose: () => void;
  onPaymentSuccess: (updatedSchool: School) => void;
  title?: string;
  subtitle?: string;
  isInitialSetup?: boolean;
}

export const SecurePaymentModal: React.FC<SecurePaymentModalProps> = ({
  isOpen,
  school,
  onClose,
  onPaymentSuccess,
  title = 'PayPal Payment Verification',
  subtitle = 'Complete payment of 50,000 UGX via PayPal and enter your transaction reference.',
  isInitialSetup = false,
}) => {
  const [payerEmail, setPayerEmail] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmed Receipt State
  const [confirmedSchool, setConfirmedSchool] = useState<School | null>(null);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(OFFICIAL_PAYPAL_URL);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const ref = transactionRef.trim();
    if (!ref) {
      setError('Please enter your PayPal Transaction ID, Invoice ID, or Order Reference.');
      return;
    }

    if (ref.length < 4) {
      setError('Please enter a valid Transaction ID / Reference (at least 4 characters).');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const result = confirmSchoolPayment(school.id, {
        paymentMethod: 'PayPal / Debit & Credit Card',
        paymentReference: ref,
        payerEmailOrPhone: payerEmail.trim() || school.email || 'PayPal Payer',
        gatewayUrl: OFFICIAL_PAYPAL_URL,
      });

      if (result.success && result.school) {
        setConfirmedSchool(result.school);
        confetti({
          particleCount: 110,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#0070ba', '#003087', '#10b981', '#38bdf8', '#f59e0b'],
        });
      } else {
        setError(result.error || 'Payment verification failed. Please check your transaction details.');
      }
    }, 600);
  };

  const handleCompleteAndProceed = () => {
    if (confirmedSchool) {
      onPaymentSuccess(confirmedSchool);
      onClose();
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    OFFICIAL_PAYPAL_URL
  )}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121214] border border-blue-500/40 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl shadow-black/90 relative my-8 animate-scale-in text-slate-100">
        {/* Close button */}
        {!isInitialSetup && !confirmedSchool && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              PayPal Secure Gateway
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-white font-brand">
            {confirmedSchool ? 'Payment Confirmed & Verified!' : title}
          </h2>
          <p className="text-xs text-white/60 mt-1 max-w-md mx-auto">
            {confirmedSchool
              ? 'Your 1-month election license is now active. You can proceed with candidate registration and voting setup.'
              : subtitle}
          </p>
        </div>

        {/* ================= STATE 1: PAYMENT CONFIRMED / OFFICIAL RECEIPT ================= */}
        {confirmedSchool ? (
          <div className="space-y-5 animate-fade-in text-xs">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-slate-900 to-emerald-950/30 border border-emerald-500/40 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider block">
                      Status: Active & Verified
                    </span>
                    <h3 className="text-sm font-bold text-white">Official Electronic License Receipt</h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black font-mono text-emerald-400">
                    50,000 UGX
                  </span>
                  <span className="block text-[10px] text-white/40 font-mono">PAID IN FULL</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[10px]">RECEIPT #</span>
                  <span className="text-white font-bold">{confirmedSchool.receiptNumber || 'REC-MX-98211'}</span>
                </div>

                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[10px]">PAYPAL TRANSACTION ID</span>
                  <span className="text-blue-300 font-bold truncate block">{confirmedSchool.paymentReference}</span>
                </div>

                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[10px]">PAYMENT GATEWAY</span>
                  <span className="text-emerald-400 font-bold">PayPal / Cards</span>
                  <span className="text-[9px] text-white/40 block truncate">{OFFICIAL_PAYPAL_URL}</span>
                </div>

                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[10px]">LICENSE DURATION</span>
                  <span className="text-amber-300 font-bold">1 Full Month (30 Days)</span>
                  <span className="text-[9px] text-white/50 block">
                    Expires: {new Date(confirmedSchool.licenseExpiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-black/50 rounded-xl border border-white/5 text-[11px] text-white/70 space-y-1">
                <div className="flex justify-between">
                  <span className="text-white/40">Licensed School:</span>
                  <span className="text-white font-semibold">{confirmedSchool.name} ({confirmedSchool.schoolCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Voter Capacity:</span>
                  <span className="text-white font-semibold">{confirmedSchool.studentCount} Student Voter IDs generated</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Verified Date:</span>
                  <span className="text-white font-mono">{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button
              id="proceed-to-election-setup-btn"
              onClick={handleCompleteAndProceed}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950/80 transition flex items-center justify-center gap-2.5 cursor-pointer transform active:scale-95"
            >
              <span>Proceed to Election Setup & Candidate Registration</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ================= STATE 2: PAYPAL PAYMENT INSTRUCTIONS & VERIFICATION ================= */
          <div className="space-y-5 text-xs">
            {/* Top PayPal Gateway Banner */}
            <div className="p-4 bg-gradient-to-br from-blue-950/60 via-[#0a192f] to-indigo-950/50 border-2 border-blue-500/40 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider">
                      Official PayPal Payment Gateway
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-2xl sm:text-3xl font-mono font-black text-amber-400">
                      50,000 UGX
                    </span>
                    <span className="text-xs text-white/50 font-mono font-normal">/ 1 Month Access</span>
                  </div>
                  <p className="text-[11px] text-white/60">
                    Supports PayPal Balance, Visa, MasterCard, and International Debit/Credit Cards.
                  </p>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <a
                    id="open-paypal-checkout-link"
                    href={OFFICIAL_PAYPAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#0070ba] to-[#003087] hover:from-[#005ea6] hover:to-[#00256c] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-950/80 transition cursor-pointer transform active:scale-95"
                  >
                    <span>Pay with PayPal</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-[11px] font-mono flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Payment Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{error}</div>
              </div>
            )}

            {/* QR CODE & STEP BY STEP SECTION */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* QR Code */}
                <div className="p-2.5 bg-white rounded-2xl shrink-0 shadow-lg border border-white/20 text-center">
                  <img
                    src={qrCodeUrl}
                    alt="PayPal Payment QR Code"
                    className="w-28 h-28 object-contain rounded-lg"
                  />
                  <span className="text-[9px] font-bold text-slate-900 font-mono block mt-1">
                    Scan to Pay with PayPal
                  </span>
                </div>

                {/* Steps */}
                <div className="flex-1 space-y-2.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-white/90 font-bold text-xs uppercase font-sans border-b border-white/10 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-blue-400" />
                      <span>Payment Steps:</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-white/80">
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5 border border-blue-500/30">
                      1
                    </span>
                    <span>
                      Click <strong className="text-blue-400">"Pay with PayPal"</strong> or scan the QR code to open the PayPal checkout page.
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-white/80">
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5 border border-blue-500/30">
                      2
                    </span>
                    <span>
                      Complete the 50,000 UGX fee using your PayPal balance, debit card, or credit card.
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-white/80">
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5 border border-blue-500/30">
                      3
                    </span>
                    <span>
                      Copy the <strong className="text-amber-300">Transaction ID</strong> from your PayPal confirmation email or screen and paste it below.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* VERIFICATION FORM */}
            <form onSubmit={handleManualVerify} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/60 font-semibold mb-1 uppercase tracking-wider">
                    PayPal Transaction ID / Invoice # *
                  </label>
                  <input
                    id="paypal-trans-ref-input"
                    type="text"
                    placeholder="e.g. 5XY892109K482910"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                  <p className="text-[10px] text-white/40 mt-1">From PayPal payment confirmation</p>
                </div>

                <div>
                  <label className="block text-[10px] text-white/60 font-semibold mb-1 uppercase tracking-wider">
                    PayPal Payer Email (Optional)
                  </label>
                  <input
                    id="paypal-payer-email-input"
                    type="email"
                    placeholder="e.g. bursar@yourschool.edu"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-[10px] text-white/40 mt-1">Email associated with PayPal payment</p>
                </div>
              </div>

              <button
                id="verify-paypal-payment-btn"
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-emerald-950/80 transition flex items-center justify-center gap-2 cursor-pointer transform active:scale-95"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm PayPal Payment & Activate 1-Month Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] text-white/50 flex flex-col sm:flex-row items-center justify-between gap-1">
              <span>Secure PayPal payment gateway for Memon Xule.</span>
              <a
                href={OFFICIAL_PAYPAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Direct Link: paypal.com/ncp/payment/MQS9SB3PQDQUY</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
