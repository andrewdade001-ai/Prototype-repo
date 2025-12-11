"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Blockchain, Block, BlockData } from "@/lib/blockchain";
import {
  generateKeys,
  createCredentialData,
  verifyCredential,
  KeyPair,
  CredentialData,
} from "@/lib/crypto";
import { generateAgeProof, verifyAgeProof, AgeProof } from "@/lib/zkp";

interface SecureVaultContextType {
  blockchain: Blockchain;
  keyPair: KeyPair | null;
  credentials: Map<string, { index: number; attribute: string }>;
  initialized: boolean;
  initializeVault: () => Promise<void>;
  addCredential: (
    attribute: string,
    value: string,
    doubleHash?: boolean
  ) => Promise<Block>;
  addMultipleCredentials: (
    credentials: Array<{
      attribute: string;
      value: string;
      doubleHash?: boolean;
    }>,
    userIdentifier?: string
  ) => Promise<Block>;
  revokeCredential: (index: number) => Block;
  verifyCredentialValue: (attribute: string, value: string) => Promise<boolean>;
  getCredentialBlock: (attribute: string) => Block | null;
  generateZKPAgeProof: (actualAge: number, minAge: number) => AgeProof;
  verifyZKPAgeProof: (
    proof: string,
    encryptedAge: string,
    minAge: number
  ) => boolean;
  isChainValid: () => boolean;
  getAllBlocks: () => Block[];
}

const SecureVaultContext = createContext<SecureVaultContextType | undefined>(
  undefined
);

export function SecureVaultProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [blockchain] = useState(() => new Blockchain());
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [credentials, setCredentials] = useState<
    Map<string, { index: number; attribute: string }>
  >(new Map());
  const [initialized, setInitialized] = useState(false);

  const initializeVault = async () => {
    if (initialized) return;

    const keys = await generateKeys();
    setKeyPair(keys);
    setInitialized(true);

    // Load from localStorage if available
    const saved = localStorage.getItem("securevault-blockchain");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        blockchain.chain = parsed;

        // Rebuild credentials map
        const credMap = new Map<string, { index: number; attribute: string }>();
        parsed.forEach((block: Block, index: number) => {
          if (!blockchain.isCredentialRevoked(index)) {
            if (typeof block.data === "object" && "attribute" in block.data) {
              // Single credential (legacy)
              credMap.set(block.data.attribute, {
                index,
                attribute: block.data.attribute,
              });
            } else if (
              typeof block.data === "object" &&
              "credentials" in block.data
            ) {
              // Multiple credentials in one block
              block.data.credentials.forEach((cred) => {
                credMap.set(cred.attribute, {
                  index,
                  attribute: cred.attribute,
                });
              });
            }
          }
        });
        setCredentials(credMap);
      } catch (error) {
        console.error("Error loading blockchain from storage:", error);
      }
    }
  };

  const saveToStorage = () => {
    localStorage.setItem(
      "securevault-blockchain",
      JSON.stringify(blockchain.chain)
    );
  };

  const addCredential = async (
    attribute: string,
    value: string,
    doubleHash: boolean = false
  ): Promise<Block> => {
    if (!keyPair) throw new Error("Vault not initialized");

    const credData = await createCredentialData(
      attribute,
      value,
      keyPair.privateKey,
      doubleHash
    );
    const block = blockchain.addBlock(credData);

    // Update credentials map
    setCredentials((prev) => {
      const newMap = new Map(prev);
      newMap.set(attribute, { index: block.index, attribute });
      return newMap;
    });

    saveToStorage();
    return block;
  };

  const addMultipleCredentials = async (
    credentialsList: Array<{
      attribute: string;
      value: string;
      doubleHash?: boolean;
    }>,
    userIdentifier?: string
  ): Promise<Block> => {
    if (!keyPair) throw new Error("Vault not initialized");

    // Create credential data for all fields
    const credentialsData = await Promise.all(
      credentialsList.map(async ({ attribute, value, doubleHash = false }) => {
        const credData = await createCredentialData(
          attribute,
          value,
          keyPair.privateKey,
          doubleHash
        );
        return { ...credData, value }; // Keep original value for display
      })
    );

    // Create a block with multiple credentials and optional user identifier
    const blockData: BlockData = {
      credentials: credentialsData,
      ...(userIdentifier && { userIdentifier }), // Add userIdentifier if provided
    };
    const block = blockchain.addBlock(blockData);

    // Update credentials map
    setCredentials((prev) => {
      const newMap = new Map(prev);
      credentialsList.forEach(({ attribute }) => {
        newMap.set(attribute, { index: block.index, attribute });
      });
      return newMap;
    });

    saveToStorage();
    return block;
  };

  const revokeCredential = (index: number): Block => {
    const block = blockchain.revokeCredential(index);

    // Update credentials map to remove revoked credential(s)
    setCredentials((prev) => {
      const newMap = new Map(prev);
      const revokedBlock = blockchain.getCredentialBlock(index);
      if (revokedBlock && typeof revokedBlock.data === "object") {
        // Handle single credential (legacy)
        if ("attribute" in revokedBlock.data) {
          newMap.delete(revokedBlock.data.attribute);
        }
        // Handle multiple credentials
        else if ("credentials" in revokedBlock.data) {
          revokedBlock.data.credentials.forEach((cred) => {
            newMap.delete(cred.attribute);
          });
        }
      }
      return newMap;
    });

    saveToStorage();
    return block;
  };

  const verifyCredentialValue = async (
    attribute: string,
    value: string
  ): Promise<boolean> => {
    if (!keyPair) return false;

    const credInfo = credentials.get(attribute);
    if (!credInfo) return false;

    const block = blockchain.getCredentialBlock(credInfo.index);
    if (!block || typeof block.data !== "object") {
      return false;
    }

    // Handle single credential block (legacy)
    if ("signature" in block.data) {
      return await verifyCredential(
        keyPair.publicKey,
        value,
        block.data.signature
      );
    }

    // Handle multiple credentials block
    if ("credentials" in block.data) {
      const cred = block.data.credentials.find(
        (c) => c.attribute === attribute
      );
      if (!cred) return false;
      return await verifyCredential(keyPair.publicKey, value, cred.signature);
    }

    return false;
  };

  const getCredentialBlock = (attribute: string): Block | null => {
    const credInfo = credentials.get(attribute);
    if (!credInfo) return null;
    return blockchain.getCredentialBlock(credInfo.index);
  };

  const generateZKPAgeProof = (actualAge: number, minAge: number): AgeProof => {
    return generateAgeProof(actualAge, minAge);
  };

  const verifyZKPAgeProof = (
    proof: string,
    encryptedAge: string,
    minAge: number
  ): boolean => {
    return verifyAgeProof(proof, encryptedAge, minAge);
  };

  const isChainValid = (): boolean => {
    return blockchain.isValid();
  };

  const getAllBlocks = (): Block[] => {
    return blockchain.chain;
  };

  return (
    <SecureVaultContext.Provider
      value={{
        blockchain,
        keyPair,
        credentials,
        initialized,
        initializeVault,
        addCredential,
        addMultipleCredentials,
        revokeCredential,
        verifyCredentialValue,
        getCredentialBlock,
        generateZKPAgeProof,
        verifyZKPAgeProof,
        isChainValid,
        getAllBlocks,
      }}
    >
      {children}
    </SecureVaultContext.Provider>
  );
}

export function useSecureVault() {
  const context = useContext(SecureVaultContext);
  if (!context) {
    throw new Error("useSecureVault must be used within SecureVaultProvider");
  }
  return context;
}
