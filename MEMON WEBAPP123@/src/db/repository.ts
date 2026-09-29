import { db } from './index.ts';
import {
  schools,
  positions,
  candidates,
  studentVoters,
  voteRecords,
  paymentRecords,
} from './schema.ts';
import { eq, inArray } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

let isMigrated = false;

// Seamlessly seed PostgreSQL from local database.json if PostgreSQL tables are currently empty
export async function ensurePostgresData() {
  if (isMigrated) return;
  try {
    const existingSchools = await db.select().from(schools).limit(1);
    if (existingSchools.length === 0) {
      const dbFile = path.join(process.cwd(), 'data', 'database.json');
      if (fs.existsSync(dbFile)) {
        console.log('Migrating initial data from local JSON to Cloud SQL PostgreSQL...');
        const raw = fs.readFileSync(dbFile, 'utf-8');
        const local = JSON.parse(raw);

        // 1. Seed Schools
        if (Array.isArray(local.schools) && local.schools.length > 0) {
          for (const s of local.schools) {
            await db.insert(schools).values({
              id: s.id,
              name: s.name,
              regNumber: s.regNumber,
              email: s.email,
              passwordHash: s.passwordHash,
              studentCount: s.studentCount || 0,
              schoolCode: s.schoolCode,
              motto: s.motto || null,
              logoUrl: s.logoUrl || null,
              electionStatus: s.electionStatus || 'draft',
              electionTitle: s.electionTitle || null,
              academicYear: s.academicYear || null,
              licenseFee: s.licenseFee || 50000,
              licenseCurrency: s.licenseCurrency || 'UGX',
              licenseDuration: s.licenseDuration || '1 Month (30 Days)',
              licenseStatus: s.licenseStatus || 'active',
              licenseActivatedAt: s.licenseActivatedAt || null,
              licenseExpiresAt: s.licenseExpiresAt || null,
              paymentReference: s.paymentReference || null,
              paymentMethod: s.paymentMethod || null,
              paidAmount: s.paidAmount || null,
              recipientPhone: s.recipientPhone || null,
              payerPhone: s.payerPhone || null,
              paymentVerifiedAt: s.paymentVerifiedAt || null,
              receiptNumber: s.receiptNumber || null,
            }).onConflictDoNothing();
          }
        }

        // 2. Seed Positions
        if (Array.isArray(local.positions) && local.positions.length > 0) {
          for (const p of local.positions) {
            await db.insert(positions).values({
              id: p.id,
              schoolId: p.schoolId,
              title: p.title,
              order: p.order || 1,
              description: p.description || null,
              maxSelections: p.maxSelections || 1,
            }).onConflictDoNothing();
          }
        }

        // 3. Seed Candidates
        if (Array.isArray(local.candidates) && local.candidates.length > 0) {
          for (const c of local.candidates) {
            await db.insert(candidates).values({
              id: c.id,
              schoolId: c.schoolId,
              positionId: c.positionId,
              fullName: c.fullName,
              gradeOrClass: c.gradeOrClass || null,
              photoUrl: c.photoUrl || null,
              manifesto: c.manifesto || null,
              ballotNumber: c.ballotNumber || 1,
            }).onConflictDoNothing();
          }
        }

        // 4. Seed Student Voters in chunks of 500
        if (Array.isArray(local.voters) && local.voters.length > 0) {
          const chunkSize = 200;
          for (let i = 0; i < local.voters.length; i += chunkSize) {
            const chunk = local.voters.slice(i, i + chunkSize);
            await db.insert(studentVoters).values(
              chunk.map((v: any) => ({
                id: v.id,
                schoolId: v.schoolId,
                voterCode: v.voterCode,
                studentIndex: v.studentIndex,
                hasVoted: !!v.hasVoted,
                votedAt: v.votedAt || null,
                allocatedGrade: v.allocatedGrade || null,
              }))
            ).onConflictDoNothing();
          }
        }

        // 5. Seed Votes
        if (Array.isArray(local.votes) && local.votes.length > 0) {
          for (const v of local.votes) {
            await db.insert(voteRecords).values({
              id: v.id,
              schoolId: v.schoolId,
              voterCodeHash: v.voterCodeHash,
              timestamp: v.timestamp,
              selectionsJson: typeof v.selections === 'string' ? v.selections : JSON.stringify(v.selections || {}),
            }).onConflictDoNothing();
          }
        }

        console.log('Migration to Cloud SQL completed successfully!');
      }
    }
    isMigrated = true;
  } catch (error) {
    console.error('Error during data check/migration:', error);
    // Don't crash; permit lazy recovery
  }
}

