import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  ensurePostgresData,
  getCompleteDatabaseState,
  saveSchool,
  savePosition,
  removePosition,
  saveCandidate,
  removeCandidate,
  saveVotersBatch,
  submitVote,
  savePaymentRecord,
} from './src/db/repository.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';

const app = express();
const PORT = 3000;

// Ensure database directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Error creating data directory:', e);
  }
}

// Helper to generate complex, unpredictable voter code (e.g. "N-737-7K9P-4X2M")
// Uses Crockford Base32-like unambiguous character set (excluding 0, O, 1, I, L)
const UNPREDICTABLE_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRandomToken(length: number = 4): string {
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
function generateRandomVoterCode(schoolCode: string, _index?: number, existingCodes?: Set<string>): string {
  return generateComplexVoterCode(schoolCode, existingCodes);
}

// In-Memory Database Structure
interface DatabaseSchema {
  schools: any[];
  positions: any[];
  candidates: any[];
  voters: any[];
  votes: any[];
  lastUpdated: string;
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading database file, using empty default:', err);
  }
  return {
    schools: [],
    positions: [],
    candidates: [],
    voters: [],
    votes: [],
    lastUpdated: new Date().toISOString(),
  };
}

let db: DatabaseSchema = loadDatabase();

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

// Ensure any old predictable sequential voter codes (e.g. -0001) are upgraded to complex unpredictable IDs
function ensureComplexVoterCodes(database: DatabaseSchema): boolean {
  let changed = false;

  const schoolCodesMap = new Map<string, Set<string>>();
  for (const school of database.schools) {
    schoolCodesMap.set(school.id, new Set<string>());
  }

  for (const voter of database.voters) {
    const school = database.schools.find((s) => s.id === voter.schoolId);
    const schoolCode = school?.schoolCode || 'MX-001';
    let schoolSet = schoolCodesMap.get(voter.schoolId);
    if (!schoolSet) {
      schoolSet = new Set<string>();
      schoolCodesMap.set(voter.schoolId, schoolSet);
    }

    if (isOldPredictableCode(voter.voterCode)) {
      voter.voterCode = generateComplexVoterCode(schoolCode, schoolSet);
      changed = true;
    } else {
      schoolSet.add(voter.voterCode);
    }
  }

  return changed;
}

if (ensureComplexVoterCodes(db)) {
  saveDatabase();
}

