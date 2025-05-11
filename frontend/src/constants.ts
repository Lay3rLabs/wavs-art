// Default mint price as a fallback when contract call fails
export const DEFAULT_MINT_PRICE = "0.1"; // in ETH

export const MINTER_CONTRACT_ADDRESS =
  (import.meta.env.VITE_MINTER_CONTRACT_ADDRESS as `0x${string}`) ||
  "0x0000000000000000000000000000000000000000";

export const NFT_CONTRACT_ADDRESS =
  (import.meta.env.VITE_NFT_CONTRACT_ADDRESS as `0x${string}`) ||
  "0x0000000000000000000000000000000000000000";

export const REWARD_DISTRIBUTOR_ADDRESS =
  (import.meta.env.VITE_REWARD_DISTRIBUTOR_ADDRESS as `0x${string}`) ||
  "0x0000000000000000000000000000000000000000";

export const REWARD_TOKEN_ADDRESS =
  (import.meta.env.VITE_REWARD_TOKEN_ADDRESS as `0x${string}`) ||
  "0x0000000000000000000000000000000000000000";

export const IPFS_GATEWAY_URL =
  (import.meta.env.VITE_IPFS_GATEWAY_URL as string) || "https://ipfs.io/ipfs/";

export const IS_LOCALHOST = import.meta.env.VITE_LOCALHOST === "true";
