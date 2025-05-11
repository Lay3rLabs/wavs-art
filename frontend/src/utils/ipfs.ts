import { CID } from 'multiformats/cid';
import { base32 } from 'multiformats/bases/base32';
import * as raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';
import * as Digest from 'multiformats/hashes/digest';
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from 'uint8arrays';
import { Buffer } from 'buffer';

/**
 * Converts a bytes32 digest hex string from a contract to a proper IPFS CID in
 * v1 format (baf...) This is necessary because the contract stores a bytes32
 * representation of the IPFS hash.
 *
 * @param bytes32DigestHex The bytes32 digest hex string from the contract (with
 * or without 0x prefix)
 * @returns A proper IPFS CID string in v1 format
 */
export async function bytes32DigestToCid(bytes32DigestHex: string): Promise<string> {
  try {
    const digestBytes = new Uint8Array(Buffer.from(bytes32DigestHex.replace('0x', ''), 'hex'));

    const multihash = Digest.create(sha256.code, digestBytes);

    // Create a CID v1 with the raw codec
    const cid = CID.createV1(raw.code, multihash);
    
    // Return the CID as a base32 string (baf...)
    return cid.toString(base32);
  } catch (error) {
    console.error('Error converting bytes32 to CID:', error);
    throw error;
  }
}

/**
 * Utility to handle potential CID format issues and normalize CIDs
 */
export function normalizeCid(hash: string): string {
  if (!hash) return '';
  
  // If the hash already starts with a CIDv1 prefix (baf), it's likely already in the right format
  if (hash.startsWith('baf')) {
    return hash;
  }
  
  // If it's a CIDv0 (starts with Qm), try to convert to CIDv1
  if (hash.startsWith('Qm')) {
    try {
      const cidv0 = CID.parse(hash);
      const cidv1 = cidv0.toV1();
      return cidv1.toString(base32);
    } catch (e) {
      console.log('Failed to convert CIDv0 to CIDv1, using as-is:', hash);
      return hash;
    }
  }
  
  // If it's a full URL, extract just the CID
  if (hash.includes('/ipfs/')) {
    const parts = hash.split('/ipfs/');
    return normalizeCid(parts[parts.length - 1]); // Recursively normalize the extracted CID
  }
  
  // If it's in ipfs:// format
  if (hash.startsWith('ipfs://')) {
    return normalizeCid(hash.substring(7)); // Recursively normalize the extracted CID
  }
  
  // If it looks like a raw hex, try to convert it directly
  if ((hash.startsWith('0x') && hash.length === 66) || 
      (!hash.startsWith('0x') && hash.length === 64)) {
    // This is probably a bytes32 hex
    // For synchronous normalization, we'll check the cache first
    const result = getCidForBytes32(hash);
    if (result.cid) {
      // If we already have a cached conversion, use it
      return result.cid;
    }
    
    // Start conversion in the background for future use
    result.promise.then(cid => {
      console.log(`Converted bytes32 ${hash} to CID: ${cid}`);
    }).catch(err => {
      console.error(`Failed to convert bytes32 ${hash} to CID:`, err);
    });
    
    // Return the hash as-is since we can't wait for async conversion
    // Callers should use bytes32DigestToCid directly if they need immediate conversion
    return hash;
  }
  
  return hash;
}

/**
 * Converts a CID to a URL for fetching the content
 * Uses the local API proxy to avoid CORS issues with direct IPFS gateway access
 */
export function cidToUrl(cid: string): string {
  const normalizedCid = normalizeCid(cid);
  
  // Use the local API proxy instead of directly accessing the IPFS gateway
  // This helps avoid CORS issues and provides better caching
  return `/api/ipfs/${normalizedCid}`;
  
  // Direct gateway access (leave for reference, may have CORS issues)
  // return `${IPFS_GATEWAY}${normalizedCid}`;
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    const hexByte = hex.substring(i * 2, i * 2 + 2);
    bytes[i] = parseInt(hexByte, 16);
  }
  return bytes;
}

