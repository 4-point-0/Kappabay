import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64 } from "@mysten/sui/utils";

/**
 * Creates a signer from a private key or seed
 * @param privateKeyOrSeed - Private key (base64 encoded) or seed phrase
 * @returns The Ed25519Keypair created from the private key or seed
 */
export function createSignerFromPrivateKey(
  privateKeyOrSeed: string
): Ed25519Keypair {
  try {
    // Check if input is base64 encoded private key
    if (privateKeyOrSeed.match(/^[A-Za-z0-9+/]+={0,2}$/)) {
      // Convert base64 private key to bytes
      const privateKeyBytes = fromBase64(privateKeyOrSeed);

      // Create keypair from private key bytes
      return Ed25519Keypair.fromSecretKey(privateKeyBytes);
    } else {
      // Assume it's a seed phrase and derive keypair
      return Ed25519Keypair.deriveKeypair(privateKeyOrSeed);
    }
  } catch (error) {
    console.error("Failed to create signer from private key or seed:", error);
    throw new Error("Invalid private key or seed format");
  }
}