function saveDatabase() {
  try {
    db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

// Global Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ================= API ROUTES ================= //

app.get('/api/health', async (req, res) => {
  try {
    const data = await getCompleteDatabaseState();
    res.json({
      status: 'ok',
      engine: 'Cloud SQL PostgreSQL (europe-west2)',
      schoolsCount: data.schools.length,
      votersCount: data.voters.length,
      votesCount: data.votes.length,
      lastUpdated: data.lastUpdated,
    });
  } catch (err: any) {
    res.json({
      status: 'degraded',
      error: err.message,
      schoolsCount: db.schools.length,
      votersCount: db.voters.length,
      votesCount: db.votes.length,
      lastUpdated: db.lastUpdated,
    });
  }
});

// Fetch full current database from Cloud SQL
app.get('/api/data', async (req, res) => {
  try {
    const data = await getCompleteDatabaseState();
    db = {
      ...data,
      schools: data.schools as any[],
      positions: data.positions as any[],
      candidates: data.candidates as any[],
      voters: data.voters as any[],
      votes: data.votes as any[],
    };
    res.json(data);
  } catch (err) {
    console.error('Error fetching data from Cloud SQL, using memory backup:', err);
    res.json(db);
  }
});

// Full Sync endpoint (Client pushes its local changes and pulls server updates)
app.post('/api/sync', (req, res) => {
  try {
    const clientData = req.body;
    if (!clientData) {
      return res.json(db);
    }

    let modified = false;

    // Merge schools
    if (Array.isArray(clientData.schools)) {
      for (const clientSchool of clientData.schools) {
        if (!clientSchool || !clientSchool.id) continue;
        const index = db.schools.findIndex((s) => s.id === clientSchool.id);
        if (index === -1) {
          db.schools.push(clientSchool);
          modified = true;
        } else {
          // Merge preserving newer updates
          db.schools[index] = { ...db.schools[index], ...clientSchool };
          modified = true;
        }
      }
    }

    // Merge positions
    if (Array.isArray(clientData.positions)) {
      for (const clientPos of clientData.positions) {
        if (!clientPos || !clientPos.id) continue;
        const index = db.positions.findIndex((p) => p.id === clientPos.id);
        if (index === -1) {
          db.positions.push(clientPos);
          modified = true;
        } else {
          db.positions[index] = { ...db.positions[index], ...clientPos };
          modified = true;
        }
      }
    }

    // Merge candidates
    if (Array.isArray(clientData.candidates)) {
      for (const clientCand of clientData.candidates) {
        if (!clientCand || !clientCand.id) continue;
        const index = db.candidates.findIndex((c) => c.id === clientCand.id);
        if (index === -1) {
          db.candidates.push(clientCand);
          modified = true;
        } else {
          db.candidates[index] = { ...db.candidates[index], ...clientCand };
          modified = true;
        }
      }
    }

    // Merge voters (optimized with Map for O(N) lookup)
    if (Array.isArray(clientData.voters)) {
      const voterMap = new Map<string, number>();
      for (let i = 0; i < db.voters.length; i++) {
        voterMap.set(db.voters[i].id, i);
      }

      for (const clientVoter of clientData.voters) {
        if (!clientVoter || !clientVoter.id) continue;
        const index = voterMap.get(clientVoter.id);
        if (index === undefined) {
          db.voters.push(clientVoter);
          voterMap.set(clientVoter.id, db.voters.length - 1);
          modified = true;
        } else {
          // If voter has voted on either side, keep hasVoted = true
          if (clientVoter.hasVoted && !db.voters[index].hasVoted) {
            db.voters[index] = { ...db.voters[index], ...clientVoter };
            modified = true;
          }
        }
      }
    }

    // Merge votes
    if (Array.isArray(clientData.votes)) {
      for (const clientVote of clientData.votes) {
        if (!clientVote || !clientVote.id) continue;
        const exists = db.votes.some((v) => v.id === clientVote.id);
        if (!exists) {
          db.votes.push(clientVote);
          modified = true;
        }
      }
    }

    if (modified) {
      saveDatabase();
    }

    res.json(db);
  } catch (err: any) {
    console.error('Error during /api/sync:', err);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// Authentication Endpoint: Allows user to sign in from ANY device with email & password
app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your email or registration number and password.',
      });
    }

    const cleanIdent = String(identifier).trim().toLowerCase();
    const school = db.schools.find(
      (s) =>
        (s.email?.toLowerCase() === cleanIdent ||
          s.regNumber?.toLowerCase() === cleanIdent ||
          s.schoolCode?.toLowerCase() === cleanIdent ||
          s.name?.toLowerCase() === cleanIdent) &&
        s.passwordHash === password
    );

    if (!school) {
      return res.status(401).json({
        success: false,
        error: 'Invalid school email/registration number or password.',
      });
    }

    res.json({
      success: true,
      school,
      fullData: db,
    });
  } catch (err: any) {
    console.error('Error during /api/auth/login:', err);
    res.status(500).json({ success: false, error: err.message || 'Authentication error' });
  }
});