// Fetch complete system state from PostgreSQL
export async function getCompleteDatabaseState() {
  await ensurePostgresData();
  try {
    const [allSchools, allPositions, allCandidates, allVoters, allVotes, allPayments] =
      await Promise.all([
        db.select().from(schools),
        db.select().from(positions),
        db.select().from(candidates),
        db.select().from(studentVoters),
        db.select().from(voteRecords),
        db.select().from(paymentRecords),
      ]);

    return {
      schools: allSchools.map((s) => ({
        ...s,
        paymentHistory: allPayments.filter((p) => p.schoolId === s.id),
      })),
      positions: allPositions,
      candidates: allCandidates,
      voters: allVoters,
      votes: allVotes.map((v) => ({
        id: v.id,
        schoolId: v.schoolId,
        voterCodeHash: v.voterCodeHash,
        timestamp: v.timestamp,
        selections: JSON.parse(v.selectionsJson || '{}'),
      })),
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database query failed in getCompleteDatabaseState:', error);
    throw new Error('Failed to retrieve database state from Cloud SQL', { cause: error });
  }
}

// Upsert School
export async function saveSchool(schoolData: any) {
  try {
    const result = await db
      .insert(schools)
      .values({
        id: schoolData.id,
        name: schoolData.name,
        regNumber: schoolData.regNumber,
        email: schoolData.email,
        passwordHash: schoolData.passwordHash,
        studentCount: schoolData.studentCount || 0,
        schoolCode: schoolData.schoolCode,
        motto: schoolData.motto || null,
        logoUrl: schoolData.logoUrl || null,
        electionStatus: schoolData.electionStatus || 'draft',
        electionTitle: schoolData.electionTitle || null,
        academicYear: schoolData.academicYear || null,
        licenseFee: schoolData.licenseFee || 50000,
        licenseCurrency: schoolData.licenseCurrency || 'UGX',
        licenseDuration: schoolData.licenseDuration || '1 Month (30 Days)',
        licenseStatus: schoolData.licenseStatus || 'active',
        licenseActivatedAt: schoolData.licenseActivatedAt || null,
        licenseExpiresAt: schoolData.licenseExpiresAt || null,
        paymentReference: schoolData.paymentReference || null,
        paymentMethod: schoolData.paymentMethod || null,
        paidAmount: schoolData.paidAmount || null,
        recipientPhone: schoolData.recipientPhone || null,
        payerPhone: schoolData.payerPhone || null,
        paymentVerifiedAt: schoolData.paymentVerifiedAt || null,
        receiptNumber: schoolData.receiptNumber || null,
      })
      .onConflictDoUpdate({
        target: schools.id,
        set: {
          name: schoolData.name,
          regNumber: schoolData.regNumber,
          email: schoolData.email,
          passwordHash: schoolData.passwordHash,
          studentCount: schoolData.studentCount || 0,
          schoolCode: schoolData.schoolCode,
          motto: schoolData.motto || null,
          logoUrl: schoolData.logoUrl || null,
          electionStatus: schoolData.electionStatus || 'draft',
          electionTitle: schoolData.electionTitle || null,
          academicYear: schoolData.academicYear || null,
          licenseFee: schoolData.licenseFee || 50000,
          licenseCurrency: schoolData.licenseCurrency || 'UGX',
          licenseDuration: schoolData.licenseDuration || '1 Month (30 Days)',
          licenseStatus: schoolData.licenseStatus || 'active',
          licenseActivatedAt: schoolData.licenseActivatedAt || null,
          licenseExpiresAt: schoolData.licenseExpiresAt || null,
          paymentReference: schoolData.paymentReference || null,
          paymentMethod: schoolData.paymentMethod || null,
          paidAmount: schoolData.paidAmount || null,
          recipientPhone: schoolData.recipientPhone || null,
          payerPhone: schoolData.payerPhone || null,
          paymentVerifiedAt: schoolData.paymentVerifiedAt || null,
          receiptNumber: schoolData.receiptNumber || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error saving school to Cloud SQL:', error);
    throw new Error('Failed to save school', { cause: error });
  }
}

// Upsert Position
export async function savePosition(posData: any) {
  try {
    const result = await db
      .insert(positions)
      .values({
        id: posData.id,
        schoolId: posData.schoolId,
        title: posData.title,
        order: posData.order || 1,
        description: posData.description || null,
        maxSelections: posData.maxSelections || 1,
      })
      .onConflictDoUpdate({
        target: positions.id,
        set: {
          title: posData.title,
          order: posData.order || 1,
          description: posData.description || null,
          maxSelections: posData.maxSelections || 1,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error saving position to Cloud SQL:', error);
    throw new Error('Failed to save position', { cause: error });
  }
}

// Delete Position (also removes associated candidates)
export async function removePosition(positionId: string) {
  try {
    await db.delete(candidates).where(eq(candidates.positionId, positionId));
    await db.delete(positions).where(eq(positions.id, positionId));
    return true;
  } catch (error) {
    console.error('Error removing position from Cloud SQL:', error);
    throw new Error('Failed to remove position', { cause: error });
  }
}

// Upsert Candidate
export async function saveCandidate(candData: any) {
  try {
    const result = await db
      .insert(candidates)
      .values({
        id: candData.id,
        schoolId: candData.schoolId,
        positionId: candData.positionId,
        fullName: candData.fullName,
        gradeOrClass: candData.gradeOrClass || null,
        photoUrl: candData.photoUrl || null,
        manifesto: candData.manifesto || null,
        ballotNumber: candData.ballotNumber || 1,
      })
      .onConflictDoUpdate({
        target: candidates.id,
        set: {
          positionId: candData.positionId,
          fullName: candData.fullName,
          gradeOrClass: candData.gradeOrClass || null,
          photoUrl: candData.photoUrl || null,
          manifesto: candData.manifesto || null,
          ballotNumber: candData.ballotNumber || 1,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error saving candidate to Cloud SQL:', error);
    throw new Error('Failed to save candidate', { cause: error });
  }
}

// Delete Candidate
export async function removeCandidate(candidateId: string) {
  try {
    await db.delete(candidates).where(eq(candidates.id, candidateId));
    return true;
  } catch (error) {
    console.error('Error removing candidate from Cloud SQL:', error);
    throw new Error('Failed to remove candidate', { cause: error });
  }
}

// Batch Save Voters
export async function saveVotersBatch(votersList: any[]) {
  try {
    const chunkSize = 200;
    for (let i = 0; i < votersList.length; i += chunkSize) {
      const chunk = votersList.slice(i, i + chunkSize);
      await db.insert(studentVoters).values(
        chunk.map((v) => ({
          id: v.id,
          schoolId: v.schoolId,
          voterCode: v.voterCode,
          studentIndex: v.studentIndex,
          hasVoted: !!v.hasVoted,
          votedAt: v.votedAt || null,
          allocatedGrade: v.allocatedGrade || null,
        }))
      ).onConflictDoNothing();
    }
    return true;
  } catch (error) {
    console.error('Error saving voters batch to Cloud SQL:', error);
    throw new Error('Failed to save voters batch', { cause: error });
  }
}

// Record Single Vote Submission
export async function submitVote(voteData: {
  id: string;
  schoolId: string;
  voterId: string;
  voterCodeHash: string;
  timestamp: string;
  selections: Record<string, string>;
}) {
  try {
    // 1. Mark voter as voted
    await db
      .update(studentVoters)
      .set({
        hasVoted: true,
        votedAt: voteData.timestamp,
      })
      .where(eq(studentVoters.id, voteData.voterId));

    // 2. Insert cryptographic vote record
    await db
      .insert(voteRecords)
      .values({
        id: voteData.id,
        schoolId: voteData.schoolId,
        voterCodeHash: voteData.voterCodeHash,
        timestamp: voteData.timestamp,
        selectionsJson: JSON.stringify(voteData.selections),
      })
      .onConflictDoNothing();

    return true;
  } catch (error) {
    console.error('Error submitting vote to Cloud SQL:', error);
    throw new Error('Failed to record ballot submission', { cause: error });
  }
}

// Record License Payment
export async function savePaymentRecord(paymentData: any) {
  try {
    const result = await db
      .insert(paymentRecords)
      .values({
        id: paymentData.id,
        schoolId: paymentData.schoolId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'UGX',
        recipientPhone: paymentData.recipientPhone,
        payerPhone: paymentData.payerPhone || null,
        paymentMethod: paymentData.paymentMethod,
        paymentReference: paymentData.paymentReference,
        receiptNumber: paymentData.receiptNumber,
        status: paymentData.status || 'confirmed',
        durationDays: paymentData.durationDays || 30,
        activatedAt: paymentData.activatedAt,
        expiresAt: paymentData.expiresAt,
        verifiedBy: paymentData.verifiedBy || 'SYSTEM_AUTO_VERIFIED',
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error saving payment record to Cloud SQL:', error);
    throw new Error('Failed to record payment', { cause: error });
  }
}
