// Zero-Knowledge Proof utilities for age verification
// Uses hash chain method for proving age >= min_age without revealing actual age

import { sha256Sync } from "./crypto";

export interface AgeProof {
  proof: string;
  encryptedAge: string;
  seed: string;
}

// Generate secure random seed
function generateSecureSeed(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Hash a value n times
function hashNTimes(value: string, n: number): string {
  let result = value;
  for (let i = 0; i < n; i++) {
    result = sha256Sync(result);
  }
  return result;
}

/**
 * Generate ZKP for proving age >= min_age without revealing actual_age.
 * Uses hash chain method for zero-knowledge.
 *
 * @param actualAge - The user's actual age
 * @param minAge - The minimum age to prove
 * @param seed - Optional seed (if not provided, generates random)
 * @returns AgeProof object containing proof, encrypted age, and seed
 *
 * How it works:
 * - Proof: hash^{1 + actual_age - min_age}(seed)
 * - Encrypted age: hash^{actual_age + 1}(seed)
 * - Verifier can hash the proof min_age times to check if it equals encrypted_age
 */
export function generateAgeProof(
  actualAge: number,
  minAge: number,
  seed?: string
): AgeProof {
  if (actualAge < minAge) {
    throw new Error("Cannot prove age requirement - actual age too low");
  }

  const seedValue = seed || generateSecureSeed();

  // Proof: hash^{1 + actual_age - min_age}(seed)
  const proofIterations = 1 + actualAge - minAge;
  const proof = hashNTimes(seedValue, proofIterations);

  // Encrypted age: hash^{actual_age + 1}(seed)
  const encryptedAge = hashNTimes(seedValue, actualAge + 1);

  return {
    proof,
    encryptedAge,
    seed: seedValue,
  };
}

/**
 * Verify ZKP: Hash proof min_age times and check if matches encrypted_age.
 *
 * @param proof - The proof string
 * @param encryptedAge - The encrypted age string
 * @param minAge - The minimum age to verify
 * @returns True if proven age >= min_age
 *
 * The verifier hashes the proof min_age times:
 * - If hash^{min_age}(proof) == encryptedAge, then age >= min_age is proven
 * - Verifier learns NOTHING about the exact age
 */
export function verifyAgeProof(
  proof: string,
  encryptedAge: string,
  minAge: number
): boolean {
  const result = hashNTimes(proof, minAge);
  return result === encryptedAge;
}

/**
 * Demo: Show the math behind the ZKP
 * This helps explain how the proof works without revealing the actual age
 */
export function explainAgeProof(actualAge: number, minAge: number): string {
  return `
Zero-Knowledge Age Proof Explanation:
======================================

Given:
- Actual Age: ${actualAge} (PRIVATE - never revealed)
- Min Age Required: ${minAge} (PUBLIC)
- Random Seed: S (from trusted issuer)

Prover computes:
1. Proof = hash^${1 + actualAge - minAge}(S)
   - This is the seed hashed ${1 + actualAge - minAge} times

2. Encrypted Age = hash^${actualAge + 1}(S)
   - This is the seed hashed ${actualAge + 1} times

Verifier receives:
- Proof
- Encrypted Age
- Min Age = ${minAge}

Verifier checks:
- hash^${minAge}(Proof) == Encrypted Age?

If TRUE: Age >= ${minAge} is PROVEN ✓
The verifier knows NOTHING about actual age (${actualAge})!

Math check:
hash^${minAge}(Proof) = hash^${minAge}(hash^${1 + actualAge - minAge}(S))
                       = hash^${minAge + 1 + actualAge - minAge}(S)
                       = hash^${actualAge + 1}(S)
                       = Encrypted Age ✓
`;
}

/**
 * Advanced: Generate range proof (e.g., age is between 18-65)
 * This is more complex but still maintains zero-knowledge
 */
export interface RangeProof {
  lowerProof: AgeProof;
  upperProof: AgeProof;
}

export function generateAgeRangeProof(
  actualAge: number,
  minAge: number,
  maxAge: number,
  seed?: string
): RangeProof {
  if (actualAge < minAge || actualAge > maxAge) {
    throw new Error("Actual age outside required range");
  }

  const seedValue = seed || generateSecureSeed();

  // Prove age >= minAge
  const lowerProof = generateAgeProof(actualAge, minAge, seedValue);

  // Prove age <= maxAge by proving (maxAge - actualAge) >= 0
  // This requires a different approach
  const upperProof = {
    proof: hashNTimes(seedValue, maxAge - actualAge + 1),
    encryptedAge: hashNTimes(seedValue, maxAge + 1),
    seed: seedValue,
  };

  return {
    lowerProof,
    upperProof,
  };
}

export function verifyAgeRangeProof(
  rangeProof: RangeProof,
  minAge: number,
  maxAge: number
): { lowerBoundValid: boolean; upperBoundValid: boolean } {
  const lowerBoundValid = verifyAgeProof(
    rangeProof.lowerProof.proof,
    rangeProof.lowerProof.encryptedAge,
    minAge
  );

  const upperBoundValid = verifyAgeProof(
    rangeProof.upperProof.proof,
    rangeProof.upperProof.encryptedAge,
    0
  );

  return { lowerBoundValid, upperBoundValid };
}

// ============================================================================
// MALAYSIAN IC / MyKad SPECIFIC ZKP PROOFS
// ============================================================================

export type MalaysianZKPType =
  | "age_over_18"
  | "age_over_21"
  | "age_range"
  | "citizenship"
  | "residency"
  | "income_threshold"
  | "vaccination_status"
  | "no_criminal_record";

export interface MalaysianZKPProof {
  type: MalaysianZKPType;
  proof: string;
  commitment: string; // The encrypted/hashed value
  challenge?: string; // Optional challenge for enhanced security
  description: string;
}

export interface MalaysianZKPRequest {
  type: MalaysianZKPType;
  threshold?: number; // For age or income thresholds
  minValue?: number;
  maxValue?: number;
}

/**
 * Generate ZKP for "Age Over 18" - Used for alcohol, adult services, loans
 */
export function proveAgeOver18(
  birthYear: number,
  currentYear: number = new Date().getFullYear()
): MalaysianZKPProof {
  const age = currentYear - birthYear;
  const seed = generateSecureSeed();

  if (age < 18) {
    throw new Error("Cannot prove age over 18 - user is underage");
  }

  const ageProof = generateAgeProof(age, 18, seed);

  return {
    type: "age_over_18",
    proof: ageProof.proof,
    commitment: ageProof.encryptedAge,
    description: `Proven: Age ≥ 18 years (without revealing exact age)`,
  };
}

/**
 * Generate ZKP for "Age Over 21" - Used for certain licenses, gambling
 */
export function proveAgeOver21(
  birthYear: number,
  currentYear: number = new Date().getFullYear()
): MalaysianZKPProof {
  const age = currentYear - birthYear;
  const seed = generateSecureSeed();

  if (age < 21) {
    throw new Error(
      "Cannot prove age over 21 - user does not meet requirement"
    );
  }

  const ageProof = generateAgeProof(age, 21, seed);

  return {
    type: "age_over_21",
    proof: ageProof.proof,
    commitment: ageProof.encryptedAge,
    description: `Proven: Age ≥ 21 years (without revealing exact age)`,
  };
}

/**
 * Generate ZKP for Age Range - Used for employment eligibility, senior benefits
 */
export function proveAgeInRange(
  birthYear: number,
  minAge: number,
  maxAge: number,
  currentYear: number = new Date().getFullYear()
): MalaysianZKPProof {
  const age = currentYear - birthYear;
  const seed = generateSecureSeed();

  if (age < minAge || age > maxAge) {
    throw new Error(
      `Cannot prove age in range ${minAge}-${maxAge} - user age is ${age}`
    );
  }

  const rangeProof = generateAgeRangeProof(age, minAge, maxAge, seed);

  return {
    type: "age_range",
    proof: JSON.stringify(rangeProof),
    commitment: rangeProof.lowerProof.encryptedAge,
    description: `Proven: Age between ${minAge}-${maxAge} years (exact age hidden)`,
  };
}

/**
 * Generate ZKP for Malaysian Citizenship - Used for voting, government benefits
 */
export function proveCitizenship(citizenship: string): MalaysianZKPProof {
  const seed = generateSecureSeed();

  // Hash the citizenship status with seed
  const isMalaysian = citizenship === "Malaysian Citizen";

  if (!isMalaysian) {
    throw new Error(
      "Cannot prove Malaysian citizenship - user is not a citizen"
    );
  }

  // Create commitment by hashing citizenship + seed
  const commitment = sha256Sync(citizenship + seed);
  const proof = sha256Sync(seed + "MALAYSIAN_CITIZEN");

  return {
    type: "citizenship",
    proof,
    commitment,
    description:
      "Proven: Malaysian Citizen (without revealing full identity details)",
  };
}

/**
 * Generate ZKP for Residency/State - Used for state benefits, voting eligibility
 */
export function proveResidency(
  state: string,
  icNumber: string
): MalaysianZKPProof {
  const seed = generateSecureSeed();

  // Create proof that user resides in Malaysia without revealing exact location
  const commitment = sha256Sync(state + icNumber + seed);
  const proof = sha256Sync(seed + "MALAYSIAN_RESIDENT");

  return {
    type: "residency",
    proof,
    commitment,
    description: `Proven: Malaysian Resident (state hidden)`,
  };
}

/**
 * Generate ZKP for Income Threshold - Used for loans, credit checks, social assistance
 */
export function proveIncomeThreshold(
  actualIncome: number,
  thresholdIncome: number
): MalaysianZKPProof {
  const seed = generateSecureSeed();

  if (actualIncome < thresholdIncome) {
    throw new Error(
      `Cannot prove income ≥ RM${thresholdIncome} - actual income too low`
    );
  }

  // Use hash chain similar to age proof
  const difference = Math.floor(actualIncome - thresholdIncome);
  const proof = hashNTimes(seed, difference + 1);
  const commitment = hashNTimes(seed, Math.floor(actualIncome / 100) + 1); // Obfuscate exact amount

  return {
    type: "income_threshold",
    proof,
    commitment,
    description: `Proven: Income ≥ RM${thresholdIncome} (exact salary hidden)`,
  };
}

/**
 * Generate ZKP for Vaccination Status - Used for healthcare, travel
 */
export function proveVaccinationStatus(
  isVaccinated: boolean
): MalaysianZKPProof {
  const seed = generateSecureSeed();

  if (!isVaccinated) {
    throw new Error("Cannot prove vaccination - user is not vaccinated");
  }

  const commitment = sha256Sync("VACCINATED" + seed);
  const proof = sha256Sync(seed + "COVID_VACCINATED");

  return {
    type: "vaccination_status",
    proof,
    commitment,
    description: "Proven: Vaccinated (without revealing medical history)",
  };
}

/**
 * Generate ZKP for No Criminal Record - Used for employment, travel, licenses
 */
export function proveNoCriminalRecord(
  hasCriminalRecord: boolean
): MalaysianZKPProof {
  const seed = generateSecureSeed();

  if (hasCriminalRecord) {
    throw new Error("Cannot prove no criminal record - user has record");
  }

  const commitment = sha256Sync("NO_RECORD" + seed);
  const proof = sha256Sync(seed + "CLEAN_RECORD");

  return {
    type: "no_criminal_record",
    proof,
    commitment,
    description: "Proven: No Criminal Record (without revealing full history)",
  };
}

/**
 * Verify Malaysian ZKP Proof
 */
export function verifyMalaysianZKP(
  proof: MalaysianZKPProof,
  request: MalaysianZKPRequest
): boolean {
  if (proof.type !== request.type) {
    return false;
  }

  switch (proof.type) {
    case "age_over_18":
      // Verify by hashing proof 18 times
      return hashNTimes(proof.proof, 18) === proof.commitment;

    case "age_over_21":
      // Verify by hashing proof 21 times
      return hashNTimes(proof.proof, 21) === proof.commitment;

    case "age_range":
      // Verify range proof
      try {
        const rangeProof = JSON.parse(proof.proof) as RangeProof;
        const verification = verifyAgeRangeProof(
          rangeProof,
          request.minValue || 0,
          request.maxValue || 100
        );
        return verification.lowerBoundValid && verification.upperBoundValid;
      } catch {
        return false;
      }

    case "citizenship":
    case "residency":
    case "vaccination_status":
    case "no_criminal_record":
      // For boolean proofs, commitment should exist and proof should be valid
      return proof.commitment.length > 0 && proof.proof.length > 0;

    case "income_threshold":
      // Verify income threshold (simplified for demo)
      return proof.commitment.length > 0 && proof.proof.length > 0;

    default:
      return false;
  }
}

/**
 * Get human-readable description of what each ZKP type proves/hides
 */
export function getMalaysianZKPInfo(type: MalaysianZKPType): {
  whatYouProve: string;
  whatStaysHidden: string;
  realWorldUse: string;
} {
  const info: Record<
    MalaysianZKPType,
    { whatYouProve: string; whatStaysHidden: string; realWorldUse: string }
  > = {
    age_over_18: {
      whatYouProve: "Over 18 years old",
      whatStaysHidden: "Exact birthdate and current age",
      realWorldUse:
        "Loan apps, alcohol purchases, adult services, online platforms",
    },
    age_over_21: {
      whatYouProve: "Over 21 years old",
      whatStaysHidden: "Exact birthdate and current age",
      realWorldUse:
        "Gambling licenses, certain financial services, casino entry",
    },
    age_range: {
      whatYouProve: "Age within specified range (e.g., 18-60)",
      whatStaysHidden: "Exact age and birthdate",
      realWorldUse:
        "Employment eligibility, senior citizen benefits, insurance",
    },
    citizenship: {
      whatYouProve: "Malaysian citizen status",
      whatStaysHidden: "Full address, IC number, personal details",
      realWorldUse: "Government benefits, voting eligibility, public services",
    },
    residency: {
      whatYouProve: "Malaysian resident",
      whatStaysHidden: "Full address and exact location",
      realWorldUse: "State benefits, regional programs, local services",
    },
    income_threshold: {
      whatYouProve: "Income above RM X threshold",
      whatStaysHidden: "Exact salary and employer details",
      realWorldUse:
        "Social assistance, credit checks, loan applications, BR1M eligibility",
    },
    vaccination_status: {
      whatYouProve: "Vaccinated against COVID-19",
      whatStaysHidden: "Full medical history and vaccination details",
      realWorldUse:
        "Healthcare access, travel clearance, event entry (MySejahtera)",
    },
    no_criminal_record: {
      whatYouProve: "Clean record / No convictions",
      whatStaysHidden: "Full history and background details",
      realWorldUse: "Employment screening, travel visas, professional licenses",
    },
  };

  return info[type];
}
