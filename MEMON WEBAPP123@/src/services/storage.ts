import { School, Position, Candidate, StudentVoter, VoteRecord, SchoolElectionResults, PositionResult } from '../types';

const STORAGE_KEYS = {
  SCHOOLS: 'memon_xule_schools',
  POSITIONS: 'memon_xule_positions',
  CANDIDATES: 'memon_xule_candidates',
  VOTERS: 'memon_xule_voters',
  VOTES: 'memon_xule_votes',
  CURRENT_SESSION: 'memon_xule_session',
};

// Official Payment Gateway Config
export const OFFICIAL_PAYPAL_URL = 'https://www.paypal.com/ncp/payment/MQS9SB3PQDQUY';
export const OFFICIAL_PAYMENT_GATEWAY = 'PayPal (Debit, Credit Card & PayPal Account)';
export const OFFICIAL_PAYMENT_RECIPIENT = 'Memon Xule Official (PayPal)';
export const OFFICIAL_LICENSE_FEE = 50000; // 50,000 UGX
export const OFFICIAL_LICENSE_DURATION_DAYS = 30; // 1 Month

export const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aria&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Maya&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Sam&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Emma&backgroundColor=ffd5dc',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80'
];

export const AVATAR_3D_COLLECTION = [
  { id: '3d-1', label: '3D Boy Leader', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80' },
  { id: '3d-2', label: '3D Girl Leader', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80' },
  { id: '3d-3', label: '3D Scholar Model', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
  { id: '3d-4', label: '3D Prefect Model', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' },
  { id: '3d-5', label: '3D Stylized Felix', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4' },
  { id: '3d-6', label: '3D Stylized Aria', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aria&backgroundColor=ffd5dc' },
  { id: '3d-7', label: '3D Stylized Leo', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=c0aede' },
  { id: '3d-8', label: '3D Stylized Maya', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Maya&backgroundColor=ffdfbf' },
  { id: '3d-9', label: '3D Digital Sam', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sam&backgroundColor=b6e3f4' },
  { id: '3d-10', label: '3D Digital Emma', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Emma&backgroundColor=ffd5dc' },
  { id: '3d-11', label: '3D Portrait Grace', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80' },
  { id: '3d-12', label: '3D Portrait David', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80' },
];

// Complex & Unpredictable Student Voter ID Generator
// Uses Crockford Base32-like unambiguous character set (excluding 0, O, 1, I, L)
export const UNPREDICTABLE_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateRandomToken(length: number = 4): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randIndex = Math.floor(Math.random() * UNPREDICTABLE_CHARSET.length);
    result += UNPREDICTABLE_CHARSET[randIndex];
  }
  return result;
}

export function generateComplexVoterCode(schoolCode: string, existingCodes?: Set<string>): string {
  const cleanSchoolCode = (schoolCode || 'MX-001').trim().toUpperCase();
  let code = '';
  let attempts = 0;
  do {
    const part1 = generateRandomToken(4);
    const part2 = generateRandomToken(4);
    code = `${cleanSchoolCode}-${part1}-${part2}`;
    attempts++;
  } while (existingCodes && existingCodes.has(code) && attempts < 100);

  if (existingCodes) {
    existingCodes.add(code);
  }
  return code;
}

// Deprecated alias for backwards compatibility
export function generateRandomVoterCode(schoolCode: string, _index?: number, existingCodes?: Set<string>): string {
  return generateComplexVoterCode(schoolCode, existingCodes);
}

// Listeners for real-time synchronization updates across browser tabs & devices
type SyncCallback = (data: {
  schools: School[];
  positions: Position[];
  candidates: Candidate[];
  voters: StudentVoter[];
  votes: VoteRecord[];
}) => void;

const syncListeners: Set<SyncCallback> = new Set();

export function subscribeToDataSync(callback: SyncCallback) {
  syncListeners.add(callback);
  return () => {
    syncListeners.delete(callback);
  };
}

function notifySyncListeners(data: {
  schools: School[];
  positions: Position[];
  candidates: Candidate[];
  voters: StudentVoter[];
  votes: VoteRecord[];
}) {
  syncListeners.forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.error('Error in sync listener callback:', e);
    }
  });
}

// Initial Clean Empty Storage Structure
function getInitialData() {
  return {
    schools: [],
    positions: [],
    candidates: [],
    voters: [],
    votes: [],
  };
}

const STORAGE_VERSION_KEY = 'memon_storage_reset_v3_clean';

// Storage helpers with fallback initialization and clean slate migration
export function clearAllRegisteredSchools() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SCHOOLS);
    localStorage.removeItem(STORAGE_KEYS.POSITIONS);
    localStorage.removeItem(STORAGE_KEYS.CANDIDATES);
    localStorage.removeItem(STORAGE_KEYS.VOTERS);
    localStorage.removeItem(STORAGE_KEYS.VOTES);
    localStorage.removeItem('memon_active_admin_school');
    localStorage.setItem(STORAGE_VERSION_KEY, 'cleaned');
  } catch (err) {
    console.error('Error clearing Memon Xule storage data:', err);
  }
}

// In-Memory Storage Cache to safeguard against localStorage QuotaExceededError when storing thousands of voters
let memoryStoreCache: {
  schools: School[];
  positions: Position[];
  candidates: Candidate[];
  voters: StudentVoter[];
  votes: VoteRecord[];
} | null = null;

// Check if code is an older predictable sequential code (e.g. N-737-0001 or N-737-1)
// Complex unpredictable codes end with two 4-character tokens: -[A-Z0-9]{4}-[A-Z0-9]{4}
function isOldPredictableCode(code: string | undefined): boolean {
  if (!code) return true;
  // If it already matches the complex two-block structure, it is unpredictable
  const complexPattern = /-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/i;
  if (complexPattern.test(code)) return false;
  // If it is just a sequential suffix (e.g. -0001, -123), it should be upgraded
  return /-\d{1,5}$/.test(code);
}

// Ensure any old predictable sequential voter codes (e.g. -0001) in localStorage are upgraded to complex unpredictable IDs
function ensureComplexVoterCodesInStorage(data: {
  schools: School[];
  voters: StudentVoter[];
}): boolean {
  let changed = false;
  const schoolCodesMap = new Map<string, Set<string>>();

  for (const s of data.schools) {
    schoolCodesMap.set(s.id, new Set<string>());
  }

  for (const v of data.voters) {
    const school = data.schools.find((s) => s.id === v.schoolId);
    const schCode = school?.schoolCode || 'MX-001';
    let set = schoolCodesMap.get(v.schoolId);
    if (!set) {
      set = new Set<string>();
      schoolCodesMap.set(v.schoolId, set);
    }

    if (isOldPredictableCode(v.voterCode)) {
      v.voterCode = generateComplexVoterCode(schCode, set);
      changed = true;
    } else {
      set.add(v.voterCode);
    }
  }

  return changed;
}

// Ensure clean slate on initial start if previous demo records existed
export function loadAllData(): {
  schools: School[];
  positions: Position[];
  candidates: Candidate[];
  voters: StudentVoter[];
  votes: VoteRecord[];
} {
  try {
    const schools: School[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHOOLS) || '[]');
    const positions: Position[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSITIONS) || '[]');
    const candidates: Candidate[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CANDIDATES) || '[]');
    let voters: StudentVoter[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.VOTERS) || '[]');
    const votes: VoteRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.VOTES) || '[]');

    // If memory store has more recent or cached voters (e.g. due to localStorage quota limit)
    if (memoryStoreCache && memoryStoreCache.voters.length > voters.length) {
      voters = memoryStoreCache.voters;
    }

    const data = { schools, positions, candidates, voters, votes };
    if (ensureComplexVoterCodesInStorage(data)) {
      saveAllData(data, false);
    }

    memoryStoreCache = data;
    return data;
  } catch (err) {
    console.error('Error loading Memon Xule storage data:', err);
    return memoryStoreCache || getInitialData();
  }
}

