"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  fetchMerkleTreeData,
  getPendingRewards,
  getClaimedAmount,
  claimRewards,
  fetchRewardState,
  getERC721Balance,
} from "@/utils/wagmi-utils";
import {
  MerkleTreeData,
  PendingReward,
  RewardClaim,
  RewardSource,
} from "@/types";
import { ethers } from "ethers";
import {
  getBrowserProviderWalletSigner,
  getRewardDistributorContract,
  getRewardTokenContract,
} from "@/utils/clients";

interface UseRewardsProps {
  distributorAddress: `0x${string}`;
}

export function useRewards({ distributorAddress }: UseRewardsProps) {
  const { address, isConnected } = useAccount();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentIpfsHash, setCurrentIpfsHash] = useState<string>("");
  const [merkleRoot, setMerkleRoot] = useState<string>("");
  const [merkleData, setMerkleData] = useState<MerkleTreeData | null>(null);
  const [pendingReward, setPendingReward] = useState<PendingReward | null>(
    null
  );
  const [claimedAmount, setClaimedAmount] = useState<string>("0");
  const [claimHistory, setClaimHistory] = useState<RewardClaim[]>([]);
  const [rewardSources, setRewardSources] = useState<RewardSource[]>([]);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [loadedOnce, setLoadedOnce] = useState(false);

  // Fetch current trigger info (merkle root and IPFS hash)
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      await fetchTokenBalance();

      console.log("Fetching reward state from contract:", distributorAddress);

      const { ipfsHash, root } = await fetchRewardState(distributorAddress);

      if (ipfsHash && root) {
        setCurrentIpfsHash(ipfsHash);
        setMerkleRoot(root);
      } else {
        console.log("No valid IPFS hash or merkle root found in contract");
      }
    } catch (err) {
      console.error("Error fetching reward state:", err);
      setError("Failed to load reward data from contract");
    } finally {
      setIsLoading(false);
      setLoadedOnce(true);
    }
  }, [distributorAddress]);

  // Trigger a reward update by calling addTrigger on the distributor contract
  const triggerUpdate = useCallback(async (): Promise<string | null> => {
    if (!isConnected) {
      setError("Cannot update rewards: wallet not connected");
      return null;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Get signer
      const { signer } = await getBrowserProviderWalletSigner();

      // RewardDistributor ABI - just the function we need
      const rewardDistributorABI = [
        "function addTrigger() external returns (uint256)",
      ];

      // Connect to the contract
      const contract = new ethers.Contract(
        distributorAddress,
        rewardDistributorABI,
        signer
      );

      console.log("Triggering reward update...");

      // Call addTrigger function
      const tx = await contract.addTrigger();
      const receipt = await tx.wait();

      console.log("Reward update triggered successfully:", receipt.hash);

      return receipt.hash;
    } catch (err: any) {
      console.error("Error triggering reward update:", err);
      setError(`Failed to update rewards: ${err.message || "Unknown error"}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, distributorAddress, loadInitialData]);

  // Fetch merkle tree data from IPFS
  const fetchMerkleData = useCallback(async () => {
    if (!currentIpfsHash) {
      console.log("No IPFS hash available");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Fetching merkle data from IPFS:", currentIpfsHash);

      const data = await fetchMerkleTreeData(currentIpfsHash);
      console.log("Merkle data received:", data);

      if (data) {
        setMerkleData(data);
      }
    } catch (err) {
      console.error("Error fetching merkle data:", err);
      setError("Failed to load reward details from IPFS");
    } finally {
      setIsLoading(false);
    }
  }, [currentIpfsHash]);

  // Get pending rewards for the connected account
  const fetchPendingRewards = useCallback(async () => {
    if (!address || !currentIpfsHash) {
      console.log("No account or IPFS hash available for fetchPendingRewards");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Fetching pending rewards for account:", address);

      const rewards = await getPendingRewards(address, currentIpfsHash);
      console.log("Pending rewards received:", rewards);

      setPendingReward(rewards);
    } catch (err) {
      console.error("Error fetching pending rewards:", err);
      setError("Failed to load your pending rewards");
    } finally {
      setIsLoading(false);
    }
  }, [address, currentIpfsHash]);

  // Get claimed amount
  const fetchClaimedAmount = useCallback(async () => {
    if (!address || !merkleData?.metadata.reward_token_address) {
      console.log("Missing requirements for fetchClaimedAmount");
      return "0";
    }

    try {
      setIsLoading(true);
      const tokenAddress = merkleData.metadata.reward_token_address;
      console.log("Fetching claimed amount for token:", tokenAddress);

      const claimed = await getClaimedAmount(
        distributorAddress,
        address,
        tokenAddress
      );

      console.log("Claimed amount:", claimed);
      setClaimedAmount(claimed);

      return claimed;
    } catch (err) {
      console.error("Error fetching claimed amount:", err);
      setError("Failed to load your claimed rewards");
      return "0";
    } finally {
      setIsLoading(false);
    }
  }, [address, distributorAddress, merkleData]);

  // Get sources and balances
  const fetchRewardSources = useCallback(async () => {
    if (!address || !merkleData?.metadata?.sources) {
      console.log("Missing requirements for fetchRewardSources");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Fetching reward sources for account:", address);

      const sourcesWithBalances = await Promise.all(
        (merkleData?.metadata?.sources || []).map(async (source) => {
          const balance =
            source.name === "ERC721"
              ? await getERC721Balance(source.metadata.address, address)
              : undefined;

          return {
            ...source,
            balance: balance?.toString(),
          };
        })
      );

      console.log("Sources with balances:", sourcesWithBalances);
      setRewardSources(sourcesWithBalances);
    } catch (err) {
      console.error("Error fetching source balances:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address, merkleData]);

  // Get token balance
  const fetchTokenBalance = useCallback(async () => {
    if (!address) {
      return "0"
    }

    try {
      setIsLoading(true);

      const contract = await getRewardTokenContract(merkleData?.metadata.reward_token_address);
      const balance = (await contract.balanceOf(address)).toString();

      console.log("Token balance:", balance);
      setTokenBalance(balance);

      return balance;
    } catch (err) {
      console.error("Error fetching token balance:", err);
      setError("Failed to load token balance");
      return "0";
    } finally {
      setIsLoading(false);
    }
  }, [address, merkleData]);

  // Claim rewards
  const claim = useCallback(async () => {
    if (!address || !pendingReward) {
      setError("Cannot claim: missing account or reward data");
      return null;
    }

    try {
      setError(null);
      console.log("Claiming rewards with proof:", pendingReward.proof);

      const claimed = await fetchClaimedAmount();

      const txHash = await claimRewards(
        distributorAddress,
        address,
        pendingReward.reward,
        pendingReward.claimable,
        pendingReward.proof
      );

      console.log("Claim transaction submitted:", txHash);

      // Refresh data after claiming
      await Promise.all([fetchClaimedAmount(), fetchPendingRewards()]);

      // Add the claim to the claim history
      setClaimHistory((h) => [
        ...h,
        {
          ...pendingReward,
          claimed: (
            BigInt(pendingReward.claimable) - BigInt(claimed)
          ).toString(),
          timestamp: Date.now(),
          transactionHash: txHash,
        },
      ]);

      return txHash;
    } catch (err: any) {
      console.error("Error claiming rewards:", err);
      setError(`Failed to claim rewards: ${err.message || "Unknown error"}`);
      return null;
    }
  }, [
    address,
    distributorAddress,
    pendingReward,
    fetchClaimedAmount,
    fetchPendingRewards,
  ]);

  // Initial data loading
  useEffect(() => {
    console.log("Fetching trigger info on component mount");
    loadInitialData();
  }, [loadInitialData]);

  // Listen for RewardsUpdate events
  useEffect(() => {
    if (!distributorAddress) return;

    // Get contract instance using the utility
    const contract = getRewardDistributorContract(distributorAddress);

    const rewardsUpdateFilter = contract.filters.RewardsUpdate();

    // Set up event listener
    const handleRewardsUpdate = async () => {
      console.log("RewardsUpdate event received, reloading data...");
      await loadInitialData();
    };

    // Listen for the event
    contract.on(rewardsUpdateFilter, handleRewardsUpdate);

    // Cleanup
    return () => {
      contract.off(rewardsUpdateFilter, handleRewardsUpdate);
    };
  }, [distributorAddress, loadInitialData]);

  // Load merkle data when ipfsHash changes
  useEffect(() => {
    if (currentIpfsHash) {
      console.log("IPFS hash available, fetching merkle data");
      fetchMerkleData();
    }
  }, [currentIpfsHash, fetchMerkleData]);

  // Load user-specific data when account or merkleData changes
  useEffect(() => {
    if (isConnected && address && merkleData) {
      console.log("Account and merkle data available, fetching user data");
      Promise.allSettled([
        fetchPendingRewards(),
        fetchClaimedAmount(),
        fetchRewardSources(),
        fetchTokenBalance(),
      ]);
    }
  }, [
    isConnected,
    address,
    merkleData,
    fetchPendingRewards,
    fetchClaimedAmount,
    fetchRewardSources,
    fetchTokenBalance,
  ]);

  return {
    isLoading,
    error,
    merkleRoot,
    currentIpfsHash,
    merkleData,
    pendingReward,
    claimedAmount,
    claimHistory,
    rewardSources,
    tokenBalance,
    claim,
    refresh: loadInitialData,
    triggerUpdate,
    loadedOnce,
  };
}