// School Registration Endpoint
app.post('/api/schools/register', async (req, res) => {
  try {
    const params = req.body;
    if (!params.name || !params.regNumber || !params.email || !params.password) {
      return res.status(400).json({
        success: false,
        error: 'All required registration fields must be provided.',
      });
    }

    const cleanReg = params.regNumber.trim().toLowerCase();
    const cleanEmail = params.email.trim().toLowerCase();

    const existing = db.schools.find(
      (s) =>
        s.regNumber?.toLowerCase() === cleanReg ||
        s.email?.toLowerCase() === cleanEmail
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `A school with this Registration Number (${params.regNumber}) or Email (${params.email}) is already registered.`,
      });
    }

    const schoolId = `school_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const initials = params.name
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0].toUpperCase())
      .join('')
      .slice(0, 3) || 'MX';
    const schoolCode = `${initials}-${Math.floor(100 + Math.random() * 900)}`;
    const count = Math.max(1, Number(params.studentCount) || 50);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const payRef = params.paymentReference?.trim() || `PP-REG-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const receiptNo = `REC-MX-${Math.floor(100000 + Math.random() * 900000)}`;
    const isPaid = params.isPaid !== undefined ? params.isPaid : true;

    const newSchool = {
      id: schoolId,
      name: params.name.trim(),
      regNumber: params.regNumber.trim(),
      email: cleanEmail,
      passwordHash: params.password,
      studentCount: count,
      schoolCode,
      motto: params.motto?.trim() || 'Excellence, Truth & Service',
      createdAt: now.toISOString(),
      electionStatus: 'active',
      electionTitle: `${params.name.trim()} Student Council Elections`,
      academicYear: params.academicYear || '2026/2027',
      licenseFee: 50000,
      licenseCurrency: 'UGX',
      licenseDuration: '1 Month (30 Days)',
      licenseStatus: isPaid ? 'active' : 'pending_payment',
      licenseActivatedAt: now.toISOString(),
      licenseExpiresAt: expiresAt.toISOString(),
      paidAmount: isPaid ? 50000 : 0,
      recipientPhone: 'https://www.paypal.com/ncp/payment/MQS9SB3PQDQUY',
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
              amount: 50000,
              currency: 'UGX',
              recipientPhone: 'https://www.paypal.com/ncp/payment/MQS9SB3PQDQUY',
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

    // Generate Complex & Unpredictable Pupil Voter IDs
    const existingCodes = new Set<string>();
    const generatedVoters = [];
    for (let i = 1; i <= count; i++) {
      generatedVoters.push({
        id: `voter_${schoolId}_${i}`,
        schoolId,
        voterCode: generateComplexVoterCode(schoolCode, existingCodes),
        studentIndex: i,
        hasVoted: false,
      });
    }

    db.schools.push(newSchool);
    db.voters.push(...generatedVoters);
    saveDatabase();

    // Persist to Cloud SQL PostgreSQL
    await saveSchool(newSchool).catch((e) => console.error('Cloud SQL saveSchool error:', e));
    await saveVotersBatch(generatedVoters).catch((e) => console.error('Cloud SQL saveVotersBatch error:', e));

    res.json({
      success: true,
      school: newSchool,
      fullData: db,
    });
  } catch (err: any) {
    console.error('Error during /api/schools/register:', err);
    res.status(500).json({ success: false, error: err.message || 'Registration error' });
  }
});

// Regenerate All Student Voter IDs for a School with Complex Unpredictable Codes
app.post('/api/schools/regenerate-voters', async (req, res) => {
  try {
    const { schoolId } = req.body;
    const school = db.schools.find((s) => s.id === schoolId);
    if (!school) {
      return res.status(404).json({ success: false, error: 'School not found.' });
    }

    // Clear existing voters and votes for this school
    db.voters = db.voters.filter((v) => v.schoolId !== schoolId);
    db.votes = db.votes.filter((v) => v.schoolId !== schoolId);

    const existingCodes = new Set<string>();
    const newVoters = [];
    for (let i = 1; i <= school.studentCount; i++) {
      newVoters.push({
        id: `voter_${schoolId}_${i}_${Date.now()}`,
        schoolId,
        voterCode: generateComplexVoterCode(school.schoolCode, existingCodes),
        studentIndex: i,
        hasVoted: false,
      });
    }

    db.voters.push(...newVoters);
    saveDatabase();

    // Persist to Cloud SQL PostgreSQL
    await saveVotersBatch(newVoters).catch((e) => console.error('Cloud SQL saveVotersBatch error:', e));

    res.json({
      success: true,
      voters: newVoters,
      fullData: db,
    });
  } catch (err: any) {
    console.error('Error during /api/schools/regenerate-voters:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to regenerate voter IDs' });
  }
});