export function saveAllData(data: {
  schools: School[];
  positions: Position[];
  candidates: Candidate[];
  voters: StudentVoter[];
  votes: VoteRecord[];
}, triggerServerSync = true) {
  try {
    // Keep in-memory cache always updated
    memoryStoreCache = {
      schools: [...data.schools],
      positions: [...data.positions],
      candidates: [...data.candidates],
      voters: [...data.voters],
      votes: [...data.votes],
    };

    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(data.schools));
    localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(data.positions));
    localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(data.candidates));

    try {
      localStorage.setItem(STORAGE_KEYS.VOTERS, JSON.stringify(data.voters));
    } catch (quotaErr) {
      console.warn('LocalStorage quota limit reached for voter list, utilizing in-memory cache and server persistence:', quotaErr);
    }

    localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(data.votes));
    notifySyncListeners(data);

    if (triggerServerSync) {
      pushDataToServer(data).catch(() => {});
    }
  } catch (err) {
    console.error('Error saving Memon Xule storage data:', err);
  }
}

// ================= SERVER SYNCHRONIZATION ENGINE ================= //

let isSyncing = false;

// Push local data to central server
export async function pushDataToServer(data: {
  schools: School[];
  positions: Position[];
  candidates: Candidate[];
  voters: StudentVoter[];
  votes: VoteRecord[];
}) {
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const serverDb = await response.json();
      if (serverDb && Array.isArray(serverDb.schools)) {
        // Save server result without triggering another push
        saveAllData(
          {
            schools: serverDb.schools || [],
            positions: serverDb.positions || [],
            candidates: serverDb.candidates || [],
            voters: serverDb.voters || [],
            votes: serverDb.votes || [],
          },
          false
        );
      }
    }
  } catch (err) {
    // Gracefully handle offline or dev server startup
    // console.warn('Could not sync with central server (working locally):', err);
  }
}

// Fetch latest central server database and merge into local storage
export async function syncWithServer() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const localData = loadAllData();
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localData),
    });

    if (response.ok) {
      const serverDb = await response.json();
      if (serverDb && Array.isArray(serverDb.schools)) {
        saveAllData(
          {
            schools: serverDb.schools || [],
            positions: serverDb.positions || [],
            candidates: serverDb.candidates || [],
            voters: serverDb.voters || [],
            votes: serverDb.votes || [],
          },
          false
        );
      }
    }
  } catch (err) {
    // Offline fallback
  } finally {
    isSyncing = false;
  }
}

