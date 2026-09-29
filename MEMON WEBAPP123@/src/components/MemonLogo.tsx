import React from 'react';

interface MemonLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'glass';
  centered?: boolean;
  minimal?: boolean;
}

export const MemonLogo: React.FC<MemonLogoProps> = ({
  size = 'md',
  variant = 'dark',
  centered = true,
  minimal = false,
}) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', title: 'text-base tracking-[0.25em]', subtitle: 'text-[9px]' },
    md: { icon: 'w-10 h-10', title: 'text-xl tracking-[0.3em]', subtitle: 'text-[10px]' },
    lg: { icon: 'w-14 h-14', title: 'text-2xl sm:text-3xl tracking-[0.3em]', subtitle: 'text-xs' },
    xl: { icon: 'w-16 h-16 sm:w-20 sm:h-20', title: 'text-3xl sm:text-4xl tracking-[0.35em]', subtitle: 'text-xs sm:text-sm' },
  };

  const isLight = variant === 'light';

  return (
    <div
      id="memon-xule-brand-logo"
      className={`flex flex-col items-center select-none ${centered ? 'text-center' : 'items-start text-left'}`}
    >
      {!minimal && (
        <div className="relative mb-2.5 flex items-center justify-center">
          {/* Glowing blue aura effect behind emblem */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/30 via-indigo-500/20 to-blue-400/20 rounded-full blur-xl scale-125" />

          {/* Heraldic / School Crest Emblem */}
          <div className={`relative ${sizeMap[size].icon} flex items-center justify-center rounded-xl bg-[#121214] border border-white/10 shadow-xl shadow-blue-950/40 ring-1 ring-blue-500/30 p-2`}>
            <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
              {/* Outer Laurel Leaves */}
              <path
                d="M20,65 C16,45 28,26 40,18 C36,28 35,42 42,54 C35,58 26,62 20,65 Z"
                fill="url(#blueGrad)"
                opacity="0.9"
              />
              <path
                d="M80,65 C84,45 72,26 60,18 C64,28 65,42 58,54 C65,58 74,62 80,65 Z"
                fill="url(#blueGrad)"
                opacity="0.9"
              />
              {/* Center Shield */}
              <path
                d="M50,15 L78,28 C78,60 50,88 50,88 C50,88 22,60 22,28 L50,15 Z"
                fill="#0e1726"
                stroke="#3b82f6"
                strokeWidth="3.5"
              />
              {/* Ballot Box & Checkmark */}
              <rect x="34" y="44" width="32" height="26" rx="4" fill="#080c14" stroke="#60a5fa" strokeWidth="2.5" />
              <path
                d="M40,54 L47,62 L62,40"
                stroke="#93c5fd"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Academic Torch / Star */}
              <polygon
                points="50,22 53,29 60,29 55,34 57,41 50,37 43,41 45,34 40,29 47,29"
                fill="#38bdf8"
              />

              <defs>
                <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#bfdbfe" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      )}

      {/* Brand Title */}
      <div className="flex flex-col items-center">
        <h1
          className={`font-bold font-sans uppercase text-white ${sizeMap[size].title}`}
        >
          MEMON XULE
        </h1>
        <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent mt-1.5 mb-1"></div>
        <span
          className={`uppercase tracking-widest font-semibold ${
            isLight ? 'text-slate-600' : 'text-blue-400'
          } ${sizeMap[size].subtitle}`}
        >
          School E-Voting Portal
        </span>
      </div>
    </div>
  );
};
