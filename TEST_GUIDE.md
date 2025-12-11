# Quick Test Guide - User Identification Fix

## 🧪 Test the Fix

The application is running at: **http://localhost:3000**

### Test 1: Register Multiple Users

#### User 1 - Ahmad

1. Click "Initialize SecureVault"
2. Fill Smart ID form:
   - Full Name: `Ahmad bin Abdullah`
   - IC Number: `901231-14-5678`
   - (Other fields will auto-fill)
   - Fill remaining required fields (race, religion, etc.)
3. Click "Register Smart ID on Blockchain"
4. See success message ✅

#### User 2 - Siti

1. Fill another Smart ID:
   - Full Name: `Siti Nurhaliza`
   - IC Number: `850615-10-2345`
   - Fill remaining fields
2. Click "Register Smart ID on Blockchain"
3. See success message ✅

#### User 3 - Lee

1. Fill another Smart ID:
   - Full Name: `Lee Wei Ming`
   - IC Number: `920820-07-9876`
   - Fill remaining fields
2. Click "Register Smart ID on Blockchain"
3. See success message ✅

---

### Test 2: Verify Tab - User Identification

1. Go to **"Verify"** tab
2. Click the dropdown "Select credential to verify..."

**Expected Result:**

```
📋 Ahmad bin Abdullah (901231-14-5678)
   - fullName
   - icNumber
   - dateOfBirth
   - placeOfBirth
   - gender
   ...

📋 Siti Nurhaliza (850615-10-2345)
   - fullName
   - icNumber
   - dateOfBirth
   ...

📋 Lee Wei Ming (920820-07-9876)
   - fullName
   - icNumber
   ...
```

3. Select **Ahmad's group** → Choose `fullName`
4. Enter value: `Ahmad bin Abdullah`
5. Click "Verify Signature"

**Expected:** ✅ **VERIFIED ✓** (green)

6. Now try entering Siti's name: `Siti Nurhaliza`
7. Click "Verify Signature"

**Expected:** ❌ **INVALID ✗** (red) - Because you selected Ahmad's fullName but entered Siti's value!

---

### Test 3: Manage Tab - Card-Based UI

1. Go to **"Manage Credentials"** tab

**Expected Result:**

```
┌────────────────────────────────────────┐
│ 💳 Ahmad bin Abdullah (901231-14-5678) │
│ Block #1 • 16 credentials               │
│                                         │
│ ▼ View all 16 credentials               │
│                                         │
│                         [Revoke Smart ID]│
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 💳 Siti Nurhaliza (850615-10-2345)     │
│ Block #2 • 16 credentials               │
│                                         │
│ ▼ View all 16 credentials               │
│                                         │
│                         [Revoke Smart ID]│
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 💳 Lee Wei Ming (920820-07-9876)       │
│ Block #3 • 16 credentials               │
│                                         │
│ ▼ View all 16 credentials               │
│                                         │
│                         [Revoke Smart ID]│
└────────────────────────────────────────┘
```

2. Click **"View all 16 credentials"** on Ahmad's card
3. See expandable list of all fields:
   ```
   • fullName
   • icNumber
   • dateOfBirth
   • placeOfBirth
   • gender
   • race
   • religion
   • citizenship
   • addressLine1
   • addressLine2
   • postcode
   • city
   • state
   • phoneNumber
   • email
   ```

---

### Test 4: Revoke Specific User

1. Still in **"Manage"** tab
2. Click **"Revoke Smart ID"** button on **Ahmad's card**

**Expected Warning:**

```
⚠️ Revoke entire Smart ID for Ahmad bin Abdullah (901231-14-5678)?

This will permanently revoke ALL 16 credentials in Block #1!

This action CANNOT be undone.
```

3. Click **OK** to confirm
4. Ahmad's card should now show:

   ```
   ⚠️ REVOKED (red badge)
   [Revoke Smart ID] button disabled
   ```

5. Siti and Lee's cards remain **ACTIVE** ✅

---

### Test 5: Blockchain Viewer

1. Go to **"View Blockchain"** tab
2. Scroll to **Block #1** (Ahmad's Smart ID)

