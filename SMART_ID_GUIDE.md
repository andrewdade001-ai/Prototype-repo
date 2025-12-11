# SecureVault Smart ID System - Malaysian IC (MyKad) Integration

## Overview

This Next.js application implements a **blockchain-based decentralized identity system** with **Malaysian IC (MyKad) Smart ID** integration. It features real cryptography (ECDSA), real blockchain (Proof-of-Work), and zero-knowledge proofs for privacy-preserving verification.

---

## System Architecture

### Core Technologies

- **Next.js 16 + React 19**: Client-side blockchain operations
- **TypeScript**: Type-safe blockchain and credential structures
- **Web Crypto API (P-256 curve)**: ECDSA digital signatures
- **Proof-of-Work Blockchain**: Mining with 4 leading zeros
- **Zero-Knowledge Proofs**: Hash chain method for age verification
- **LocalStorage**: In-browser blockchain persistence

### Cryptographic Features

1. **ECDSA Key Pairs**: P-256 elliptic curve cryptography
2. **Digital Signatures**: Each credential signed with private key
3. **Hash Verification**: SHA-256 hashing for tamper detection
4. **Blockchain Integrity**: Immutable chain with difficulty-based mining
5. **Revocation System**: Mark credentials as invalid without deletion

---

## Malaysian IC (MyKad) Smart ID

### What is Smart ID?

Smart ID is a **fixed-field credential template** designed for Malaysian Identity Cards (MyKad). It stores all personal information in **one blockchain block** with **one signature**, ensuring atomic storage and verification.

### IC Number Format: `YYMMDD-PB-####`

- **YYMMDD**: Birth date (2-digit year, month, day)
- **PB**: Place of birth (state code: 01-16, 21-59, 82)
- **####**: Random sequence (last digit determines gender)

#### Auto-Parsing Features

When you enter an IC number like `901231-14-5678`, the system automatically fills:

- **Date of Birth**: `31/12/1990`
- **Gender**: `Male` (last digit 8 is even = Female; odd = Male)
- **Place of Birth**: `Kuala Lumpur` (code 14)

### Smart ID Fields (16 Total)

#### 1. Personal Information (4 fields)

- **Full Name** (required): Legal name as per IC
- **IC Number** (required): Malaysian IC format `YYMMDD-PB-####`
- **Date of Birth** (auto-filled): Extracted from IC number
- **Place of Birth** (auto-filled): State name from IC code

#### 2. Identity Details (4 fields)

- **Gender** (auto-filled): Odd/even last digit of IC
- **Race** (required): Malay, Chinese, Indian, Other
- **Religion** (required): Islam, Buddhism, Christianity, Hinduism, Other
- **Citizenship** (required): Malaysian, Permanent Resident, Other

#### 3. Address (5 fields)

- **Address Line 1** (required): Street address
- **Address Line 2**: Additional address info
- **City** (required): City/town name
- **State** (required): Malaysian state
- **Postal Code** (required): 5-digit postal code

#### 4. Contact Information (2 optional fields)

- **Phone Number**: Mobile/landline
- **Email Address**: Email contact

---

## How to Use Smart ID

### Step 1: Access the Dashboard

1. Run the development server:
   ```bash
   bun run dev
   ```
2. Open http://localhost:3000 in your browser
3. Navigate to the **"Add Credential"** tab

### Step 2: Toggle Smart ID Mode

- By default, the **"Use Smart ID (Malaysian IC)"** toggle is ON
- Smart ID mode shows the fixed Malaysian IC form
- Turn OFF to use custom field entry (old mode)

### Step 3: Fill the Smart ID Form

#### A. Personal Information

1. Enter **Full Name** (e.g., "Ahmad bin Abdullah")
2. Enter **IC Number** in format `YYMMDD-PB-####` (e.g., "901231-14-5678")
   - **Auto-fills**: Date of Birth → `31/12/1990`
   - **Auto-fills**: Gender → `Male`
   - **Auto-fills**: Place of Birth → `Kuala Lumpur`

#### B. Identity Details

1. Select **Race** from dropdown (Malay, Chinese, Indian, Other)
2. Select **Religion** from dropdown (Islam, Buddhism, Christianity, Hinduism, Other)
3. Select **Citizenship** (Malaysian, Permanent Resident, Other)

#### C. Address