/**
 * Convert hex string to UTF-8 string
 */
function hexToUtf8(hex: string): string {
  return uint8ArrayToString(hexToBytes(hex), 'utf-8');
}

/**
 * Utility function to safely convert bytes32 to CID with caching
 * This provides both synchronous access to already converted values and
 * asynchronous conversion for new values
 */
const cidCache: Record<string, string> = {};

export function getCidForBytes32(bytes32Hex: string): { cid: string | null, promise: Promise<string> } {
  const normalizedHex = bytes32Hex.startsWith('0x') ? bytes32Hex : `0x${bytes32Hex}`;
  
  // Return cached value if available
  if (cidCache[normalizedHex]) {
    return { cid: cidCache[normalizedHex], promise: Promise.resolve(cidCache[normalizedHex]) };
  }
  
  // Start conversion in the background
  const promise = bytes32DigestToCid(normalizedHex).then(cid => {
    // Cache the result
    cidCache[normalizedHex] = cid;
    return cid;
  });
  
  // Return null for immediate value, but provide the promise for async use
  return { cid: null, promise };
}

/**
 * Fetch JSON data from IPFS via the local API proxy
 * @param cid The CID of the JSON data on IPFS
 * @returns Parsed JSON data
 */
export async function fetchJsonFromIpfs<T>(cid: string | null): Promise<T | null> {
  if (!cid) return null;
  
  try {
    // Normalize and get URL
    const normalizedCid = normalizeCid(cid);
    const url = cidToUrl(normalizedCid);
    
    // Fetch data
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Error fetching IPFS data: ${response.status} ${response.statusText}`);
      return null;
    }
    
    // Parse JSON
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('Error fetching JSON from IPFS:', error);
    return null;
  }
}

/**
 * Fetch JSON data from IPFS using bytes32 hash from contract
 * @param bytes32 The bytes32 hash from the contract
 * @returns Parsed JSON data
 */
export async function fetchJsonFromBytes32<T>(bytes32: string | null): Promise<T | null> {
  if (!bytes32) return null;
  
  try {
    // First convert bytes32 to CID
    const cid = await bytes32DigestToCid(bytes32);
    
    // Then fetch the JSON data
    return await fetchJsonFromIpfs<T>(cid);
  } catch (error) {
    console.error('Error fetching JSON from bytes32:', error);
    return null;
  }
}

/**
 * Fetch raw data from IPFS via the local API proxy
 * @param cid The CID of the content on IPFS
 * @returns The raw data as a Blob
 */
export async function fetchBlobFromIpfs(cid: string | null): Promise<Blob | null> {
  if (!cid) return null;
  
  try {
    // Normalize and get URL
    const normalizedCid = normalizeCid(cid);
    const url = cidToUrl(normalizedCid);
    
    // Fetch data
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Error fetching IPFS data: ${response.status} ${response.statusText}`);
      return null;
    }
    
    // Return as blob
    const data = await response.blob();
    return data;
  } catch (error) {
    console.error('Error fetching blob from IPFS:', error);
    return null;
  }
}

/**
 * Fetch raw data from IPFS using bytes32 hash from contract
 * @param bytes32 The bytes32 hash from the contract
 * @returns The raw data as a Blob
 */
export async function fetchBlobFromBytes32(bytes32: string | null): Promise<Blob | null> {
  if (!bytes32) return null;
  
  try {
    // First convert bytes32 to CID
    const cid = await bytes32DigestToCid(bytes32);
    
    // Then fetch the raw data
    return await fetchBlobFromIpfs(cid);
  } catch (error) {
    console.error('Error fetching blob from bytes32:', error);
    return null;
  }
}

/**
 * Generates a mock CID for testing in v1 base32 format (baf...)
 */
export async function generateMockCid(seed: string): Promise<string> {
  const bytes = uint8ArrayFromString(seed);
  const hash = await sha256.digest(bytes);
  const cid = await CID.create(1, raw.code, hash);
  return cid.toString(base32); // Use base32 to get baf... format
}