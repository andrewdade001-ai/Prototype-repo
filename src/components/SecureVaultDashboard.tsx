"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSecureVault } from "./SecureVaultProvider";
import { BlockchainViewer } from "./BlockchainViewer";
import { getSolidityContract } from "@/lib/solidity";
import {
  SMART_ID_FIELDS,
  SmartIDTemplate,
  validateSmartID,
  parseICNumber,
} from "@/lib/smartid";
import {
  MalaysianZKPType,
  MalaysianZKPProof,
  proveAgeOver18,
  proveAgeOver21,
  proveAgeInRange,
  proveCitizenship,
  proveResidency,
  proveIncomeThreshold,
  proveVaccinationStatus,
  proveNoCriminalRecord,
  verifyMalaysianZKP,
  getMalaysianZKPInfo,
  generateAgeProof as generateZKPAgeProof,
  verifyAgeProof as verifyZKPAgeProof,
} from "@/lib/zkp";
import {
  CheckCircle,
  XCircle,
  Shield,
  Key,
  Plus,
  Trash2,
  Code,
  Zap,
  CreditCard,
  AlertCircle,
} from "lucide-react";

export function SecureVaultDashboard() {
  const {
    keyPair,
    initialized,
    initializeVault,
    addCredential,
    addMultipleCredentials,
    revokeCredential,
    verifyCredentialValue,
    credentials,
    generateZKPAgeProof,
    verifyZKPAgeProof,
    isChainValid,
    getAllBlocks,
    blockchain,
  } = useSecureVault();

  // Smart ID Template State
  const [smartIDData, setSmartIDData] = useState<Partial<SmartIDTemplate>>({});
  const [smartIDErrors, setSmartIDErrors] = useState<string[]>([]);
  const [useSmartID, setUseSmartID] = useState(true);

  // State for multiple fields form (legacy/custom)
  const [fields, setFields] = useState<
    Array<{ attribute: string; value: string }>
  >([{ attribute: "", value: "" }]);

  // Verify credential states
  const [verifyIC, setVerifyIC] = useState("");
  const [verifyICValid, setVerifyICValid] = useState<boolean | null>(null);
  const [verifyUserBlock, setVerifyUserBlock] = useState<{
    blockIndex: number;
    userInfo: string;
    credentials: string[];
  } | null>(null);
  const [verifyAttr, setVerifyAttr] = useState("");
  const [verifyVal, setVerifyVal] = useState("");
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);

  // Malaysian ZKP states
  const [zkpIC, setZkpIC] = useState("");
  const [zkpICValid, setZkpICValid] = useState<boolean | null>(null);
  const [zkpUserData, setZkpUserData] = useState<{
    blockIndex: number;
    userInfo: string;
    fullName: string;
    icNumber: string;
    birthYear: string;
    citizenship: string;
    state: string;
  } | null>(null);
  const [zkpType, setZkpType] = useState<MalaysianZKPType>("age_over_18");
  const [zkpGenerated, setZkpGenerated] = useState<MalaysianZKPProof | null>(
    null
  );
  const [zkpVerified, setZkpVerified] = useState<boolean | null>(null);
  const [zkpInputs, setZkpInputs] = useState({
    income: "",
    minAge: "18",
    maxAge: "65",
    threshold: "3000",
  });

  const [actualAge, setActualAge] = useState("");
  const [minAge, setMinAge] = useState("18");
  const [zkpResult, setZkpResult] = useState<{
    proof: string;
    encryptedAge: string;
    seed: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Smart ID Handlers
  const updateSmartIDField = (key: keyof SmartIDTemplate, value: string) => {
    setSmartIDData((prev) => ({ ...prev, [key]: value }));
    setSmartIDErrors([]); // Clear errors when user types
  };

  const handleICNumberChange = (icNumber: string) => {
    updateSmartIDField("icNumber", icNumber);

    // Auto-fill birth info and gender from IC
    const parsed = parseICNumber(icNumber);
    if (parsed) {
      setSmartIDData((prev) => ({
        ...prev,
        icNumber,
        dateOfBirth: `${parsed.birthDay}/${parsed.birthMonth}/${parsed.birthYear}`,
        gender: parsed.gender,
        placeOfBirth:
          parsed.birthPlace === "Unknown"
            ? prev.placeOfBirth
            : parsed.birthPlace,
      }));
    }
  };

  const handleSaveSmartID = async () => {
    // Validate Smart ID
    const validation = validateSmartID(smartIDData);
    if (!validation.isValid) {
      setSmartIDErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      // Create user identifier for this Smart ID
      const userIdentifier = `${smartIDData.fullName} (${smartIDData.icNumber})`;

      // Convert Smart ID to credentials list
      const credentialsList = SMART_ID_FIELDS.filter(
        (field) => smartIDData[field.key]
      ).map((field) => ({
        attribute: field.key,
        value: smartIDData[field.key] as string,
        doubleHash: field.doubleHash || false,
      }));

      // Add userIdentifier as metadata in the block
      await addMultipleCredentials(credentialsList, userIdentifier);

      // Reset form
      setSmartIDData({});
      setSmartIDErrors([]);
      alert("Smart ID (MyKad) saved successfully to blockchain!");
    } catch (error) {
      console.error("Error saving Smart ID:", error);
      alert("Error saving Smart ID: " + (error as Error).message);
    }
    setLoading(false);
  };

  // Legacy custom fields handlers
  const addField = () => {
    setFields([...fields, { attribute: "", value: "" }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (
    index: number,
    key: "attribute" | "value",
    value: string
  ) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    setFields(newFields);
  };

  const handleSaveAllCredentials = async () => {
    // Filter out empty fields
    const validFields = fields.filter((f) => f.attribute && f.value);
    if (validFields.length === 0) return;

    setLoading(true);
    try {
      const credentialsList = validFields.map((field) => ({
        attribute: field.attribute,
        value: field.value,
        doubleHash:
          field.attribute.toLowerCase().includes("ic") ||
          field.attribute.toLowerCase().includes("id"),
      }));

      await addMultipleCredentials(credentialsList);

      // Reset form
      setFields([{ attribute: "", value: "" }]);
      alert("User information saved successfully to blockchain!");
    } catch (error) {
      console.error("Error adding credentials:", error);
      alert("Error saving credentials: " + (error as Error).message);
    }
    setLoading(false);
  };

  const handleVerifyIC = () => {
    // Find user block by IC number
    let foundBlock: {
      blockIndex: number;
      userInfo: string;
      credentials: string[];
    } | null = null;

    Array.from(credentials.entries()).forEach(([attr, info]) => {
      if (foundBlock) return; // Already found

      const block = blockchain.getCredentialBlock(info.index);
      if (
        block &&
        typeof block.data === "object" &&
        "credentials" in block.data
      ) {
        // Check if this block contains the IC number
        const icField = block.data.credentials.find(
          (c) => c.attribute === "icNumber" && c.value === verifyIC
        );

        if (icField) {
          // Found the user!
          let userInfo = `Block #${info.index}`;
          if (block.data.userIdentifier) {
            userInfo = block.data.userIdentifier;
          } else {
            const nameField = block.data.credentials.find(
              (c) => c.attribute === "fullName"
            );
            if (nameField && icField) {
              userInfo = `${nameField.value} (${icField.value})`;
            }
          }

          // Get all credential names for this user
          const credNames: string[] = [];
          block.data.credentials.forEach((cred) => {
            if (credentials.has(cred.attribute)) {
              credNames.push(cred.attribute);
            }
          });

          foundBlock = {
            blockIndex: info.index,
            userInfo,
            credentials: credNames,
          };
        }
      }
    });

    if (foundBlock) {
      setVerifyICValid(true);
      setVerifyUserBlock(foundBlock);
      setVerifyAttr(""); // Reset field selection
      setVerifyResult(null); // Reset result
    } else {
      setVerifyICValid(false);
      setVerifyUserBlock(null);
    }
  };

  const handleResetVerifyIC = () => {
    setVerifyIC("");
    setVerifyICValid(null);
    setVerifyUserBlock(null);
    setVerifyAttr("");
    setVerifyVal("");
    setVerifyResult(null);
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const result = await verifyCredentialValue(verifyAttr, verifyVal);
      setVerifyResult(result);
    } catch (error) {
      console.error("Error verifying:", error);
      setVerifyResult(false);
    }
    setLoading(false);
  };

  const handleGenerateZKP = () => {
    try {
      const age = parseInt(actualAge);
      const min = parseInt(minAge);
      const proof = generateZKPAgeProof(age, min);
      setZkpResult(proof);
      setZkpVerified(null);
    } catch (error) {
      console.error("Error generating ZKP:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleVerifyZKP = () => {
    if (!zkpResult) return;
    const result = verifyZKPAgeProof(
      zkpResult.proof,
      zkpResult.encryptedAge,
      parseInt(minAge)
    );
    setZkpVerified(result);
  };

  // Malaysian ZKP Handlers
  const handleZkpIC = () => {
    // Find user block by IC number
    let foundUserData: {
      blockIndex: number;
      userInfo: string;
      fullName: string;
      icNumber: string;
      birthYear: string;
      citizenship: string;
      state: string;
    } | null = null;

    Array.from(credentials.entries()).forEach(([attr, info]) => {
      if (foundUserData) return; // Already found

      const block = blockchain.getCredentialBlock(info.index);
      if (
        block &&
        typeof block.data === "object" &&
        "credentials" in block.data
      ) {
        // Check if this block contains the IC number
        const icField = block.data.credentials.find(
          (c) => c.attribute === "icNumber" && c.value === zkpIC
        );

        if (icField) {
          // Found the user! Extract all relevant data
          let userInfo = `Block #${info.index}`;
          if (block.data.userIdentifier) {
            userInfo = block.data.userIdentifier;
          }

          const nameField = block.data.credentials.find(
            (c) => c.attribute === "fullName"
          );
          const dobField = block.data.credentials.find(
            (c) => c.attribute === "dateOfBirth"
          );
          const citizenshipField = block.data.credentials.find(
            (c) => c.attribute === "citizenship"
          );
          const stateField = block.data.credentials.find(
            (c) => c.attribute === "state"
          );

          // Extract birth year from date of birth (DD/MM/YYYY)
          let birthYear = "";
          if (dobField && dobField.value) {
            const parts = dobField.value.split("/");
            if (parts.length === 3) {
              birthYear = parts[2]; // YYYY
            }
          }

          foundUserData = {
            blockIndex: info.index,
            userInfo,
            fullName: nameField?.value || "",
            icNumber: icField.value || "",
            birthYear,
            citizenship: citizenshipField?.value || "",
            state: stateField?.value || "",
          };
        }
      }
    });

    if (foundUserData) {
      setZkpICValid(true);
      setZkpUserData(foundUserData);
      setZkpGenerated(null);
      setZkpVerified(null);
    } else {
      setZkpICValid(false);
      setZkpUserData(null);
    }
  };

  const handleResetZkpIC = () => {
    setZkpIC("");
    setZkpICValid(null);
    setZkpUserData(null);
    setZkpGenerated(null);
    setZkpVerified(null);
  };

  const handleGenerateMalaysianZKP = () => {
    if (!zkpUserData) return;

    try {
      let proof: MalaysianZKPProof;
      const currentYear = new Date().getFullYear();

      switch (zkpType) {
        case "age_over_18":
          proof = proveAgeOver18(parseInt(zkpUserData.birthYear), currentYear);
          break;
        case "age_over_21":
          proof = proveAgeOver21(parseInt(zkpUserData.birthYear), currentYear);
          break;
        case "age_range":
          proof = proveAgeInRange(
            parseInt(zkpUserData.birthYear),
            parseInt(zkpInputs.minAge),
            parseInt(zkpInputs.maxAge),
            currentYear
          );
          break;
        case "citizenship":
          proof = proveCitizenship(zkpUserData.citizenship);
          break;
        case "residency":
          proof = proveResidency(zkpUserData.state, zkpUserData.icNumber);
          break;
        case "income_threshold":
          proof = proveIncomeThreshold(
            parseInt(zkpInputs.income),
            parseInt(zkpInputs.threshold)
          );
          break;
        case "vaccination_status":
          proof = proveVaccinationStatus(true);
          break;
        case "no_criminal_record":
          proof = proveNoCriminalRecord(false);
          break;
        default:
          throw new Error("Unknown ZKP type");
      }

      setZkpGenerated(proof);
      setZkpVerified(null);
    } catch (error) {
      console.error("Error generating Malaysian ZKP:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleVerifyMalaysianZKP = () => {
    if (!zkpGenerated) return;

    const request = {
      type: zkpType,
      threshold: parseInt(zkpInputs.threshold),
      minValue: parseInt(zkpInputs.minAge),
      maxValue: parseInt(zkpInputs.maxAge),
    };

    const result = verifyMalaysianZKP(zkpGenerated, request);
    setZkpVerified(result);
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-purple-900 via-black to-black">
        <Card className="p-12 bg-purple-950/50 border-purple-800 text-center max-w-md">
          <Shield className="w-24 h-24 text-cyan-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-cyan-300 mb-4">
            Initialize SecureVault
          </h2>
          <p className="text-gray-400 mb-6">
            Create your cryptographic identity and start building your
            decentralized identity vault.
          </p>
          <Button
            onClick={initializeVault}
            size="lg"
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
          >
            <Key className="mr-2" /> Generate Keys & Initialize
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-black via-purple-950 to-black py-12 px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black bg-linear-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            SecureVault Dashboard
          </h1>
          <p className="text-xl text-gray-400">
            Privacy-Preserving Digital Identity System
          </p>
        </div>

        {/* Key Display */}
        <Card className="bg-linear-to-br from-purple-950/50 to-black border-purple-800 p-6">
          <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
            <Key className="w-6 h-6" /> Your Cryptographic Identity
          </h3>
          <div className="space-y-3">
            <div>
              <Label className="text-gray-400">
                Public Key (share freely):
              </Label>
              <p className="text-cyan-300 font-mono text-sm break-all mt-1">
                {keyPair?.publicKey}
              </p>
            </div>
            <div>
              <Label className="text-gray-400">
                Private Key (NEVER share):
              </Label>
              <p className="text-pink-400 font-mono text-sm break-all mt-1">
                {keyPair?.privateKey.substring(0, 16)}...
                {keyPair?.privateKey.substring(keyPair.privateKey.length - 16)}
              </p>
            </div>
          </div>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="add" className="w-full">
          <TabsList className=" grid w-full grid-cols-6 bg-purple-950/50 border border-purple-800">
            <TabsTrigger value="add" className="text-puple-400">
              Add Credential
            </TabsTrigger>
            <TabsTrigger value="verify" className="text-puple-400">
              Verify
            </TabsTrigger>
            <TabsTrigger value="manage" className="text-puple-400">
              Manage
            </TabsTrigger>
            <TabsTrigger value="zkp" className="text-puple-400">
              MyKad ZKP
            </TabsTrigger>
            <TabsTrigger value="blockchain" className="text-puple-400">
              Blockchain
            </TabsTrigger>
            <TabsTrigger value="contract" className="text-puple-400">
              Smart Contract
            </TabsTrigger>
          </TabsList>

          {/* Add Credential */}
          <TabsContent value="add">
            <Card className="bg-purple-950/30 border-purple-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-cyan-300 flex items-center gap-2">
                    <CreditCard className="w-6 h-6" /> Register Smart ID (MyKad)
                  </h3>
                  <p className="text-gray-400 mt-2">
                    Malaysian Identity Card digital registration on blockchain
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUseSmartID(!useSmartID)}
                  className="border-purple-600 text-purple-400"
                >
                  {useSmartID
                    ? "Switch to Custom Fields"
                    : "Switch to Smart ID"}
                </Button>
              </div>

              {useSmartID ? (
                // Smart ID Form
                <div className="space-y-6">
                  {smartIDErrors.length > 0 && (
                    <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-red-500 font-bold mb-2">
                            Please fix the following errors:
                          </p>
                          <ul className="list-disc list-inside text-red-400 text-sm space-y-1">
                            {smartIDErrors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-purple-300 border-b border-purple-700 pb-2">
                      Personal Information
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {SMART_ID_FIELDS.filter((f) =>
                        [
                          "fullName",
                          "icNumber",
                          "dateOfBirth",
                          "placeOfBirth",
                        ].includes(f.key)
                      ).map((field) => (
                        <div key={field.key}>
                          <Label className="text-gray-300">
                            {field.label}
                            {field.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          <Input
                            value={smartIDData[field.key] || ""}
                            onChange={(e) =>
                              field.key === "icNumber"
                                ? handleICNumberChange(e.target.value)
                                : updateSmartIDField(field.key, e.target.value)
                            }
                            placeholder={field.placeholder}
                            type={field.type === "date" ? "text" : "text"}
                            className="bg-black/50 border-purple-700 text-white"
                            disabled={
                              field.key === "dateOfBirth" &&
                              smartIDData.icNumber
                                ? true
                                : false
                            }
                          />
                          {field.key === "icNumber" && (
                            <p className="text-xs text-gray-500 mt-1">
                              Format: YYMMDD-PB-#### (Auto-fills birth info)
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Identity Details */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-purple-300 border-b border-purple-700 pb-2">
                      Identity Details
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {SMART_ID_FIELDS.filter((f) =>
                        ["gender", "race", "religion", "citizenship"].includes(
                          f.key
                        )
                      ).map((field) => (
                        <div key={field.key}>
                          <Label className="text-gray-300">
                            {field.label}
                            {field.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          {field.type === "select" ? (
                            <select
                              value={smartIDData[field.key] || ""}
                              onChange={(e) =>
                                updateSmartIDField(field.key, e.target.value)
                              }
                              className="w-full p-2 bg-black/50 border border-purple-700 rounded text-white"
                              disabled={
                                field.key === "gender" && smartIDData.icNumber
                                  ? true
                                  : false
                              }
                            >
                              <option value="">Select {field.label}</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={smartIDData[field.key] || ""}
                              onChange={(e) =>
                                updateSmartIDField(field.key, e.target.value)
                              }
                              className="bg-black/50 border-purple-700 text-white"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-purple-300 border-b border-purple-700 pb-2">
                      Address
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {SMART_ID_FIELDS.filter((f) =>
                        [
                          "addressLine1",
                          "addressLine2",
                          "postcode",
                          "city",
                          "state",
                        ].includes(f.key)
                      ).map((field) => (
                        <div
                          key={field.key}
                          className={
                            field.key === "addressLine1" ||
                            field.key === "addressLine2"
                              ? "md:col-span-2"
                              : ""
                          }
                        >
                          <Label className="text-gray-300">
                            {field.label}
                            {field.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          {field.type === "select" ? (
                            <select
                              value={smartIDData[field.key] || ""}
                              onChange={(e) =>
                                updateSmartIDField(field.key, e.target.value)
                              }
                              className="w-full p-2 bg-black/50 border border-purple-700 rounded text-white"
                            >
                              <option value="">Select {field.label}</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={smartIDData[field.key] || ""}
                              onChange={(e) =>
                                updateSmartIDField(field.key, e.target.value)
                              }
                              placeholder={field.placeholder}
                              className="bg-black/50 border-purple-700 text-white"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-purple-300 border-b border-purple-700 pb-2">
                      Contact Information (Optional)
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {SMART_ID_FIELDS.filter((f) =>
                        ["phoneNumber", "email"].includes(f.key)
                      ).map((field) => (
                        <div key={field.key}>
                          <Label className="text-gray-300">{field.label}</Label>
                          <Input
                            value={smartIDData[field.key] || ""}
                            onChange={(e) =>
                              updateSmartIDField(field.key, e.target.value)
                            }
                            placeholder={field.placeholder}
                            className="bg-black/50 border-purple-700 text-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-purple-700">
                    <p className="text-xs text-gray-500 mb-4">
                      <Shield className="w-4 h-4 inline mr-1" />
                      All fields will be cryptographically hashed and signed. IC
                      Number is double-hashed for extra security.
                    </p>
                    <Button
                      onClick={handleSaveSmartID}
                      disabled={loading}
                      className="w-full bg-linear-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold py-6 text-lg"
                    >
                      <Shield className="mr-2 w-5 h-5" /> Register Smart ID on
                      Blockchain
                    </Button>
                  </div>
                </div>
              ) : (
                // Custom Fields Form (Legacy)
                <div className="space-y-4">
                  <p className="text-gray-400 mb-6">
                    Add custom fields (advanced users only)
                  </p>
                  {fields.map((field, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-black/30 rounded-lg border border-purple-700/50"
                    >
                      <div>
                        <Label className="text-gray-300">Field Name</Label>
                        <Input
                          value={field.attribute}
                          onChange={(e) =>
                            updateField(index, "attribute", e.target.value)
                          }
                          placeholder="e.g., name, age, email, ic_number"
                          className="bg-black/50 border-purple-700 text-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-gray-300">Value</Label>
                          <Input
                            value={field.value}
                            onChange={(e) =>
                              updateField(index, "value", e.target.value)
                            }
                            placeholder="Enter the value"
                            type={
                              field.attribute.toLowerCase().includes("password")
                                ? "password"
                                : "text"
                            }
                            className="bg-black/50 border-purple-700 text-white"
                          />
                        </div>
                        {fields.length > 1 && (
                          <Button
                            onClick={() => removeField(index)}
                            variant="destructive"
                            size="icon"
                            className="mt-6"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3">
                    <Button
                      onClick={addField}
                      variant="outline"
                      className="flex-1 border-purple-600 text-purple-400 hover:bg-purple-950"
                    >
                      <Plus className="mr-2 w-4 h-4" /> Add Another Field
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-purple-700">
                    <p className="text-xs text-gray-500 mb-4">
                      All fields will be hashed and signed, then stored together
                      in one block
                    </p>
                    <Button
                      onClick={handleSaveAllCredentials}
                      disabled={
                        loading || fields.every((f) => !f.attribute || !f.value)
                      }
                      className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-6 text-lg"
                    >
                      <Shield className="mr-2 w-5 h-5" /> Save User Information
                      to Blockchain
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Verify Credential */}
          <TabsContent value="verify">
            <Card className="bg-purple-950/30 border-purple-800 p-6">
              <h3 className="text-2xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6" /> Verify Credential
              </h3>

              {!verifyUserBlock ? (
                // Step 1: Enter IC Number
                <div className="space-y-4">
                  <div className="p-4 bg-cyan-950/20 border border-cyan-700 rounded-lg">
                    <p className="text-cyan-300 text-sm">
                      <Shield className="w-4 h-4 inline mr-2" />
                      Enter the IC Number to identify the user first
                    </p>
                  </div>

                  <div>
                    <Label className="text-gray-300">IC Number</Label>
                    <Input
                      value={verifyIC}
                      onChange={(e) => {
                        setVerifyIC(e.target.value);
                        setVerifyICValid(null); // Reset validation
                      }}
                      placeholder="e.g., 901231-14-5678"
                      className="bg-black/50 border-purple-700 text-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && verifyIC) {
                          handleVerifyIC();
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: YYMMDD-PB-####
                    </p>
                  </div>

                  <Button
                    onClick={handleVerifyIC}
                    disabled={!verifyIC}
                    className="w-full bg-cyan-600 hover:bg-cyan-500"
                  >
                    Find User
                  </Button>

                  {verifyICValid === false && (
                    <div className="p-4 rounded-lg border bg-red-900/20 border-red-500">
                      <div className="flex items-center gap-2 text-red-500">
                        <XCircle className="w-6 h-6" />
                        <div>
                          <p className="font-bold">IC Number Not Found</p>
                          <p className="text-sm text-red-400 mt-1">
                            No registered Smart ID found with IC: {verifyIC}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {credentials.size === 0 && (
                    <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-center">
                      <p className="text-gray-400">
                        No credentials registered yet. Register a Smart ID
                        first.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Step 2: User found, select field to verify
                <div className="space-y-4">
                  {/* User Info Display */}
                  <div className="p-4 bg-green-950/20 border border-green-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-green-500 mb-1">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-bold">User Found</span>
                        </div>
                        <p className="text-cyan-300 text-lg font-bold">
                          {verifyUserBlock.userInfo}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Block #{verifyUserBlock.blockIndex} •{" "}
                          {verifyUserBlock.credentials.length} credentials
                        </p>
                      </div>
                      <Button
                        onClick={handleResetVerifyIC}
                        variant="outline"
                        size="sm"
                        className="border-purple-600 text-purple-400"
                      >
                        Change User
                      </Button>
                    </div>
                  </div>

                  {/* Field Selection */}
                  <div>
                    <Label className="text-gray-300">
                      Select Field to Verify
                    </Label>
                    <select
                      value={verifyAttr}
                      onChange={(e) => {
                        setVerifyAttr(e.target.value);
                        setVerifyResult(null); // Reset result
                      }}
                      className="w-full p-2 bg-black/50 border border-purple-700 rounded text-white"
                    >
                      <option value="">Choose a field...</option>
                      {verifyUserBlock.credentials.map((attr) => (
                        <option key={attr} value={attr}>
                          {attr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Value Input */}
                  <div>
                    <Label className="text-gray-300">Value to Verify</Label>
                    <Input
                      value={verifyVal}
                      onChange={(e) => setVerifyVal(e.target.value)}
                      placeholder="Enter the value to verify"
                      className="bg-black/50 border-purple-700 text-white"
                      disabled={!verifyAttr}
                    />
                  </div>

                  <Button
                    onClick={handleVerify}
                    disabled={loading || !verifyAttr || !verifyVal}
                    className="w-full bg-purple-600 hover:bg-purple-500"
                  >
                    <Shield className="mr-2 w-4 h-4" /> Verify Signature
                  </Button>

                  {/* Verification Result */}
                  {verifyResult !== null && (
                    <div
                      className={`p-4 rounded-lg border ${
                        verifyResult
                          ? "bg-green-900/20 border-green-500"
                          : "bg-red-900/20 border-red-500"
                      }`}
                    >
                      {verifyResult ? (
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle className="w-6 h-6" />
                          <div>
                            <p className="font-bold">VERIFIED ✓</p>
                            <p className="text-sm text-green-400 mt-1">
                              The value matches the signed credential for{" "}
                              {verifyAttr}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-500">
                          <XCircle className="w-6 h-6" />
                          <div>
                            <p className="font-bold">INVALID ✗</p>
                            <p className="text-sm text-red-400 mt-1">
                              The value does not match or signature is invalid
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Manage Credentials */}
          <TabsContent value="manage">
            <Card className="bg-purple-950/30 border-purple-800 p-6">
              <h3 className="text-2xl font-bold text-cyan-300 mb-4">
                Manage Credentials
              </h3>
              <div className="space-y-4">
                {(() => {
                  // Group credentials by block index
                  const blockGroups = new Map<
                    number,
                    {
                      credentials: string[];
                      isRevoked: boolean;
                      userInfo: string;
                      credCount: number;
                    }
                  >();

                  Array.from(credentials.entries()).forEach(([attr, info]) => {
                    const block = blockchain.getCredentialBlock(info.index);
                    const isRevoked = blockchain.isCredentialRevoked(
                      info.index
                    );
                    let userInfo = `Block #${info.index}`;
                    let credCount = 1;

                    if (
                      block &&
                      typeof block.data === "object" &&
                      "credentials" in block.data
                    ) {
                      credCount = block.data.credentials.length;
                      // Use stored userIdentifier if available
                      if (block.data.userIdentifier) {
                        userInfo = block.data.userIdentifier;
                      } else {
                        // Fallback: Try to find user identifying info
                        const nameField = block.data.credentials.find(
                          (c) => c.attribute === "fullName"
                        );
                        const icField = block.data.credentials.find(
                          (c) => c.attribute === "icNumber"
                        );
                        if (nameField && icField) {
                          userInfo = `${nameField.value} (${icField.value})`;
                        }
                      }
                    }

                    if (!blockGroups.has(info.index)) {
                      blockGroups.set(info.index, {
                        credentials: [],
                        isRevoked,
                        userInfo,
                        credCount,
                      });
                    }
                    blockGroups.get(info.index)!.credentials.push(attr);
                  });

                  return Array.from(blockGroups.entries()).map(
                    ([blockIndex, group]) => (
                      <div
                        key={blockIndex}
                        className="p-5 bg-black/50 rounded-lg border border-purple-700 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="w-5 h-5 text-cyan-400" />
                              <p className="text-cyan-300 font-bold text-lg">
                                {group.userInfo}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">
                              Block #{blockIndex} • {group.credCount}{" "}
                              credentials
                            </p>
                            {group.isRevoked && (
                              <span className="inline-block px-2 py-1 text-xs text-red-500 font-bold bg-red-900/20 border border-red-500 rounded">
                                ⚠️ REVOKED
                              </span>
                            )}
                          </div>
                          {!group.isRevoked && (
                            <Button
                              onClick={() => {
                                const message = `⚠️ Revoke entire Smart ID for ${group.userInfo}?\n\nThis will permanently revoke ALL ${group.credCount} credentials in Block #${blockIndex}!\n\nThis action CANNOT be undone.`;
                                if (confirm(message)) {
                                  revokeCredential(blockIndex);
                                }
                              }}
                              variant="destructive"
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Revoke Smart
                              ID
                            </Button>
                          )}
                        </div>
                        <details className="text-sm">
                          <summary className="cursor-pointer text-purple-400 hover:text-purple-300">
                            View all {group.credCount} credentials
                          </summary>
                          <ul className="mt-2 pl-4 space-y-1 text-gray-400">
                            {group.credentials.map((attr) => (
                              <li key={attr} className="text-xs">
                                • {attr}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    )
                  );
                })()}
                {credentials.size === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No credentials added yet. Go to "Add Credential" tab.
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* ZKP Demo */}
          <TabsContent value="zkp">
            <Card className="bg-purple-950/30 border-purple-800 p-6">
              <h3 className="text-2xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6" /> Malaysian IC/MyKad Zero-Knowledge
                Proofs
              </h3>

              <p className="text-gray-400 mb-6">
                Prove specific claims about your Smart ID credentials without
                revealing sensitive information
              </p>

              {!zkpUserData ? (
                // Step 1: Enter IC Number
                <div className="space-y-4">
                  <div className="p-4 bg-cyan-950/20 border border-cyan-700 rounded-lg">
                    <p className="text-cyan-300 text-sm">
                      <Shield className="w-4 h-4 inline mr-2" />
                      Enter your IC Number to load your Smart ID data for ZKP
                      generation
                    </p>
                  </div>

                  <div>
                    <Label className="text-gray-300">IC Number</Label>
                    <Input
                      value={zkpIC}
                      onChange={(e) => {
                        setZkpIC(e.target.value);
                        setZkpICValid(null); // Reset validation
                      }}
                      placeholder="e.g., 901231-14-5678"
                      className="bg-black/50 border-purple-700 text-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && zkpIC) {
                          handleZkpIC();
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: YYMMDD-PB-####
                    </p>
                  </div>

                  <Button
                    onClick={handleZkpIC}
                    disabled={!zkpIC}
                    className="w-full bg-cyan-600 hover:bg-cyan-500"
                  >
                    Load Smart ID
                  </Button>

                  {zkpICValid === false && (
                    <div className="p-4 rounded-lg border bg-red-900/20 border-red-500">
                      <div className="flex items-center gap-2 text-red-500">
                        <XCircle className="w-6 h-6" />
                        <div>
                          <p className="font-bold">IC Number Not Found</p>
                          <p className="text-sm text-red-400 mt-1">
                            No registered Smart ID found with IC: {zkpIC}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {credentials.size === 0 && (
                    <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-center">
                      <p className="text-gray-400">
                        No credentials registered yet. Register a Smart ID
                        first.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Step 2: User found, select proof type and generate
                <div className="space-y-6">
                  {/* User Info Display */}
                  <div className="p-4 bg-green-950/20 border border-green-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-green-500 mb-1">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-bold">Smart ID Loaded</span>
                        </div>
                        <p className="text-cyan-300 text-lg font-bold">
                          {zkpUserData.userInfo}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Block #{zkpUserData.blockIndex} • Data available for
                          ZKP generation
                        </p>
                      </div>
                      <Button
                        onClick={handleResetZkpIC}
                        variant="outline"
                        size="sm"
                        className="border-purple-600 text-purple-400"
                      >
                        Change User
                      </Button>
                    </div>
                  </div>

                  {/* ZKP Type Selection */}
                  <div>
                    <Label className="text-gray-300 text-lg mb-3 block">
                      Select Proof Type
                    </Label>
                    <div className="grid md:grid-cols-2 gap-3">
                      {(
                        [
                          "age_over_18",
                          "age_over_21",
                          "age_range",
                          "citizenship",
                          "residency",
                          "income_threshold",
                          "vaccination_status",
                          "no_criminal_record",
                        ] as MalaysianZKPType[]
                      ).map((type) => {
                        const info = getMalaysianZKPInfo(type);
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              setZkpType(type);
                              setZkpGenerated(null);
                              setZkpVerified(null);
                            }}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              zkpType === type
                                ? "border-cyan-500 bg-cyan-950/30"
                                : "border-purple-700 bg-black/30 hover:border-purple-500"
                            }`}
                          >
                            <p
                              className={`font-bold mb-1 ${
                                zkpType === type
                                  ? "text-cyan-300"
                                  : "text-purple-300"
                              }`}
                            >
                              {info.whatYouProve}
                            </p>
                            <p className="text-xs text-gray-500">
                              {info.realWorldUse}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="p-4 bg-linear-to-r from-purple-900/30 to-cyan-900/30 border border-purple-700 rounded-lg">
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 mb-1">✅ What You Prove:</p>
                        <p className="text-green-400 font-bold">
                          {getMalaysianZKPInfo(zkpType).whatYouProve}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">
                          🔒 What Stays Hidden:
                        </p>
                        <p className="text-cyan-400 font-bold">
                          {getMalaysianZKPInfo(zkpType).whatStaysHidden}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">🇲🇾 Real-World Use:</p>
                        <p className="text-purple-400 font-bold">
                          {getMalaysianZKPInfo(zkpType).realWorldUse}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Input Fields Based on Type */}
                  <div className="space-y-4">
                    {(zkpType === "age_over_18" ||
                      zkpType === "age_over_21" ||
                      zkpType === "age_range") && (
                      <div className="p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
                        <p className="text-purple-300 text-sm mb-2">
                          <Shield className="w-4 h-4 inline mr-2" />
                          Using birth year from your Smart ID
                        </p>
                        <p className="text-cyan-400 font-bold">
                          Birth Year: {zkpUserData.birthYear}
                        </p>
                      </div>
                    )}

                    {zkpType === "age_range" && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300">Minimum Age</Label>
                          <Input
                            type="number"
                            value={zkpInputs.minAge}
                            onChange={(e) =>
                              setZkpInputs({
                                ...zkpInputs,
                                minAge: e.target.value,
                              })
                            }
                            placeholder="18"
                            className="bg-black/50 border-purple-700 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300">Maximum Age</Label>
                          <Input
                            type="number"
                            value={zkpInputs.maxAge}
                            onChange={(e) =>
                              setZkpInputs({
                                ...zkpInputs,
                                maxAge: e.target.value,
                              })
                            }
                            placeholder="65"
                            className="bg-black/50 border-purple-700 text-white"
                          />
                        </div>
                      </div>
                    )}

                    {zkpType === "income_threshold" && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300">
                            Your Income (RM)
                          </Label>
                          <Input
                            type="number"
                            value={zkpInputs.income}
                            onChange={(e) =>
                              setZkpInputs({
                                ...zkpInputs,
                                income: e.target.value,
                              })
                            }
                            placeholder="5000"
                            className="bg-black/50 border-purple-700 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300">
                            Required Threshold (RM)
                          </Label>
                          <Input
                            type="number"
                            value={zkpInputs.threshold}
                            onChange={(e) =>
                              setZkpInputs({
                                ...zkpInputs,
                                threshold: e.target.value,
                              })
                            }
                            placeholder="3000"
                            className="bg-black/50 border-purple-700 text-white"
                          />
                        </div>
                      </div>
                    )}

                    {(zkpType === "citizenship" ||
                      zkpType === "residency" ||
                      zkpType === "vaccination_status" ||
                      zkpType === "no_criminal_record") && (
                      <div className="p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
                        <p className="text-purple-300 text-sm">
                          <Shield className="w-4 h-4 inline mr-2" />
                          This proof type uses data from your Smart ID
                        </p>
                        {zkpType === "citizenship" &&
                          zkpUserData.citizenship && (
                            <p className="text-cyan-400 font-bold mt-2">
                              Citizenship: {zkpUserData.citizenship}
                            </p>
                          )}
                        {zkpType === "residency" && zkpUserData.state && (
                          <p className="text-cyan-400 font-bold mt-2">
                            State: {zkpUserData.state}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Generate Proof Button */}
                  <Button
                    onClick={handleGenerateMalaysianZKP}
                    className="w-full bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-6"
                    disabled={
                      (zkpType === "income_threshold" &&
                        (!zkpInputs.income || !zkpInputs.threshold)) ||
                      !zkpUserData.birthYear
                    }
                  >
                    <Zap className="mr-2 w-5 h-5" /> Generate Zero-Knowledge
                    Proof
                  </Button>

                  {/* Proof Result */}
                  {zkpGenerated && (
                    <div className="space-y-4 p-5 bg-black/50 rounded-lg border border-pink-700">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
                        <div className="flex-1">
                          <p className="text-green-400 font-bold text-lg mb-2">
                            Proof Generated Successfully!
                          </p>
                          <p className="text-cyan-300 text-sm">
                            {zkpGenerated.description}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-gray-400">
                            Cryptographic Proof:
                          </Label>
                          <p className="text-pink-300 font-mono text-xs break-all mt-1 p-2 bg-black/50 rounded">
                            {zkpGenerated.proof.substring(0, 100)}...
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-400">
                            Commitment Hash:
                          </Label>
                          <p className="text-purple-300 font-mono text-xs break-all mt-1 p-2 bg-black/50 rounded">
                            {zkpGenerated.commitment}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-purple-700">
                        <Button
                          onClick={handleVerifyMalaysianZKP}
                          className="w-full bg-green-600 hover:bg-green-500"
                        >
                          <Shield className="mr-2 w-4 h-4" /> Verify Proof
                          (Verifier Side)
                        </Button>
                      </div>

                      {zkpVerified !== null && (
                        <div
                          className={`p-4 rounded-lg border ${
                            zkpVerified
                              ? "bg-green-900/20 border-green-500"
                              : "bg-red-900/20 border-red-500"
                          }`}
                        >
                          {zkpVerified ? (
                            <div className="flex items-center gap-2 text-green-500">
                              <CheckCircle className="w-6 h-6" />
                              <div>
                                <p className="font-bold">✓ PROOF VERIFIED!</p>
                                <p className="text-sm text-green-400 mt-1">
                                  {getMalaysianZKPInfo(zkpType).whatYouProve}{" "}
                                  has been proven without revealing{" "}
                                  {getMalaysianZKPInfo(
                                    zkpType
                                  ).whatStaysHidden.toLowerCase()}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-500">
                              <XCircle className="w-6 h-6" />
                              <p className="font-bold">✗ PROOF INVALID</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Blockchain Viewer */}
          <TabsContent value="blockchain">
            <BlockchainViewer
              blocks={getAllBlocks()}
              isValid={isChainValid()}
            />
          </TabsContent>

          {/* Smart Contract */}
          <TabsContent value="contract">
            <Card className="bg-purple-950/30 border-purple-800 p-6">
              <h3 className="text-2xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
                <Code className="w-6 h-6" /> Solidity Smart Contract
              </h3>
              <p className="text-gray-400 mb-4">
                Deploy this contract to Ethereum Sepolia testnet using Remix IDE
              </p>
              <pre className="bg-black p-4 rounded-lg overflow-x-auto text-xs text-green-400 border border-purple-700">
                {getSolidityContract()}
              </pre>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(getSolidityContract());
                  alert("Contract copied to clipboard!");
                }}
                className="mt-4 bg-purple-600 hover:bg-purple-500"
              >
                Copy Contract Code
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