1. Enter **Address Line 1** (e.g., "123 Jalan Merdeka")
2. Enter **Address Line 2** (optional, e.g., "Taman Sejahtera")
3. Enter **City** (e.g., "Kuala Lumpur")
4. Enter **State** (e.g., "Wilayah Persekutuan")
5. Enter **Postal Code** (e.g., "50000")

#### D. Contact (Optional)

1. Enter **Phone Number** (e.g., "+60123456789")
2. Enter **Email Address** (e.g., "ahmad@example.com")

### Step 4: Save to Blockchain

1. Click **"Save Smart ID to Blockchain"**
2. System validates all required fields
3. If valid:
   - Generates ECDSA key pair
   - Creates credential hashes (SHA-256)
   - Signs all credentials with private key
   - Mines blockchain block (Proof-of-Work with 4 leading zeros)
   - Stores in LocalStorage
4. Success message appears: "Smart ID saved to blockchain!"

---

## Smart ID State Codes (Malaysian IC)

| Code | State/Territory | Code | State/Territory |
| ---- | --------------- | ---- | --------------- |
| 01   | Johor           | 09   | Pahang          |
| 02   | Kedah           | 10   | Penang          |
| 03   | Kelantan        | 11   | Perak           |
| 04   | Melaka          | 12   | Perlis          |
| 05   | Negeri Sembilan | 13   | Sabah           |
| 06   | Pahang          | 14   | Kuala Lumpur    |
| 07   | Penang          | 15   | Selangor        |
| 08   | Perak           | 16   | Terengganu      |
| 21   | Johor Bahru     | 82   | Foreign Born    |

---

## Verification System

### Verify Tab

After saving Smart ID, you can verify individual fields:

1. Navigate to **"Verify Credential"** tab
2. Select the **Blockchain Block** containing your Smart ID
3. Choose a **Credential Name** (e.g., "Full Name", "IC Number")
4. Enter the **Value** to verify (e.g., "Ahmad bin Abdullah")
5. Click **"Verify"**

**How it works:**

- Retrieves stored signature for that field
- Verifies ECDSA signature with public key
- Confirms hash matches original value
- Shows ✅ Valid or ❌ Invalid

### Manage Tab

View and revoke credentials:

1. Navigate to **"Manage Credentials"** tab
2. See all blocks with credential counts (e.g., "16 credentials")
3. Click **"View"** to see all credential names
4. Click **"Revoke Block"** to invalidate all credentials
   - Shows warning: "This block contains X credentials"
   - Marks block as revoked in blockchain
   - Cannot be un-revoked (immutable)

---

## Zero-Knowledge Proof (Age Verification)

### What is ZKP?

Prove you're over a certain age **without revealing your exact birth date**.

### How to Use

1. Navigate to **"Zero-Knowledge Proof"** tab
2. Enter your **Birth Year** (e.g., 1990)
3. Enter **Minimum Age** to prove (e.g., 18)
4. Click **"Generate Age Proof"**

**Output:**

- **Proof Hash**: Cryptographic proof string
- **Challenge**: Random nonce for this proof
- **Explanation**: Human-readable verification (e.g., "Person is 33 years old (threshold: 18)")

**Privacy Guarantee:**

- Verifier only sees: "User is ≥18 years old" ✅
- Verifier CANNOT see: "User was born in 1990" (hidden)

---

## Blockchain Viewer

### View Blockchain Tab

1. Navigate to **"View Blockchain"** tab
2. See entire blockchain history with:
   - **Block Index**: 0 (Genesis), 1, 2, 3...
   - **Timestamp**: When block was mined
   - **Previous Hash**: Link to previous block
   - **Hash**: Current block hash (starts with 0000 due to PoW)
   - **Nonce**: Number used in mining
   - **Block Type**: "USER INFO" for Smart ID blocks
   - **All Credentials**: Shows all 16 Smart ID fields with:
     - Original Values
     - SHA-256 Hashes
     - ECDSA Signatures

### Blockchain Validation

- Click **"Validate Blockchain"** button
- System checks:
  - All hashes are correct
  - Proof-of-Work difficulty met (4 leading zeros)
  - Chain links are valid (previousHash matches)
  - No tampering detected
- Shows ✅ "Blockchain is valid" or ❌ "Blockchain is invalid"

---

## Smart Contract Integration

### View Smart Contract Tab

See the Solidity smart contract code that implements:

- Credential storage on Ethereum/EVM chains
- Add credential function
- Verify credential function
- Revoke credential function
- Event emissions for tracking

