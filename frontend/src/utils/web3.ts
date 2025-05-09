import { ethers } from 'ethers';
import { MerkleTreeData, RewardClaim, PendingReward } from '@/types';
import { bytes32DigestToCid, normalizeCid, cidToUrl, generateMockCid } from './ipfs';
import ERC20_ABI from '@/abis/ERC20.json';
import WavsNftABI from '@/abis/WavsNft.json';
import REWARDS_DISTRIBUTOR_ABI from '@/abis/UniversalRewardsDistributor.json';
import { getNetwork } from 'wagmi/actions';

export const getDistributorContract = (address: string) => {
  const provider = getProvider();
  return new ethers.Contract(address, REWARDS_DISTRIBUTOR_ABI, provider);
}

export const getProvider = () => {
  const network = getNetwork();
  if (!network.chain) {
    throw new Error('No chain found');
  }
  const rpcUrl = network.chain.rpcUrls.default.http[0]
  if (!rpcUrl) {
    throw new Error('No RPC URL found');
  }
  return new ethers.JsonRpcProvider(rpcUrl);
}

export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
};

export async function fetchMerkleTreeData(ipfsHash: string): Promise<MerkleTreeData | null> {
  try {
    const normalizedCid = normalizeCid(ipfsHash);
    const ipfsUrl = cidToUrl(normalizedCid);
    console.log(`Fetching Merkle tree data from ${ipfsUrl}`);
    
    const response = await fetch(ipfsUrl);
    if (!response.ok) {
      console.error(`IPFS fetch failed with status ${response.status}: ${response.statusText}`);
      throw new Error('Failed to fetch IPFS data');
    }
    
    const data = await response.json();
    console.log('Merkle tree data received:', data);
    return data as MerkleTreeData;
  } catch (error) {
    console.error('Error fetching Merkle tree data:', error);
    return null;
  }
}

export async function getPendingRewards(
  account: string,
  ipfsHash: string
): Promise<PendingReward | null> {
  try {
    const merkleData = await fetchMerkleTreeData(ipfsHash);
    if (!merkleData) return null;
    
    console.log(`Looking for rewards for account ${account} in ${merkleData.tree.length} entries`);
    
    const pendingReward = merkleData.tree.find(
      (reward) => reward.account.toLowerCase() === account.toLowerCase()
    );
    
    if (pendingReward) {
      console.log('Found pending reward:', pendingReward);
    } else {
      console.log('No pending rewards found for this account');
    }
    
    return pendingReward || null;
  } catch (error) {
    console.error('Error getting pending rewards:', error);
    return null;
  }
}

export async function getERC20TokenInfo(
  provider: ethers.Provider,
  tokenAddress: string
) {
  try {
    console.log(`Getting ERC20 info for token at ${tokenAddress}`);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);
    
    console.log(`Token info: ${name} (${symbol}), ${decimals} decimals`);
    return { name, symbol, decimals };
  } catch (error) {
    console.error('Error getting token info:', error);
    return { name: 'Unknown Token', symbol: 'UNKNOWN', decimals: 18 };
  }
}

export async function getERC721Balance(
  provider: ethers.Provider,
  nftAddress: string, 
  account: string
): Promise<number> {
  try {
    console.log(`Getting ERC721 balance for ${account} at ${nftAddress}`);
    const nftContract = new ethers.Contract(nftAddress, WavsNftABI, provider);
    const balance = await nftContract.balanceOf(account);
    console.log(`NFT balance: ${balance.toString()}`);
    return Number(balance);
  } catch (error) {
    console.error('Error getting NFT balance:', error);
    return 0;
  }
}

export async function claimRewards(
  signer: ethers.Signer,
  distributorAddress: string,
  account: string,
  rewardToken: string,
  claimable: string,
  proof: string[]
): Promise<string> {
  try {
    console.log(`Claiming rewards: ${claimable} tokens for ${account}`);
    console.log(`Proof: ${proof.join(', ')}`);
    
    const distributor = new ethers.Contract(
      distributorAddress,
      REWARDS_DISTRIBUTOR_ABI,
      signer
    );
    
    const tx = await distributor.claim(account, rewardToken, claimable, proof);
    console.log('Claim transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt);
    
    return tx.hash;
  } catch (error) {
    console.error('Error claiming rewards:', error);
    throw error;
  }
}

export async function getClaimedAmount(
  provider: ethers.Provider,
  distributorAddress: string,
  account: string,
  rewardToken: string
): Promise<string> {
  try {
    console.log(`Getting claimed amount for ${account} and token ${rewardToken}`);
    const distributor = new ethers.Contract(
      distributorAddress,
      REWARDS_DISTRIBUTOR_ABI,
      provider
    );
    
    const claimed = await distributor.claimed(account, rewardToken);
    console.log(`Claimed amount: ${claimed.toString()}`);
    return claimed.toString();
  } catch (error) {
    console.error('Error getting claimed amount:', error);
    return '0';
  }
}

export async function fetchClaimEvents(
  provider: ethers.Provider,
  distributorAddress: string,
  account: string
): Promise<RewardClaim[]> {
  try {
    console.log(`Fetching claim events for ${account} from ${distributorAddress}`);
    const distributor = new ethers.Contract(
      distributorAddress, 
      REWARDS_DISTRIBUTOR_ABI,
      provider
    );
    
    const filter = distributor.filters.Claimed(account);
    const events = await distributor.queryFilter(filter) as ethers.EventLog[];
    
    console.log(`Found ${events.length} claim events`);
    
    return events.map(event => {
      const { args, blockNumber, transactionHash } = event;
      return {
        account: args![0],
        reward: args![1],
        amount: args![2].toString(),
        claimable: args![2].toString(),
        claimed: args![2].toString(),
        proof: [],
        blockNumber,
        transactionHash,
        timestamp: Date.now() / 1000 // Placeholder, ideally we'd get the block timestamp
      };
    });
  } catch (error) {
    console.error('Error fetching claim events:', error);
    return [];
  }
}

export async function fetchCurrentTriggerInfo(
  provider: ethers.Provider,
  distributorAddress: string
): Promise<{ ipfsHash: string; root: string }> {
  try {
    console.log(`Fetching trigger info from ${distributorAddress}`);
    const distributor = new ethers.Contract(
      distributorAddress,
      REWARDS_DISTRIBUTOR_ABI,
      provider
    );
    
    // Get both the root and IPFS hash from contract
    let [root, ipfsHashBytes] = await Promise.all([
      distributor.root(),
      distributor.ipfsHash()
    ]);
    
    console.log('Raw root:', root);
    console.log('Raw ipfsHashBytes:', ipfsHashBytes);
    
    // Try to convert bytes32 to a proper IPFS CID
    const ipfsHash = await bytes32DigestToCid(ipfsHashBytes);
    console.log('Converted bytes32 to IPFS CID:', ipfsHash);
    
    return { ipfsHash, root };
  } catch (error) {
    console.error('Error fetching current trigger info:', error);
    return { ipfsHash: '', root: '' };
  }
}

// Function to use mock IPFS hash for testing
export async function createTestIpfsHash(): Promise<string> {
  return generateMockCid('test-rewards-' + Date.now());
}