**Expected Display:**

```
Block #1 - USER INFO

User: Ahmad bin Abdullah (901231-14-5678)
────────────────────────────────────────
User Information (16 fields)

Field: FULLNAME
Original Value: Ahmad bin Abdullah
Hashed Value: a1b2c3d4e5f6...
Signature: x7y8z9w...

Field: ICNUMBER
Original Value: 901231-14-5678
Hashed Value: (double-hashed for security)
Signature: ...

... (14 more fields)
```

3. Scroll to **Block #2** (Siti's Smart ID)

**Expected:** Same format with Siti's information

---

### Test 6: Cross-User Verification (Should Fail)

1. Go to **"Verify"** tab
2. Select **Siti's group** → Choose `fullName`
3. Enter Ahmad's name: `Ahmad bin Abdullah`
4. Click "Verify"

**Expected:** ❌ **INVALID ✗**

_Reason: You're trying to verify Ahmad's name against Siti's credential!_

5. Now enter correct value: `Siti Nurhaliza`
6. Click "Verify"

**Expected:** ✅ **VERIFIED ✓**

---

### Test 7: Check LocalStorage Persistence

1. Open Browser DevTools (F12)
2. Go to **Application** tab → **Local Storage** → `http://localhost:3000`
3. Find key: `securevault-blockchain`
4. Click to view value

**Expected JSON Structure:**

```json
[
  {
    "index": 0,
    "data": "Genesis Identity Vault",
    ...
  },
  {
    "index": 1,
    "data": {
      "credentials": [...],
      "userIdentifier": "Ahmad bin Abdullah (901231-14-5678)"
    },
    ...
  },
  {
    "index": 2,
    "data": {
      "credentials": [...],
      "userIdentifier": "Siti Nurhaliza (850615-10-2345)"
    },
    ...
  }
]
```

5. Refresh page (F5)
6. All data should persist ✅

---

## ✅ Success Criteria

- [ ] Can register multiple Smart IDs
- [ ] Verify tab groups credentials by user
- [ ] Manage tab shows one card per user
- [ ] Can verify specific user's credentials
- [ ] Cross-user verification correctly fails
- [ ] Can revoke specific user's Smart ID
- [ ] Blockchain viewer shows user identifiers
- [ ] Data persists across page refreshes
- [ ] No console errors (F12 → Console)

---

## 🐛 Troubleshooting

### Issue: Dropdown shows flat list, not grouped

**Solution:** Clear browser cache and LocalStorage, refresh page

### Issue: User identifier shows "Block #X" instead of name

**Solution:** Ensure you registered AFTER the fix (old blocks don't have userIdentifier)

### Issue: Can't see multiple users

**Solution:** Make sure you clicked "Register Smart ID" for each user (3 separate registrations)

### Issue: Verification always fails

**Solution:** Make sure you select the correct user group AND enter exact value (case-sensitive!)

---

## 🎉 What Changed vs Before

### Before (Problem):

```
Verify Tab:
- fullName [which user???]
- fullName [duplicate, confusing!]
- fullName [which is which???]

Manage Tab:
- fullName (Block #1) [Revoke]
- icNumber (Block #1) [Revoke]
- dateOfBirth (Block #1) [Revoke]
- fullName (Block #2) [Revoke]  ← Same name, different user!
- icNumber (Block #2) [Revoke]
... 48 confusing rows for 3 users!
```

### After (Fixed):

```
Verify Tab:
📋 Ahmad bin Abdullah (901231-14-5678)
   - fullName
   - icNumber
   ...
📋 Siti Nurhaliza (850615-10-2345)
   - fullName
   - icNumber
   ...

Manage Tab:
💳 Ahmad bin Abdullah (901231-14-5678)
   Block #1 • 16 credentials [Revoke Smart ID]

💳 Siti Nurhaliza (850615-10-2345)
   Block #2 • 16 credentials [Revoke Smart ID]

💳 Lee Wei Ming (920820-07-9876)
   Block #3 • 16 credentials [Revoke Smart ID]
```

**Much cleaner and clearer! 🎯**