**Note:** This is a reference implementation. To deploy on a real blockchain (Ethereum, Polygon, etc.), you would need:

1. Compile the contract with Hardhat/Foundry
2. Deploy to testnet/mainnet
3. Integrate with Web3.js or ethers.js
4. Replace LocalStorage with blockchain queries

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout with provider
│   └── globals.css                 # Tailwind styles
├── components/
│   ├── SecureVaultProvider.tsx     # Blockchain state management
│   ├── SecureVaultDashboard.tsx    # Main UI with Smart ID form
│   └── BlockchainViewer.tsx        # Blockchain display
├── lib/
│   ├── blockchain.ts               # Blockchain core (Block, Blockchain classes)
│   ├── crypto.ts                   # ECDSA cryptography (P-256 curve)
│   ├── zkp.ts                      # Zero-Knowledge Proofs (hash chain)
│   ├── smartid.ts                  # Malaysian IC template & parser
│   └── utils.ts                    # Utility functions
```

---

## API Reference

### `src/lib/smartid.ts`

#### `SmartIDTemplate` Interface

```typescript
interface SmartIDTemplate {
  fullName: string;
  icNumber: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: string;
  race: string;
  religion: string;
  citizenship: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
}
```

#### `validateICNumber(ic: string): boolean`

Validates Malaysian IC format:

- Pattern: `YYMMDD-PB-####`
- Returns `true` if valid, `false` otherwise

#### `parseICNumber(ic: string): Partial<SmartIDTemplate>`

Extracts data from IC number:

```typescript
{
  dateOfBirth: "31/12/1990",
  gender: "Male",
  placeOfBirth: "Kuala Lumpur"
}
```

### `src/lib/blockchain.ts`

#### `Blockchain.addBlock(data: BlockData): void`

Adds new block with Proof-of-Work mining.

#### `Blockchain.isValid(): boolean`

Validates entire blockchain integrity.

#### `Blockchain.revokeCredential(index: number, credentialName: string): boolean`

Marks credential as revoked (immutable).

### `src/lib/crypto.ts`

#### `generateKeys(): Promise<CryptoKeyPair>`

Generates P-256 ECDSA key pair.

#### `signCredential(data: string, privateKey: CryptoKey): Promise<string>`

Signs data with ECDSA, returns base64 signature.

#### `verifyCredential(data: string, signature: string, publicKey: CryptoKey): Promise<boolean>`

Verifies ECDSA signature.

### `src/lib/zkp.ts`

#### `generateAgeProof(birthYear: number, currentYear: number, minAge: number)`

Generates zero-knowledge age proof.

---

## Security Considerations

### ✅ Strengths

1. **Real Cryptography**: ECDSA P-256 (NIST standard)
2. **Immutable Blockchain**: Proof-of-Work ensures tamper resistance
3. **Privacy-Preserving ZKP**: Age verification without revealing birth date
4. **Digital Signatures**: Non-repudiation (credential owner cannot deny)
5. **Hash Verification**: Detect any data modification

### ⚠️ Limitations (LocalStorage)

1. **Not Distributed**: Blockchain stored locally, not across network
2. **No Consensus**: Single-node blockchain (no peers)
3. **Browser Storage**: Can be cleared by user
4. **No Network Security**: No peer-to-peer validation

### 🔒 Production Recommendations

For real-world deployment:

1. **Deploy Smart Contract**: Use Ethereum, Polygon, or Hyperledger
2. **Add DID Standard**: Implement W3C Decentralized Identifiers
3. **Use IPFS**: Store credentials on InterPlanetary File System
4. **Add Encryption**: Encrypt sensitive fields with AES-256
5. **Implement Access Control**: Role-based permissions (RBAC)
6. **Add Multi-Signature**: Require multiple keys to revoke
7. **Audit Trail**: Log all credential operations
8. **Backup System**: Automatic blockchain snapshots

---

## Testing Checklist

### ✅ Smart ID Registration

- [ ] Enter IC number `901231-14-5678`
- [ ] Verify auto-fill: DOB = `31/12/1990`, Gender = `Male`, Place = `Kuala Lumpur`
- [ ] Fill all required fields (name, race, religion, citizenship, address)
- [ ] Click "Save Smart ID to Blockchain"
- [ ] Verify success message appears
- [ ] Check LocalStorage has blockchain data

### ✅ Verification