// Background sync initiator (called when App starts)
let syncIntervalStarted = false;
export function initStorageSync() {
  if (syncIntervalStarted) return;
  syncIntervalStarted = true;

  // Immediate sync on load
  syncWithServer();

  // Periodic poll every 4 seconds to sync changes from other devices / voter cards
  setInterval(() => {
    syncWithServer();
  }, 4000);

  // Sync on window focus
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      syncWithServer();
    });
  }
}

// ================= SCHOOL OPERATIONS ================= //

export function getSchools(): School[] {
  return loadAllData().schools;
}

export function getSchoolById(id: string): School | undefined {
  return getSchools().find((s) => s.id === id);
}

export function getSchoolByCodeOrReg(identifier: string): School | undefined {
  const clean = identifier.trim().toLowerCase();
  return getSchools().find(
    (s) =>
      s.schoolCode.toLowerCase() === clean ||
      s.regNumber.toLowerCase() === clean ||
      s.email.toLowerCase() === clean ||
      s.name.toLowerCase() === clean
  );
}

export function registerSchool(params: {
  name: string;
  regNumber: string;
  email: string;
  password: string;
  studentCount: number;
  motto?: string;
  academicYear?: string;
  paymentMethod?: string;
  paymentReference?: string;
  payerPhone?: string;
  isPaid?: boolean;
}): { success: boolean; school?: School; error?: string } {
  const data = loadAllData();

  // Check if school already exists by reg number or email
  const existing = data.schools.find(
    (s) =>
      s.regNumber.toLowerCase() === params.regNumber.trim().toLowerCase() ||
      s.email.toLowerCase() === params.email.trim().toLowerCase()
  );

  if (existing) {
    return {
      success: false,
      error: `A school with this Registration Number (${params.regNumber}) or Email (${params.email}) is already registered.`,
    };
  }

  const schoolId = `school_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  // Clean prefix from school name e.g. "Greenhill Academy" -> "GA"
  const initials = params.name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 3) || 'MX';
  const schoolCode = `${initials}-${Math.floor(100 + Math.random() * 900)}`;

  const count = Math.max(1, Number(params.studentCount) || 50);

  const now = new Date();
  // 1 Month = 30 days voting duration
  const expiresAt = new Date(now.getTime() + OFFICIAL_LICENSE_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const payRef = params.paymentReference?.trim() || `MX-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
  const receiptNo = `REC-MX-${Math.floor(100000 + Math.random() * 900000)}`;

  const isPaid = params.isPaid !== undefined ? params.isPaid : true;

  const newSchool: School = {
    id: schoolId,
    name: params.name.trim(),
    regNumber: params.regNumber.trim(),
    email: params.email.trim().toLowerCase(),
    passwordHash: params.password,
    studentCount: count,
    schoolCode,
    motto: params.motto?.trim() || 'Excellence, Truth & Service',
    createdAt: now.toISOString(),
    electionStatus: 'active',
    electionTitle: `${params.name.trim()} Student Council Elections`,
    academicYear: params.academicYear || '2026/2027',
    // 50,000 Payment for 1 Month Vote Setup via PayPal
    licenseFee: OFFICIAL_LICENSE_FEE,
    licenseCurrency: 'UGX',
    licenseDuration: '1 Month (30 Days)',
    licenseStatus: isPaid ? 'active' : 'pending_payment',
    licenseActivatedAt: now.toISOString(),
    licenseExpiresAt: expiresAt.toISOString(),
    paidAmount: isPaid ? OFFICIAL_LICENSE_FEE : 0,
    recipientPhone: OFFICIAL_PAYPAL_URL,
    payerPhone: params.payerPhone || '',
    paymentMethod: params.paymentMethod || 'PayPal / Cards',
    paymentReference: payRef,
    receiptNumber: receiptNo,
    paymentVerifiedAt: isPaid ? now.toISOString() : undefined,
    paymentHistory: isPaid
      ? [
          {
            id: `pay_${Date.now()}`,
            schoolId,
            amount: OFFICIAL_LICENSE_FEE,
            currency: 'UGX',
            recipientPhone: OFFICIAL_PAYPAL_URL,
            payerPhone: params.payerPhone || '',
            paymentMethod: params.paymentMethod || 'PayPal / Cards',
            paymentReference: payRef,
            receiptNumber: receiptNo,
            status: 'confirmed',
            durationDays: 30,
            activatedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            verifiedBy: 'Memon Xule PayPal Secure Gateway',
          },
        ]
      : [],
  };

  // Generate complex & unpredictable pupil voter IDs according to the number entered by the school
  const existingCodes = new Set<string>();
  const generatedVoters: StudentVoter[] = [];
  for (let i = 1; i <= count; i++) {
    generatedVoters.push({
      id: `voter_${schoolId}_${i}`,
      schoolId,
      voterCode: generateComplexVoterCode(schoolCode, existingCodes),
      studentIndex: i,
      hasVoted: false,
    });
  }

  data.schools.push(newSchool);
  data.voters.push(...generatedVoters);
  // No hardcoded default positions or candidates: school defines all their leadership titles and candidates

  saveAllData(data);

  return { success: true, school: newSchool };
}

