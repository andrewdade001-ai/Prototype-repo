# User Identification Fix - Smart ID System

## Problem Identified

When multiple users registered their Smart IDs, the system couldn't distinguish between them in the **Verify** and **Manage** tabs. All credentials were stored with just the field name as the key (e.g., "fullName", "icNumber"), making it impossible to know which user you were verifying or managing.

## Solution Implemented

### 1. **Added User Identifier to Blockchain**

- Updated `BlockData` type in `blockchain.ts` to include optional `userIdentifier` field
- Format: `"Ahmad bin Abdullah (901231-14-5678)"`
- Combines full name + IC number for unique identification

```typescript
export type BlockData =
  | string
  | { revocation: string }
  | { attribute: string; hashed_value: string; signature: string }
  | {
      credentials: Array<{...}>;
      userIdentifier?: string; // NEW: User identification
    };
```

### 2. **Updated Smart ID Registration**

When saving a Smart ID, the system now:

1. Creates a unique identifier: `${fullName} (${icNumber})`
2. Passes it to `addMultipleCredentials()` function
3. Stores it in the blockchain block's data

**Example:**

- User: Ahmad bin Abdullah
- IC: 901231-14-5678
- Identifier: `"Ahmad bin Abdullah (901231-14-5678)"`

### 3. **Enhanced Verify Tab**

The Verify tab now groups credentials by user:

**Before:**

```
Select attribute...
- fullName
- icNumber
- dateOfBirth
- ...
```

**After:**

```
Select credential to verify...
📋 Ahmad bin Abdullah (901231-14-5678)
   - fullName
   - icNumber
   - dateOfBirth
   - ...
📋 Siti Nurhaliza (850615-10-2345)
   - fullName
   - icNumber
   - ...
```

**Features:**

- Credentials grouped by block/user using `<optgroup>` tags
- Shows user name and IC number as group header
- Each credential clearly belongs to a specific user
- Fallback: If no userIdentifier stored, extracts from fullName + icNumber fields

### 4. **Enhanced Manage Tab**

The Manage tab now displays as cards grouped by user:

**Before:**

```
fullName                [Revoke]
Block #1 (Part of 16 fields)

icNumber               [Revoke]
Block #1 (Part of 16 fields)
...
```

**After:**

```
┌─────────────────────────────────────────────────┐
│ 💳 Ahmad bin Abdullah (901231-14-5678)         │
│ Block #1 • 16 credentials                       │
│ [Revoke Smart ID]                               │
│                                                  │
│ ▼ View all 16 credentials                       │
│   • fullName                                     │
│   • icNumber                                     │
│   • dateOfBirth                                  │
│   ...                                            │
└─────────────────────────────────────────────────┘
```

**Features:**

- Single card per user/block (not 16 separate entries)
- Shows user identifier prominently with 💳 icon
- Displays total credential count
- Collapsible details to view all fields
- Clear warning when revoking: "Revoke entire Smart ID for [User]?"
- Revokes ALL credentials for that user in one action

### 5. **Updated Blockchain Viewer**

The blockchain viewer now shows user identification:

**Block Display:**

```
Block #1 - USER INFO

User: Ahmad bin Abdullah (901231-14-5678)
────────────────────────────────────────
User Information (16 fields)

Field: FULLNAME
Original Value: Ahmad bin Abdullah
Hashed Value: a1b2c3...
Signature: x7y8z9...

Field: ICNUMBER
Original Value: 901231-14-5678
...
```

## Files Modified

### 1. `src/lib/blockchain.ts`

- Added `userIdentifier?: string` to multi-credential BlockData type

### 2. `src/components/SecureVaultProvider.tsx`

- Updated `addMultipleCredentials()` signature to accept `userIdentifier` parameter
- Modified implementation to store userIdentifier in block data

### 3. `src/components/SecureVaultDashboard.tsx`

- **handleSaveSmartID**: Creates userIdentifier from fullName + icNumber
- **Verify Tab**: Groups credentials by user with optgroup headers
- **Manage Tab**: Shows card-based UI grouped by user/block

### 4. `src/components/BlockchainViewer.tsx`

- Displays userIdentifier prominently in multi-credential blocks

## How It Works

### Registration Flow:

```
1. User fills Smart ID form
   ├─ Full Name: "Ahmad bin Abdullah"
   └─ IC Number: "901231-14-5678"

2. System creates identifier
   └─ userIdentifier = "Ahmad bin Abdullah (901231-14-5678)"

3. Saves to blockchain
   └─ Block with 16 credentials + userIdentifier

4. Block stored with metadata
   {
     credentials: [...16 fields...],
     userIdentifier: "Ahmad bin Abdullah (901231-14-5678)"
   }
```

### Verification Flow:

```
1. User selects from dropdown
   └─ Grouped by: "Ahmad bin Abdullah (901231-14-5678)"

2. Choose specific field
   └─ e.g., "fullName" or "icNumber"

3. Enter value to verify
   └─ System verifies against that specific user's data

4. Result: ✅ Valid or ❌ Invalid
```

### Management Flow:

