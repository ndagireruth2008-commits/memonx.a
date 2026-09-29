import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp
} from 'drizzle-orm/pg-core';

// 1. Users Table (Linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Schools Table
export const schools = pgTable('schools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  regNumber: text('reg_number').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  studentCount: integer('student_count').notNull().default(0),
  schoolCode: text('school_code').notNull(),
  motto: text('motto'),
  logoUrl: text('logo_url'),
  electionStatus: text('election_status').notNull().default('draft'),
  electionTitle: text('election_title'),
  academicYear: text('academic_year'),
  licenseFee: integer('license_fee').default(50000),
  licenseCurrency: text('license_currency').default('UGX'),
  licenseDuration: text('license_duration').default('1 Month (30 Days)'),
  licenseStatus: text('license_status').default('active'),
  licenseActivatedAt: text('license_activated_at'),
  licenseExpiresAt: text('license_expires_at'),
  paymentReference: text('payment_reference'),
  paymentMethod: text('payment_method'),
  paidAmount: integer('paid_amount'),
  recipientPhone: text('recipient_phone'),
  payerPhone: text('payer_phone'),
  paymentVerifiedAt: text('payment_verified_at'),
  receiptNumber: text('receipt_number'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Positions Table
export const positions = pgTable('positions', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  title: text('title').notNull(),
  order: integer('order').notNull().default(1),
  description: text('description'),
  maxSelections: integer('max_selections').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Candidates Table
export const candidates = pgTable('candidates', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  positionId: text('position_id').notNull().references(() => positions.id),
  fullName: text('full_name').notNull(),
  gradeOrClass: text('grade_or_class'),
  photoUrl: text('photo_url'),
  manifesto: text('manifesto'),
  ballotNumber: integer('ballot_number').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Student Voters Table
export const studentVoters = pgTable('student_voters', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  voterCode: text('voter_code').notNull().unique(),
  studentIndex: integer('student_index').notNull(),
  hasVoted: boolean('has_voted').notNull().default(false),
  votedAt: text('voted_at'),
  allocatedGrade: text('allocated_grade'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Vote Records Table (Cryptographically anonymous submissions)
export const voteRecords = pgTable('vote_records', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  voterCodeHash: text('voter_code_hash').notNull(),
  timestamp: text('timestamp').notNull(),
  selectionsJson: text('selections_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Payment Records Table
export const paymentRecords = pgTable('payment_records', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('UGX'),
  recipientPhone: text('recipient_phone').notNull(),
  payerPhone: text('payer_phone'),
  paymentMethod: text('payment_method').notNull(),
  paymentReference: text('payment_reference').notNull(),
  receiptNumber: text('receipt_number').notNull(),
  status: text('status').notNull().default('confirmed'),
  durationDays: integer('duration_days').notNull().default(30),
  activatedAt: text('activated_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  verifiedBy: text('verified_by').notNull().default('SYSTEM_AUTO_VERIFIED'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Drizzle Relationships
export const schoolsRelations = relations(schools, ({ many }) => ({
  positions: many(positions),
  candidates: many(candidates),
  studentVoters: many(studentVoters),
  voteRecords: many(voteRecords),
  paymentRecords: many(paymentRecords),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  school: one(schools, {
    fields: [positions.schoolId],
    references: [schools.id],
  }),
  candidates: many(candidates),
}));

export const candidatesRelations = relations(candidates, ({ one }) => ({
  school: one(schools, {
    fields: [candidates.schoolId],
    references: [schools.id],
  }),
  position: one(positions, {
    fields: [candidates.positionId],
    references: [positions.id],
  }),
}));

export const studentVotersRelations = relations(studentVoters, ({ one }) => ({
  school: one(schools, {
    fields: [studentVoters.schoolId],
    references: [schools.id],
  }),
}));

export const voteRecordsRelations = relations(voteRecords, ({ one }) => ({
  school: one(schools, {
    fields: [voteRecords.schoolId],
    references: [schools.id],
  }),
}));

export const paymentRecordsRelations = relations(paymentRecords, ({ one }) => ({
  school: one(schools, {
    fields: [paymentRecords.schoolId],
    references: [schools.id],
  }),
}));