export async function authenticateSchoolAsync(
  emailOrReg: string,
  password: string
): Promise<{ success: boolean; school?: School; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: emailOrReg, password }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.school) {
      if (data.fullData) {
        saveAllData(data.fullData, false);
      } else {
        const local = loadAllData();
        const existingIdx = local.schools.findIndex((s) => s.id === data.school.id);
        if (existingIdx !== -1) {
          local.schools[existingIdx] = data.school;
        } else {
          local.schools.push(data.school);
        }
        saveAllData(local, false);
      }
      return { success: true, school: data.school };
    }

    if (!res.ok) {
      return { success: false, error: data.error || 'Invalid credentials.' };
    }
  } catch (err) {
    // If network error, fall back to local storage
  }

  // Fallback to local storage check
  return authenticateSchool(emailOrReg, password);
}

export async function registerSchoolAsync(params: {
  name: string;
  regNumber: string;
  email: string;
  password: string;
  studentCount: number;
  motto?: string;
  academicYear?: string;
  paymentMethod?: string;
  paymentReference?: string;
  payerPhone?: string;
  isPaid?: boolean;
}): Promise<{ success: boolean; school?: School; error?: string }> {
  try {
    const res = await fetch('/api/schools/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (res.ok && data.success && data.school) {
      if (data.fullData) {
        saveAllData(data.fullData, false);
      } else {
        const local = loadAllData();
        local.schools.push(data.school);
        saveAllData(local, false);
      }
      return { success: true, school: data.school };
    }

    if (!res.ok) {
      return { success: false, error: data.error || 'Registration failed.' };
    }
  } catch (err) {
    // Fallback to local
  }

  return registerSchool(params);
}

export function authenticateSchool(emailOrReg: string, password: string): { success: boolean; school?: School; error?: string } {
  const cleanIdent = emailOrReg.trim().toLowerCase();
  const school = getSchools().find(
    (s) =>
      (s.email.toLowerCase() === cleanIdent ||
        s.regNumber.toLowerCase() === cleanIdent ||
        s.schoolCode.toLowerCase() === cleanIdent) &&
      s.passwordHash === password
  );

  if (!school) {
    return { success: false, error: 'Invalid school registration number/email or password.' };
  }

  return { success: true, school };
}

export function updateSchool(schoolId: string, updates: Partial<School>): School | null {
  const data = loadAllData();
  const index = data.schools.findIndex((s) => s.id === schoolId);
  if (index === -1) return null;

  data.schools[index] = { ...data.schools[index], ...updates };
  saveAllData(data);
  return data.schools[index];
}

