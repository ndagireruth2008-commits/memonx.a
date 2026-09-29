export interface School {
  id: string;
  name: string;
  regNumber: string;
  email: string;
  passwordHash: string; // Plain/hash for school admin
  studentCount: number;
  schoolCode: string; // e.g. "MX-1092"
  motto?: string;
  logoUrl?: string;
  createdAt: string;
  electionStatus: 'draft' | 'active' | 'closed';
  electionTitle?: string;
  academicYear?: string;
  // 1-Month Election License & 50,000 Setup Payment
  licenseFee: number; // 50000
  licenseCurrency: string; // "UGX" or "50,000 /="
  licenseDuration: string; // "1 Month (30 Days)"
  licenseStatus: 'active' | 'pending_payment' | 'expired';
  licenseActivatedAt: string;
  licenseExpiresAt: string;
  paymentReference?: string;
  paymentMethod?: string;
  paidAmount?: number;
  recipientPhone?: string; // e.g. "0746496474"
  payerPhone?: string;
  paymentVerifiedAt?: string;
  receiptNumber?: string;
  paymentHistory?: PaymentRecord[];
}

export interface PaymentRecord {
  id: string;
  schoolId: string;
  amount: number; // 50000
  currency: string; // "UGX"
  recipientPhone: string; // "0746496474"
  payerPhone?: string;
  paymentMethod: string;
  paymentReference: string;
  receiptNumber: string;
  status: 'confirmed' | 'pending' | 'failed';
  durationDays: number; // 30
  activatedAt: string;
  expiresAt: string;
  verifiedBy: string;
}

export interface Position {
  id: string;
  schoolId: string;
  title: string; // e.g. "Head Boy", "Head Girl", "Sports Prefect"
  order: number;
  description?: string;
  maxSelections: number;
}

export interface Candidate {
  id: string;
  schoolId: string;
  positionId: string;
  fullName: string;
  gradeOrClass: string;
  photoUrl: string;
  manifesto: string;
  ballotNumber: number;
}

export interface StudentVoter {
  id: string;
  schoolId: string;
  voterCode: string; // e.g. "N-737-7K9P-4X2M" (Complex unpredictable ID)
  studentIndex: number; // 1, 2, 3... up to studentCount
  hasVoted: boolean;
  votedAt?: string;
  allocatedGrade?: string;
}

export interface VoteRecord {
  id: string;
  schoolId: string;
  voterCodeHash: string; // anonymous reference
  timestamp: string;
  selections: Record<string, string>; // positionId -> candidateId | 'ABSTAIN'
}

export interface PositionResult {
  position: Position;
  candidates: (Candidate & { votes: number; percentage: number; isWinner: boolean })[];
  totalVotes: number;
  abstains: number;
  isTie: boolean;
}

export interface SchoolElectionResults {
  schoolId: string;
  totalEligible: number;
  totalVoted: number;
  turnoutPercentage: number;
  positionsResults: PositionResult[];
  lastUpdated: string;
}