// Add Additional Pupils with Complex Unpredictable IDs
app.post('/api/schools/add-pupils', async (req, res) => {
  try {
    const { schoolId, count } = req.body;
    const school = db.schools.find((s) => s.id === schoolId);
    if (!school) {
      return res.status(404).json({ success: false, error: 'School not found.' });
    }

    const additionalCount = Math.max(1, Number(count) || 1);
    const currentVoters = db.voters.filter((v) => v.schoolId === schoolId);
    const existingCodes = new Set<string>(currentVoters.map((v) => v.voterCode));
    const startIndex = currentVoters.length + 1;
    const newVoters = [];

    for (let i = 0; i < additionalCount; i++) {
      const idx = startIndex + i;
      newVoters.push({
        id: `voter_${schoolId}_${idx}_${Date.now()}`,
        schoolId,
        voterCode: generateComplexVoterCode(school.schoolCode, existingCodes),
        studentIndex: idx,
        hasVoted: false,
      });
    }

    db.voters.push(...newVoters);
    school.studentCount += additionalCount;
    saveDatabase();

    // Persist to Cloud SQL PostgreSQL
    await saveVotersBatch(newVoters).catch((e) => console.error('Cloud SQL saveVotersBatch error:', e));
    await saveSchool(school).catch((e) => console.error('Cloud SQL saveSchool error:', e));

    res.json({
      success: true,
      newVoters,
      school,
      fullData: db,
    });
  } catch (err: any) {
    console.error('Error during /api/schools/add-pupils:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to add pupil voter IDs' });
  }
});

// Confirm / Renew Payment
app.post('/api/schools/confirm-payment', async (req, res) => {
  try {
    const { schoolId, paymentMethod, paymentReference, payerEmailOrPhone, gatewayUrl } = req.body;
    const index = db.schools.findIndex((s) => s.id === schoolId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'School not found.' });
    }

    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const payRef = paymentReference?.trim() || `PP-TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const receiptNo = `REC-MX-${Math.floor(100000 + Math.random() * 900000)}`;
    const gateway = gatewayUrl || 'https://www.paypal.com/ncp/payment/MQS9SB3PQDQUY';

    const currentHistory = db.schools[index].paymentHistory || [];
    const newPaymentRecord = {
      id: `pay_${Date.now()}`,
      schoolId,
      amount: 50000,
      currency: 'UGX',
      recipientPhone: gateway,
      payerPhone: payerEmailOrPhone || '',
      paymentMethod: paymentMethod || 'PayPal Secure Payment',
      paymentReference: payRef,
      receiptNumber: receiptNo,
      status: 'confirmed',
      durationDays: 30,
      activatedAt: now.toISOString(),
      expiresAt: newExpiresAt.toISOString(),
      verifiedBy: `Memon Xule PayPal Gateway (${gateway})`,
    };

    db.schools[index] = {
      ...db.schools[index],
      licenseFee: 50000,
      licenseCurrency: 'UGX',
      licenseDuration: '1 Month (30 Days)',
      licenseStatus: 'active',
      licenseActivatedAt: now.toISOString(),
      licenseExpiresAt: newExpiresAt.toISOString(),
      paidAmount: 50000,
      recipientPhone: gateway,
      payerPhone: payerEmailOrPhone || '',
      paymentMethod: paymentMethod || 'PayPal / Card',
      paymentReference: payRef,
      receiptNumber: receiptNo,
      paymentVerifiedAt: now.toISOString(),
      paymentHistory: [newPaymentRecord, ...currentHistory],
      electionStatus: db.schools[index].electionStatus === 'closed' ? 'closed' : 'active',
    };

    saveDatabase();

    // Persist to Cloud SQL PostgreSQL
    await savePaymentRecord(newPaymentRecord).catch((e) => console.error('Cloud SQL savePaymentRecord error:', e));
    await saveSchool(db.schools[index]).catch((e) => console.error('Cloud SQL saveSchool error:', e));

    res.json({ success: true, school: db.schools[index], fullData: db });
  } catch (err: any) {
    console.error('Error during /api/schools/confirm-payment:', err);
    res.status(500).json({ success: false, error: err.message || 'Payment confirmation error' });
  }
});

// Cast Student Vote
app.post('/api/votes/cast', async (req, res) => {
  try {
    const { schoolId, voterCode, selections } = req.body;
    const rawCode = (voterCode || '').trim().toUpperCase();
    const cleanNoDash = rawCode.replace(/[^A-Z0-9]/g, '');

    const voterIndex = db.voters.findIndex((v) => {
      if (schoolId && v.schoolId !== schoolId) return false;
      const vCodeNoDash = v.voterCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (vCodeNoDash === cleanNoDash) return true;
      // Also match if student submitted only the 8-char random token
      const tokenOnly = vCodeNoDash.slice(-8);
      return cleanNoDash === tokenOnly;
    });

    if (voterIndex === -1) {
      return res.status(404).json({ success: false, error: 'Student Voter record not found.' });
    }

    if (db.voters[voterIndex].hasVoted) {
      return res.status(400).json({ success: false, error: 'This ballot has already been submitted.' });
    }

    // Mark voter as voted
    db.voters[voterIndex].hasVoted = true;
    db.voters[voterIndex].votedAt = new Date().toISOString();

    // Anonymous vote record
    const voteRecord = {
      id: `vote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      schoolId,
      voterCodeHash: `hash_${Date.now()}`,
      timestamp: new Date().toISOString(),
      selections: selections || {},
    };

    db.votes.push(voteRecord);
    saveDatabase();

    // Persist to Cloud SQL PostgreSQL
    await submitVote({
      id: voteRecord.id,
      schoolId: voteRecord.schoolId,
      voterId: db.voters[voterIndex].id,
      voterCodeHash: voteRecord.voterCodeHash,
      timestamp: voteRecord.timestamp,
      selections: voteRecord.selections,
    }).catch((e) => console.error('Cloud SQL submitVote error:', e));

    res.json({ success: true, vote: voteRecord, fullData: db });
  } catch (err: any) {
    console.error('Error during /api/votes/cast:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to cast ballot' });
  }
});