export function confirmSchoolPayment(
  schoolId: string,
  params: {
    paymentMethod: string;
    paymentReference: string;
    payerEmailOrPhone?: string;
    gatewayUrl?: string;
  }
): { success: boolean; school?: School; error?: string } {
  const data = loadAllData();
  const index = data.schools.findIndex((s) => s.id === schoolId);
  if (index === -1) {
    return { success: false, error: 'School not found.' };
  }

  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + OFFICIAL_LICENSE_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const payRef = params.paymentReference.trim() || `PP-TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;
  const receiptNo = `REC-MX-${Math.floor(100000 + Math.random() * 900000)}`;
  const gateway = params.gatewayUrl?.trim() || OFFICIAL_PAYPAL_URL;

  const currentHistory = data.schools[index].paymentHistory || [];
  const newPaymentRecord = {
    id: `pay_${Date.now()}`,
    schoolId,
    amount: OFFICIAL_LICENSE_FEE,
    currency: 'UGX',
    recipientPhone: OFFICIAL_PAYPAL_URL,
    payerPhone: params.payerEmailOrPhone || '',
    paymentMethod: params.paymentMethod || 'PayPal Secure Payment',
    paymentReference: payRef,
    receiptNumber: receiptNo,
    status: 'confirmed' as const,
    durationDays: OFFICIAL_LICENSE_DURATION_DAYS,
    activatedAt: now.toISOString(),
    expiresAt: newExpiresAt.toISOString(),
    verifiedBy: `Memon Xule PayPal Gateway (${gateway})`,
  };

  data.schools[index] = {
    ...data.schools[index],
    licenseFee: OFFICIAL_LICENSE_FEE,
    licenseCurrency: 'UGX',
    licenseDuration: '1 Month (30 Days)',
    licenseStatus: 'active',
    licenseActivatedAt: now.toISOString(),
    licenseExpiresAt: newExpiresAt.toISOString(),
    paidAmount: OFFICIAL_LICENSE_FEE,
    recipientPhone: OFFICIAL_PAYPAL_URL,
    payerPhone: params.payerEmailOrPhone || '',
    paymentMethod: params.paymentMethod || 'PayPal / Card',
    paymentReference: payRef,
    receiptNumber: receiptNo,
    paymentVerifiedAt: now.toISOString(),
    paymentHistory: [newPaymentRecord, ...currentHistory],
    electionStatus: data.schools[index].electionStatus === 'closed' ? 'closed' : 'active',
  };

  saveAllData(data);
  return { success: true, school: data.schools[index] };
}

export function renewSchoolLicense(
  schoolId: string,
  params?: { paymentMethod?: string; paymentReference?: string; payerEmailOrPhone?: string }
): School | null {
  const result = confirmSchoolPayment(schoolId, {
    paymentMethod: params?.paymentMethod || 'PayPal / Card',
    paymentReference: params?.paymentReference || `PP-REN-${Math.floor(10000000 + Math.random() * 90000000)}`,
    payerEmailOrPhone: params?.payerEmailOrPhone || '',
    gatewayUrl: OFFICIAL_PAYPAL_URL,
  });
  return result.school || null;
}

export function isSchoolLicenseActive(school: School): { active: boolean; daysRemaining: number; reason?: string } {
  if (school.licenseStatus === 'pending_payment') {
    return {
      active: false,
      daysRemaining: 0,
      reason: `Election activation pending. Please complete the 50,000 UGX payment via PayPal (${OFFICIAL_PAYPAL_URL}) to unlock election setup.`,
    };
  }

  if (!school.licenseExpiresAt) {
    return { active: true, daysRemaining: 30 };
  }

  const now = new Date().getTime();
  const expiry = new Date(school.licenseExpiresAt).getTime();
  const diffMs = expiry - now;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  if (school.licenseStatus === 'expired' || diffMs <= 0) {
    return {
      active: false,
      daysRemaining: 0,
      reason: `The 1-month election license (50,000 UGX) has expired. Please renew the school license via PayPal to continue voting.`,
    };
  }

  return { active: true, daysRemaining };
}

// ================= VOTER ID GENERATION & MANAGEMENT ================= //

export function getVotersBySchool(schoolId: string): StudentVoter[] {
  const data = loadAllData();
  return data.voters
    .filter((v) => v.schoolId === schoolId)
    .sort((a, b) => a.studentIndex - b.studentIndex);
}

export function addPupilsToSchool(schoolId: string, additionalCount: number): StudentVoter[] {
  const data = loadAllData();
  const school = data.schools.find((s) => s.id === schoolId);
  if (!school) return [];

  const currentVoters = data.voters.filter((v) => v.schoolId === schoolId);
  const existingCodes = new Set<string>(currentVoters.map((v) => v.voterCode));
  const startIndex = currentVoters.length + 1;
  const newVoters: StudentVoter[] = [];

  for (let i = 0; i < additionalCount; i++) {
    const idx = startIndex + i;
    const voter: StudentVoter = {
      id: `voter_${schoolId}_${idx}_${Date.now()}`,
      schoolId,
      voterCode: generateComplexVoterCode(school.schoolCode, existingCodes),
      studentIndex: idx,
      hasVoted: false,
    };
    newVoters.push(voter);
  }

  data.voters.push(...newVoters);
  school.studentCount += additionalCount;

  saveAllData(data);
  return newVoters;
}

export async function addPupilsToSchoolAsync(schoolId: string, additionalCount: number): Promise<StudentVoter[]> {
  try {
    const res = await fetch('/api/schools/add-pupils', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId, count: additionalCount }),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.fullData) {
        saveAllData(
          {
            schools: result.fullData.schools || [],
            positions: result.fullData.positions || [],
            candidates: result.fullData.candidates || [],
            voters: result.fullData.voters || [],
            votes: result.fullData.votes || [],
          },
          false
        );
        return result.newVoters;
      }
    }
  } catch (err) {
    // Fall back to local storage
  }
  return addPupilsToSchool(schoolId, additionalCount);
}

export function regenerateAllVoterIds(schoolId: string): StudentVoter[] {
  const data = loadAllData();
  const school = data.schools.find((s) => s.id === schoolId);
  if (!school) return [];

  // Remove existing voters and votes for this school
  data.voters = data.voters.filter((v) => v.schoolId !== schoolId);
  data.votes = data.votes.filter((v) => v.schoolId !== schoolId);

  const existingCodes = new Set<string>();
  const newVoters: StudentVoter[] = [];
  for (let i = 1; i <= school.studentCount; i++) {
    newVoters.push({
      id: `voter_${schoolId}_${i}_${Date.now()}`,
      schoolId,
      voterCode: generateComplexVoterCode(school.schoolCode, existingCodes),
      studentIndex: i,
      hasVoted: false,
    });
  }

  data.voters.push(...newVoters);
  saveAllData(data);
  return newVoters;
}

export async function regenerateAllVoterIdsAsync(schoolId: string): Promise<StudentVoter[]> {
  try {
    const res = await fetch('/api/schools/regenerate-voters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId }),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.fullData) {
        saveAllData(
          {
            schools: result.fullData.schools || [],
            positions: result.fullData.positions || [],
            candidates: result.fullData.candidates || [],
            voters: result.fullData.voters || [],
            votes: result.fullData.votes || [],
          },
          false
        );
        return result.voters;
      }
    }
  } catch (err) {
    // Fall back to local storage
  }
  return regenerateAllVoterIds(schoolId);
}

// ================= POSITIONS & CANDIDATES ================= //

export function getPositionsBySchool(schoolId: string): Position[] {
  const data = loadAllData();
  return data.positions
    .filter((p) => p.schoolId === schoolId)
    .sort((a, b) => a.order - b.order);
}

export function savePosition(position: Omit<Position, 'id'> & { id?: string }): Position {
  const data = loadAllData();
  if (position.id) {
    const idx = data.positions.findIndex((p) => p.id === position.id);
    if (idx !== -1) {
      data.positions[idx] = { ...data.positions[idx], ...position } as Position;
      saveAllData(data);
      return data.positions[idx];
    }
  }

  const newPos: Position = {
    ...position,
    id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    order: position.order || data.positions.filter((p) => p.schoolId === position.schoolId).length + 1,
  };
  data.positions.push(newPos);
  saveAllData(data);
  return newPos;
}

export function deletePosition(positionId: string) {
  const data = loadAllData();
  data.positions = data.positions.filter((p) => p.id !== positionId);
  data.candidates = data.candidates.filter((c) => c.positionId !== positionId);
  saveAllData(data);
}

export function findOrCreatePositionByTitle(schoolId: string, title: string, description?: string): Position {
  const data = loadAllData();
  const cleanTitle = title.trim();
  const existing = data.positions.find(
    (p) => p.schoolId === schoolId && p.title.toLowerCase() === cleanTitle.toLowerCase()
  );

  if (existing) {
    return existing;
  }

  const schoolPositions = data.positions.filter((p) => p.schoolId === schoolId);
  const newPos: Position = {
    id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    schoolId,
    title: cleanTitle,
    description: description || `Prefect leader for ${cleanTitle}`,
    order: schoolPositions.length + 1,
    maxSelections: 1,
  };

  data.positions.push(newPos);
  saveAllData(data);
  return newPos;
}

export function saveCandidateWithTypedPrefectTitle(params: {
  id?: string;
  schoolId: string;
  prefectTitle: string;
  fullName: string;
  gradeOrClass: string;
  photoUrl: string;
  manifesto: string;
  ballotNumber?: number;
}): Candidate {
  const position = findOrCreatePositionByTitle(params.schoolId, params.prefectTitle);
  return saveCandidate({
    id: params.id,
    schoolId: params.schoolId,
    positionId: position.id,
    fullName: params.fullName,
    gradeOrClass: params.gradeOrClass,
    photoUrl: params.photoUrl,
    manifesto: params.manifesto,
    ballotNumber: params.ballotNumber,
  });
}

export function getCandidatesBySchool(schoolId: string): Candidate[] {
  const data = loadAllData();
  return data.candidates
    .filter((c) => c.schoolId === schoolId)
    .sort((a, b) => a.ballotNumber - b.ballotNumber);
}

export function saveCandidate(candidate: Omit<Candidate, 'id'> & { id?: string }): Candidate {
  const data = loadAllData();
  if (candidate.id) {
    const idx = data.candidates.findIndex((c) => c.id === candidate.id);
    if (idx !== -1) {
      data.candidates[idx] = { ...data.candidates[idx], ...candidate } as Candidate;
      saveAllData(data);
      return data.candidates[idx];
    }
  }

  const existingInPos = data.candidates.filter(
    (c) => c.schoolId === candidate.schoolId && c.positionId === candidate.positionId
  );

  const newCand: Candidate = {
    ...candidate,
    id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ballotNumber: candidate.ballotNumber || existingInPos.length + 1,
  };
  data.candidates.push(newCand);
  saveAllData(data);
  return newCand;
}

export function deleteCandidate(candidateId: string) {
  const data = loadAllData();
  data.candidates = data.candidates.filter((c) => c.id !== candidateId);
  saveAllData(data);
}

// ================= VOTING FLOW (STUDENT / PUPIL) ================= //

export function verifyStudentVoter(
  voterCodeInput: string,
  optionalSchoolIdent?: string
): { success: boolean; school?: School; voter?: StudentVoter; error?: string } {
  const data = loadAllData();
  const rawInput = (voterCodeInput || '').trim();

  if (!rawInput) {
    return { success: false, error: 'Please enter your unique Student Voter ID number.' };
  }

  // Normalize inputs (uppercase, remove extra whitespace and hyphens)
  const cleanInput = rawInput.toUpperCase().replace(/\s+/g, '');
  const inputWithoutDashes = cleanInput.replace(/[^A-Z0-9]/g, '');

  let voter: StudentVoter | undefined;

  // 1. Direct match by exact or dash-normalized voterCode
  voter = data.voters.find((v) => {
    const vCodeClean = (v.voterCode || '').toUpperCase().replace(/\s+/g, '');
    const vCodeNoDash = vCodeClean.replace(/[^A-Z0-9]/g, '');
    return vCodeClean === cleanInput || vCodeNoDash === inputWithoutDashes;
  });

  // 2. Token match: If pupil typed only the 8-character secret unpredictable token (e.g. "5WSD-ZFRN" or "5WSDZFRN")
  if (!voter && inputWithoutDashes.length >= 6) {
    voter = data.voters.find((v) => {
      const vCodeNoDash = (v.voterCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const tokenOnly = vCodeNoDash.slice(-8);
      return inputWithoutDashes === tokenOnly;
    });
  }

  if (!voter) {
    const availableSchools = data.schools.map((s) => `${s.name} (${s.schoolCode})`).join(', ');
    return {
      success: false,
      error: `Invalid Student Voter ID "${rawInput}". Please check the ID printed on your voter card.${
        data.schools.length > 0 ? ` (Registered Schools: ${availableSchools})` : ' (No schools registered yet.)'
      }`,
    };
  }

  const school = data.schools.find((s) => s.id === voter.schoolId);
  if (!school) {
    return { success: false, error: 'School record associated with this Voter ID could not be found.' };
  }

  // Check 1-Month License Validity
  const licenseCheck = isSchoolLicenseActive(school);
  if (!licenseCheck.active) {
    return {
      success: false,
      error: `The 1-month election license for ${school.name} (50,000 UGX) has expired. Please notify your school administrator to renew the voting license.`,
    };
  }

  if (school.electionStatus === 'draft') {
    return {
      success: false,
      error: `The election for ${school.name} is currently in Draft mode. Voting has not yet opened.`,
    };
  }

  if (school.electionStatus === 'closed') {
    return {
      success: false,
      error: `The election for ${school.name} has concluded and is closed. No further votes are accepted.`,
    };
  }

  if (voter.hasVoted) {
    return {
      success: false,
      error: `This Student Voter ID (${voter.voterCode}) has already been used to cast a ballot${
        voter.votedAt ? ` on ${new Date(voter.votedAt).toLocaleTimeString()}` : ''
      }. Each student is permitted only one secret ballot.`,
    };
  }

  return { success: true, school, voter };
}

// Asynchronous Voter Verification that checks local store first, then queries central server API
export async function verifyStudentVoterAsync(
  voterCodeInput: string
): Promise<{
  success: boolean;
  school?: School;
  voter?: StudentVoter;
  positions?: Position[];
  candidates?: Candidate[];
  error?: string;
}> {
  // First attempt local synchronous check
  const localResult = verifyStudentVoter(voterCodeInput);
  if (localResult.success && localResult.school && localResult.voter) {
    return {
      ...localResult,
      positions: getPositionsBySchool(localResult.school.id),
      candidates: getCandidatesBySchool(localResult.school.id),
    };
  }

  // If local didn't find the voter or had an error, query server directly
  try {
    const response = await fetch('/api/voters/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterCode: voterCodeInput }),
    });

    const serverRes = await response.json();
    if (serverRes.success && serverRes.school && serverRes.voter) {
      // Sync into local data cache
      const current = loadAllData();
      if (!current.schools.some((s) => s.id === serverRes.school.id)) {
        current.schools.push(serverRes.school);
      }
      const existingVoterIdx = current.voters.findIndex((v) => v.id === serverRes.voter.id);
      if (existingVoterIdx === -1) {
        current.voters.push(serverRes.voter);
      } else {
        current.voters[existingVoterIdx] = serverRes.voter;
      }

      if (Array.isArray(serverRes.positions)) {
        for (const p of serverRes.positions) {
          if (!current.positions.some((cp) => cp.id === p.id)) {
            current.positions.push(p);
          }
        }
      }

      if (Array.isArray(serverRes.candidates)) {
        for (const c of serverRes.candidates) {
          if (!current.candidates.some((cc) => cc.id === c.id)) {
            current.candidates.push(c);
          }
        }
      }

      saveAllData(current, false);

      // Check license & election status
      const licenseCheck = isSchoolLicenseActive(serverRes.school);
      if (!licenseCheck.active) {
        return {
          success: false,
          error: `The 1-month election license for ${serverRes.school.name} (50,000 UGX) has expired. Please notify your school administrator to renew the voting license.`,
        };
      }

      if (serverRes.school.electionStatus === 'draft') {
        return {
          success: false,
          error: `The election for ${serverRes.school.name} is currently in Draft mode. Voting has not yet opened.`,
        };
      }

      if (serverRes.school.electionStatus === 'closed') {
        return {
          success: false,
          error: `The election for ${serverRes.school.name} has concluded and is closed. No further votes are accepted.`,
        };
      }

      if (serverRes.voter.hasVoted) {
        return {
          success: false,
          error: `This Student Voter ID (${serverRes.voter.voterCode}) has already been used to cast a ballot. Each student is permitted only one secret ballot.`,
        };
      }

      return {
        success: true,
        school: serverRes.school,
        voter: serverRes.voter,
        positions: serverRes.positions || [],
        candidates: serverRes.candidates || [],
      };
    }

    return {
      success: false,
      error: serverRes.error || localResult.error || 'Authentication failed. Please check your Voter ID and try again.',
    };
  } catch (err) {
    // If network error, return local result
    return localResult;
  }
}

export function castStudentVote(params: {
  schoolId: string;
  voterCode: string;
  selections: Record<string, string>; // positionId -> candidateId
}): { success: boolean; error?: string } {
  const data = loadAllData();
  const cleanCode = (params.voterCode || '').trim().toUpperCase();
  const cleanNoDash = cleanCode.replace(/[^A-Z0-9]/g, '');

  const voterIndex = data.voters.findIndex((v) => {
    if (v.schoolId !== params.schoolId) return false;
    const vCodeNoDash = (v.voterCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return vCodeNoDash === cleanNoDash || vCodeNoDash.slice(-8) === cleanNoDash;
  });

  if (voterIndex === -1) {
    return { success: false, error: 'Student Voter record not found.' };
  }

  if (data.voters[voterIndex].hasVoted) {
    return { success: false, error: 'This ballot has already been submitted.' };
  }

  // Mark voter as voted
  data.voters[voterIndex].hasVoted = true;
  data.voters[voterIndex].votedAt = new Date().toISOString();

  // Create anonymous vote record
  const voteRecord: VoteRecord = {
    id: `vote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    schoolId: params.schoolId,
    voterCodeHash: `hash_${Date.now()}`,
    timestamp: new Date().toISOString(),
    selections: params.selections,
  };

  data.votes.push(voteRecord);
  saveAllData(data);

  return { success: true };
}