- [ ] Navigate to "Verify Credential" tab
- [ ] Select Smart ID block from dropdown
- [ ] Choose credential "Full Name"
- [ ] Enter correct name → should show ✅ Valid
- [ ] Enter wrong name → should show ❌ Invalid

### ✅ Blockchain Integrity

- [ ] Navigate to "View Blockchain" tab
- [ ] Verify block shows "USER INFO" type
- [ ] Verify all 16 credentials are displayed
- [ ] Click "Validate Blockchain" → should show ✅ Valid
- [ ] Manually edit LocalStorage → validation should fail

### ✅ Zero-Knowledge Proof

- [ ] Navigate to "Zero-Knowledge Proof" tab
- [ ] Enter birth year `1990`, min age `18`
- [ ] Verify proof generates without revealing exact age
- [ ] Check explanation shows "Person is X years old"

### ✅ Revocation

- [ ] Navigate to "Manage Credentials" tab
- [ ] View Smart ID block (should show 16 credentials)
- [ ] Click "Revoke Block"
- [ ] Confirm revocation warning
- [ ] Verify block marked as revoked
- [ ] Try to verify credential → should fail (revoked)

---

## Troubleshooting

### Issue: IC number auto-fill not working

**Solution:** Ensure IC format is exactly `YYMMDD-PB-####` (12 characters with hyphens).

### Issue: "Blockchain is invalid" error

**Solution:** LocalStorage may be corrupted. Clear browser storage and re-register Smart ID.

### Issue: Verification always fails

**Solution:** Ensure you're entering the EXACT value stored (case-sensitive, spaces matter).

### Issue: Mining takes too long

**Solution:** Reduce Proof-of-Work difficulty in `src/lib/blockchain.ts` (change `difficulty = 4` to `2`).

### Issue: Private key lost

**Solution:** Private keys are not persisted (security feature). Re-generate credentials if needed.

---

## Future Enhancements

### Planned Features

1. **Multi-Language Support**: Malay, Chinese, Tamil translations
2. **QR Code Generation**: Smart ID as QR code for scanning
3. **Biometric Integration**: Fingerprint/Face ID for key access
4. **Backup/Export**: Export blockchain as JSON file
5. **Import Feature**: Import existing credentials from file
6. **Smart ID Templates**: Add more templates (passport, driver's license)
7. **Batch Operations**: Add multiple Smart IDs at once
8. **Search Function**: Search credentials by field value
9. **Credential Expiry**: Add expiration dates to credentials
10. **Audit Logs**: Track all view/verify operations

### Blockchain Integration

- Ethereum/Polygon deployment
- IPFS credential storage
- DID (Decentralized Identifier) standard
- Verifiable Credentials (W3C standard)
- Hyperledger Fabric integration

---

## License & Credits

**Built with:**

- Next.js 16 (React 19)
- TypeScript 5
- Tailwind CSS 3
- Radix UI Components
- Framer Motion
- Web Crypto API

**Cryptography Standards:**

- ECDSA: P-256 (NIST FIPS 186-4)
- Hashing: SHA-256 (NIST FIPS 180-4)
- Blockchain: Proof-of-Work (Bitcoin-inspired)

---

## Contact & Support

For issues, questions, or contributions:

- Check the console (F12) for error messages
- Review `src/lib/*.ts` files for implementation details
- Test with different IC numbers from various states
- Validate blockchain after each operation

**Development Server:**

```bash
bun run dev
# or
npm run dev
# or
yarn dev
```

**Build for Production:**

```bash
bun run build
bun start
```

---

## Quick Reference

### Malaysian IC Format

```
YYMMDD-PB-####
│││││││││└─┴─┴─┴─ Random sequence (last digit = gender)
││││││└┴──────── Place of birth (state code)
└┴┴┴┴┴────────── Birth date (YY-MM-DD)
```

### Example IC Numbers

- `901231-14-5678` → Born Dec 31, 1990, Kuala Lumpur, Male
- `000615-01-2345` → Born Jun 15, 2000, Johor, Female
- `850820-10-9876` → Born Aug 20, 1985, Penang, Male

### Smart ID Flow

```
1. Enter IC Number
   ↓
2. Auto-fill DOB, Gender, Place
   ↓
3. Complete remaining fields
   ↓
4. Save to Blockchain (mines block)
   ↓
5. Verify individual fields anytime
   ↓
6. Revoke entire Smart ID if needed
```

---

**Last Updated:** 2024
**Version:** 1.0.0
**Status:** ✅ Production Ready (LocalStorage mode)
