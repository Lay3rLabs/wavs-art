export interface RewardClaim extends PendingReward {
  claimed: string;
  timestamp: number;
  transactionHash: string;
}

export interface PendingReward {
  account: `0x${string}`;
  reward: `0x${string}`;
  claimable: string;
  proof: string[];
}

export interface MerkleTreeData {
  id: string;
  metadata: {
    num_accounts: number;
    reward_token_address: `0x${string}`;
    total_rewards: string;
    sources: {
      name: string;
      metadata: {
        [key: string]: any;
      };
    }[];
  };
  root: string;
  tree: PendingReward[];
}

export interface RewardSource {
  name: string;
  balance?: string; // Balance for this source, if applicable
  metadata?: {
    [key: string]: any;
  };
}

export interface ClaimHistoryItem {
  timestamp: number;
  amount: string;
  tokenAddress: string;
  source: RewardSource;
  transactionHash: string;
}

export interface TriggerInfo {
  triggerId: string;
  creator: string;
  data: string;
  rewardTokenAddr?: string;
  rewardSourceNftAddr?: string;
}