```
1. View all registered users as cards
   └─ Each card = one Smart ID block

2. Click "View all X credentials"
   └─ Expands to show all field names

3. Click "Revoke Smart ID"
   └─ Warning: "Revoke entire Smart ID for [User]?"
   └─ Confirms user knows they're revoking ALL 16 fields

4. Revoked Smart ID marked with ⚠️ REVOKED badge
```

## Benefits

### ✅ **Clear User Identification**

- No confusion about which user's data you're working with
- Name + IC number provides unique, human-readable identifier

### ✅ **Better UX in Verify Tab**

- Grouped credentials by user
- Easy to find specific user's fields
- Visual hierarchy with optgroup headers

### ✅ **Better UX in Manage Tab**

- Single card per user (not 16 duplicate-looking rows)
- Cleaner interface
- Expandable details for field listing
- Clear user identification

### ✅ **Blockchain Transparency**

- User identifier stored on-chain
- Visible in blockchain viewer
- Maintains data integrity

### ✅ **Backwards Compatible**

- Old blocks without userIdentifier still work
- Fallback: Extract from fullName + icNumber fields
- Graceful handling of legacy data

## Testing Scenarios

### Scenario 1: Register Multiple Users

1. Register **Ahmad bin Abdullah** (IC: 901231-14-5678)
2. Register **Siti Nurhaliza** (IC: 850615-10-2345)
3. Register **Lee Wei Ming** (IC: 920820-07-9876)

**Expected Result:**

- Verify tab shows 3 optgroups (one per user)
- Manage tab shows 3 cards (one per user)
- Each user's credentials clearly separated

### Scenario 2: Verify Specific User's Credential

1. Go to Verify tab
2. Select "Ahmad bin Abdullah (901231-14-5678)" group
3. Choose "fullName" credential
4. Enter "Ahmad bin Abdullah"

**Expected Result:**

- ✅ Verified (correct value for Ahmad's fullName)

### Scenario 3: Verify Wrong User's Data

1. Select "Ahmad bin Abdullah" group
2. Choose "fullName"
3. Enter "Siti Nurhaliza" (wrong user's name)

**Expected Result:**

- ❌ Invalid (doesn't match Ahmad's data)

### Scenario 4: Revoke One User's Smart ID

1. Go to Manage tab
2. Click "Revoke Smart ID" for Ahmad
3. Confirm warning dialog

**Expected Result:**

- Ahmad's card shows ⚠️ REVOKED
- Revoke button disabled for Ahmad
- Siti and Lee's cards remain active

### Scenario 5: View Blockchain

1. Go to Blockchain tab
2. Find Block #1 (Ahmad's Smart ID)

**Expected Result:**

- Shows "User: Ahmad bin Abdullah (901231-14-5678)"
- Displays all 16 credentials with signatures

## Edge Cases Handled

### 1. **Missing userIdentifier (Legacy Blocks)**

- System falls back to extracting fullName + icNumber from credentials array
- Still displays user-friendly identifier in UI
- No errors or crashes

### 2. **Identical Names (Different IC)**

- userIdentifier includes IC number for uniqueness
- "Ahmad bin Abdullah (901231-14-5678)" ≠ "Ahmad bin Abdullah (850101-02-1234)"
- System distinguishes correctly

### 3. **Custom Fields (Non-Smart ID)**

- Custom fields without fullName/icNumber still work
- Shows as "Block #X" if no identifying info available
- Maintains backwards compatibility

### 4. **Multiple Tabs Open**

- LocalStorage updates across tabs
- Credential lists refresh properly
- No stale data displayed

## Security Considerations

### ✅ **User Identifier is Public**

- Stored in plaintext in blockchain
- Combines full name + IC number
- **Not sensitive**: Already visible in credential values
- Used for UI convenience only

### ✅ **No Impact on Cryptography**

- Credentials still individually hashed
- Signatures remain valid
- userIdentifier is metadata, not verified data

### ✅ **Revocation Works Correctly**

- Revokes entire block (all 16 credentials)
- userIdentifier helps confirm correct user
- Prevents accidental revocation of wrong user

## Future Enhancements

### 1. **Search Functionality**

```typescript
// Search users by name or IC
const filteredUsers = users.filter((u) =>
  u.userIdentifier.toLowerCase().includes(searchQuery)
);
```

### 2. **User Profile View**

```typescript
// Click user card to see full profile
<UserProfileModal user={selectedUser} />
```

### 3. **Batch Operations**

```typescript
// Select multiple users for batch revocation
const selectedUsers = [user1, user2, user3];
revokeMultipleUsers(selectedUsers);
```

### 4. **Export User Data**

```typescript
// Export specific user's Smart ID as JSON
exportUserData(userIdentifier);
```

## Summary

The user identification fix transforms the Smart ID system from a confusing "flat list of credentials" to a **user-centric interface** where:

- Each user is clearly identified by name + IC
- Verification is scoped to specific users
- Management shows one card per user
- Blockchain maintains full transparency

This makes the system **production-ready** for handling multiple users while maintaining cryptographic security and blockchain integrity.

---

**Status**: ✅ **FIXED AND TESTED**
**Impact**: High - Critical UX improvement for multi-user scenarios
**Breaking Changes**: None - Fully backwards compatible
