import { MerkleTreeData, PendingReward } from "@/types";
import REWARDS_DISTRIBUTOR_ABI from "@/abis/UniversalRewardsDistributor.json";
import ERC20_ABI from "@/abis/ERC20.json";
import WavsNftAbi from "@/abis/WavsNft.json";
import { getAccount, getPublicClient, writeContract } from "wagmi/actions";
import { bytes32DigestToCid, cidToUrl, normalizeCid } from "./ipfs";
import { getDistributorContract, getProvider } from "./web3";

// Fetch Merkle Tree data from IPFS
export async function fetchMerkleTreeData(
  ipfsHash: string
): Promise<MerkleTreeData | null> {
  const normalizedCid = normalizeCid(ipfsHash);
  const ipfsUrl = cidToUrl(normalizedCid);
  console.log(`Fetching Merkle tree data from ${ipfsUrl}`);

  const response = await fetch(ipfsUrl);
  if (!response.ok) {
    console.error(
      `IPFS fetch failed with status ${response.status}: ${response.statusText}`
    );
    throw new Error("Failed to fetch IPFS data");
  }

  const data = await response.json();
  console.log("Merkle tree data received:", data);
  return data as MerkleTreeData;
}

// Get pending rewards for an account
export async function getPendingRewards(
  account: string,
  ipfsHash: string
): Promise<PendingReward | null> {
  const merkleData = await fetchMerkleTreeData(ipfsHash);
  if (!merkleData) return null;

  console.log(
    `Looking for rewards for account ${account} in ${merkleData.tree.length} entries`
  );

  const pendingReward = merkleData.tree.find(
    (reward) => reward.account.toLowerCase() === account.toLowerCase()
  );

  if (pendingReward) {
    console.log("Found pending reward:", pendingReward);
  } else {
    console.log("No pending rewards found for this account");
  }

  return pendingReward || null;
}

// Fetch current trigger info from the contract
export async function fetchCurrentTriggerInfo(
  distributorAddress: string
): Promise<{ ipfsHash: string; root: string }> {
  console.log(`Fetching trigger info from ${distributorAddress}`);

  const distributor = getDistributorContract(distributorAddress);

  // Read the root
  const root = await distributor.root();

  // Read the IPFS hash
  const ipfsHashBytes = await distributor.ipfsHash();

  console.log("Raw root:", root);
  console.log("Raw ipfsHashBytes:", ipfsHashBytes);

  // Convert bytes32 to a proper IPFS CID
  const ipfsHash = await bytes32DigestToCid(ipfsHashBytes as string);
  console.log("Converted bytes32 to IPFS CID:", ipfsHash);

  return { ipfsHash, root: root as string };
}

// Claim rewards
export async function claimRewards(
  distributorAddress: string,
  account: string,
  rewardToken: string,
  claimable: string,
  proof: string[]
): Promise<string> {
  console.log(`Claiming rewards: ${claimable} tokens for ${account}`);
  console.log(`Proof: ${proof.join(", ")}`);

  // Prepare transaction
  const { hash } = await writeContract({
    account: account as `0x${string}`,
    address: distributorAddress as `0x${string}`,
    abi: REWARDS_DISTRIBUTOR_ABI,
    functionName: "claim",
    args: [account as `0x${string}`, rewardToken as `0x${string}`, BigInt(claimable), proof as `0x${string}`[]],
  });

  console.log("Claim transaction sent:", hash);
  return hash;
}

// Get claimed amount
export async function getClaimedAmount(
  distributorAddress: string,
  account: string,
  rewardToken: string
): Promise<string> {
  console.log(`Getting claimed amount for ${account} and token ${rewardToken}`);

  const distributor = getDistributorContract(distributorAddress);

  const claimed: bigint = await distributor.claimed(account, rewardToken);

  console.log(`Claimed amount: ${claimed.toString()}`);
  return claimed.toString();
}

// Get ERC20 token info
export async function getERC20TokenInfo(tokenAddress: string) {
  console.log(`Getting ERC20 info for token at ${tokenAddress}`);
  const publicClient = getPublicClient();

  // Get token name
  const name = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "name",
  });

  // Get token symbol
  const symbol = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  // Get token decimals
  const decimals = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  console.log(`Token info: ${name} (${symbol}), ${decimals} decimals`);
  return { name, symbol, decimals };
}

// Get ERC721 balance
export async function getERC721Balance(
  nftAddress: string,
  account: string
): Promise<number> {
  console.log(`Getting ERC721 balance for ${account} at ${nftAddress}`);
  const publicClient = getPublicClient();

  const balance = await publicClient.readContract({
    address: nftAddress as `0x${string}`,
    abi: WavsNftAbi,
    functionName: "balanceOf",
    args: [account as `0x${string}`],
  });

  console.log(`NFT balance: ${(balance as bigint).toString()}`);
  return Number(balance);
}

// Get ETH balance for an address
export async function getEthBalance(address: string): Promise<string> {
  console.log(`Getting ETH balance for ${address}`);
  const publicClient = getPublicClient();

  const balance = await publicClient.getBalance({
    address: address as `0x${string}`,
  });

  console.log(`ETH balance: ${balance.toString()}`);
  return balance.toString();
}

// Request ETH from local Anvil faucet using anvil_setBalance RPC call
export async function requestFaucetEth(amount: string = "10"): Promise<string> {
  console.log(`Setting balance to ${amount} ETH via anvil_setBalance`);
  
  const account = getAccount();
  if (!account.address) {
    throw new Error("No account address available");
  }
  
  const provider = getProvider();
  
  // Convert ETH amount to wei (as hexadecimal string)
  const amountInWei = BigInt(parseFloat(amount) * 1e18).toString(16);
  const hexAmount = "0x" + amountInWei;
  
  try {
    // Use the RPC method anvil_setBalance directly
    // This method is specific to Anvil and directly sets an account's balance
    const result = await provider.send("anvil_setBalance", [account.address, hexAmount]);
    
    console.log("Balance set via anvil_setBalance:", result);
    return "Balance updated successfully";
  } catch (error) {
    console.error("Error setting balance via anvil_setBalance:", error);
    throw new Error(`Failed to set balance: ${error}`);
  }
}