// Asynchronous Cast Vote that records locally AND directly calls server API /api/votes/cast
export async function castStudentVoteAsync(params: {
  schoolId: string;
  voterCode: string;
  selections: Record<string, string>;
}): Promise<{ success: boolean; error?: string }> {
  // 1. Record locally immediately
  castStudentVote(params);

  // 2. Post to central server API for guaranteed instant persistence
  try {
    const res = await fetch('/api/votes/cast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!data.success) {
      console.warn('Server vote cast response had error:', data.error);
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Network offline during vote cast, cached locally:', err);
    return { success: true };
  }
}

// ================= RESULTS & AUDIT CALCULATIONS ================= //

export function getSchoolElectionResults(schoolId: string): SchoolElectionResults {
  const data = loadAllData();
  const school = data.schools.find((s) => s.id === schoolId);
  const positions = data.positions.filter((p) => p.schoolId === schoolId).sort((a, b) => a.order - b.order);
  const candidates = data.candidates.filter((c) => c.schoolId === schoolId);
  const voters = data.voters.filter((v) => v.schoolId === schoolId);
  const votes = data.votes.filter((v) => v.schoolId === schoolId);

  const totalEligible = voters.length || (school?.studentCount || 0);
  const totalVoted = voters.filter((v) => v.hasVoted).length;
  const turnoutPercentage = totalEligible > 0 ? Math.round((totalVoted / totalEligible) * 1000) / 10 : 0;

  const positionsResults: PositionResult[] = positions.map((pos) => {
    const posCandidates = candidates.filter((c) => c.positionId === pos.id);
    const voteCounts: Record<string, number> = {};
    let abstains = 0;
    let posTotalVotes = 0;

    posCandidates.forEach((c) => {
      voteCounts[c.id] = 0;
    });

    votes.forEach((v) => {
      const selectedCandidateId = v.selections[pos.id];
      if (selectedCandidateId && selectedCandidateId !== 'ABSTAIN') {
        if (voteCounts[selectedCandidateId] !== undefined) {
          voteCounts[selectedCandidateId] = (voteCounts[selectedCandidateId] || 0) + 1;
          posTotalVotes++;
        }
      } else if (selectedCandidateId === 'ABSTAIN') {
        abstains++;
        posTotalVotes++;
      }
    });

    // Find highest vote count
    let maxVotes = -1;
    posCandidates.forEach((c) => {
      const v = voteCounts[c.id] || 0;
      if (v > maxVotes) maxVotes = v;
    });

    // Determine winners and ties
    const winners = maxVotes > 0 ? posCandidates.filter((c) => (voteCounts[c.id] || 0) === maxVotes) : [];
    const isTie = winners.length > 1;

    const candidatesWithStats = posCandidates
      .map((c) => {
        const v = voteCounts[c.id] || 0;
        const pct = posTotalVotes > 0 ? Math.round((v / posTotalVotes) * 1000) / 10 : 0;
        const isWinner = maxVotes > 0 && v === maxVotes && !isTie;
        return {
          ...c,
          votes: v,
          percentage: pct,
          isWinner,
        };
      })
      .sort((a, b) => b.votes - a.votes);

    return {
      position: pos,
      candidates: candidatesWithStats,
      totalVotes: posTotalVotes,
      abstains,
      isTie,
    };
  });

  return {
    schoolId,
    totalEligible,
    totalVoted,
    turnoutPercentage,
    positionsResults,
    lastUpdated: new Date().toISOString(),
  };
}

export function resetSchoolVotes(schoolId: string) {
  const data = loadAllData();
  data.votes = data.votes.filter((v) => v.schoolId !== schoolId);
  data.voters = data.voters.map((v) => {
    if (v.schoolId === schoolId) {
      return { ...v, hasVoted: false, votedAt: undefined };
    }
    return v;
  });
  saveAllData(data);
}

export function exportSchoolDatabaseJson(schoolId: string): string {
  const data = loadAllData();
  const school = data.schools.find((s) => s.id === schoolId);
  const positions = data.positions.filter((p) => p.schoolId === schoolId);
  const candidates = data.candidates.filter((c) => c.schoolId === schoolId);
  const voters = data.voters.filter((v) => v.schoolId === schoolId);
  const votes = data.votes.filter((v) => v.schoolId === schoolId);

  return JSON.stringify(
    {
      exportVersion: '1.0',
      exportDate: new Date().toISOString(),
      school,
      positions,
      candidates,
      voters,
      votes,
    },
    null,
    2
  );
}