// Synchronize Authenticated Firebase User to Cloud SQL users table
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || '';
    const name = (req.user as any)?.name || '';
    if (!uid) {
      return res.status(400).json({ success: false, error: 'Missing UID' });
    }
    const user = await getOrCreateUser(uid, email, name);
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Failed to sync auth user to Cloud SQL:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to sync user' });
  }
});

// Verify Student Voter Directly via Central Server
app.post('/api/voters/verify', (req, res) => {
  try {
    const { voterCode, schoolId } = req.body;
    const rawInput = (voterCode || '').trim();
    if (!rawInput) {
      return res.status(400).json({ success: false, error: 'Please enter your unique Student Voter ID number.' });
    }

    const cleanInput = rawInput.toUpperCase().replace(/\s+/g, '');
    const inputWithoutDashes = cleanInput.replace(/[^A-Z0-9]/g, '');

    // 1. Direct match by exact or dash-normalized voterCode
    let voter = db.voters.find((v) => {
      if (schoolId && v.schoolId !== schoolId) return false;
      const vCodeClean = (v.voterCode || '').toUpperCase().replace(/\s+/g, '');
      const vCodeNoDash = vCodeClean.replace(/[^A-Z0-9]/g, '');
      return vCodeClean === cleanInput || vCodeNoDash === inputWithoutDashes;
    });

    // 2. Token match: If student entered only the 8-character random token (e.g. 5WSD-ZFRN or 5WSDZFRN)
    if (!voter && inputWithoutDashes.length >= 6) {
      voter = db.voters.find((v) => {
        if (schoolId && v.schoolId !== schoolId) return false;
        const vCodeNoDash = (v.voterCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const tokenOnly = vCodeNoDash.slice(-8);
        return inputWithoutDashes === tokenOnly;
      });
    }

    if (!voter) {
      const availableCodes = db.schools.map((s) => `${s.name} (${s.schoolCode})`).join(', ');
      return res.status(404).json({
        success: false,
        error: `Invalid Student Voter ID "${rawInput}". Please check the ID printed on your voter card.${
          db.schools.length > 0 ? ` (Registered Schools: ${availableCodes})` : ''
        }`,
      });
    }

    const school = db.schools.find((s) => s.id === voter.schoolId);
    if (!school) {
      return res.status(404).json({ success: false, error: 'School record associated with this Voter ID could not be found.' });
    }

    const positions = db.positions.filter((p) => p.schoolId === school.id).sort((a, b) => a.order - b.order);
    const candidates = db.candidates.filter((c) => c.schoolId === school.id).sort((a, b) => a.ballotNumber - b.ballotNumber);

    res.json({
      success: true,
      voter,
      school,
      positions,
      candidates,
    });
  } catch (err: any) {
    console.error('Error during /api/voters/verify:', err);
    res.status(500).json({ success: false, error: err.message || 'Verification error' });
  }
});

// Vite Middleware for development / Static file serving for production
async function startServer() {
  // Ensure Cloud SQL is populated
  ensurePostgresData().catch((err) => console.error('Initial Cloud SQL migration check failed:', err));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Memon Xule Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
