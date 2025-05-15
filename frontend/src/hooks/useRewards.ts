"use client";

import useLocalStorageState from "use-local-storage-state";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import {
  MerkleTreeData,
  PendingReward,
  RewardClaim,
  RewardSource,
} from "@/types";
import {
  getBrowserProviderWalletSigner,
  getNftContract,
  getRewardDistributorContract,
  getRewardTokenContract,
} from "@/utils/clients";
import { REWARD_TOKEN_ADDRESS } from "@/constants";
import { ContractTransactionReceipt, LogDescription } from "ethers";
import { bytes32DigestToCid, cidToUrl, normalizeCid } from "@/utils/ipfs";

interface UseRewardsProps {
  distributorAddress: `0x${string}`;
}

export function useRewards({ distributorAddress }: UseRewardsProps) {
  const { address, isConnected } = useAccount();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [isLoadingRewardUpdate, setIsLoadingRewardUpdate] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const [currentIpfsHash, setCurrentIpfsHash] = useState<string>("");
  const [merkleRoot, setMerkleRoot] = useState<string>("");
  const [merkleData, setMerkleData] = useState<MerkleTreeData | null>(null);
  const [pendingReward, setPendingReward] = useState<PendingReward | null>(
    null
  );
  const [claimedAmount, setClaimedAmount] = useState<string>("0");
  const [claimHistory, setClaimHistory] = useLocalStorageState<RewardClaim[]>(
    "claimHistory",
    {
      defaultValue: [],
    }
  );
  const [rewardSources, setRewardSources] = useState<RewardSource[]>([]);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [loadedOnce, setLoadedOnce] = useState(false);

  const rewardTokenAddress =
    merkleData?.metadata.reward_token_address || REWARD_TOKEN_ADDRESS;

  // Fetch current trigger info (merkle root and IPFS hash)
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);

      console.log("Fetching initial data from contract:", distributorAddress);

      const distributor = getRewardDistributorContract(distributorAddress);

      // Read the root
      let root = await distributor.root();

      // Read the IPFS hash
      let ipfsHash = await distributor.ipfsHash();

      console.log("Raw root:", root);
      console.log("Raw ipfsHashBytes:", ipfsHash);

      root = /^0x0+$/.test(root as string) ? null : root;
      // Convert bytes32 to a proper IPFS CID if present
      ipfsHash = /^0x0+$/.test(ipfsHash as string)
        ? null
        : await bytes32DigestToCid(ipfsHash as string);
      console.log("Converted bytes32 to IPFS CID:", ipfsHash);

      if (ipfsHash && root) {
        setCurrentIpfsHash(ipfsHash);
        setMerkleRoot(root);
      } else {
        console.log("No valid IPFS hash or merkle root found in contract");
      }
    } catch (err) {
      console.error("Error fetching initial data:", err);
      setError("Failed to load initial data from contract");
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
      setIsLoadingTx(true);

      // Get signer
      const { signer } = await getBrowserProviderWalletSigner();

      // Connect to the contract
      const contract = getRewardDistributorContract(distributorAddress, signer);

      console.log("Triggering reward update...");

      // Call addTrigger function
      const tx = await contract.addTrigger();
      const receipt: ContractTransactionReceipt = await tx.wait();

      console.log("Reward update triggered successfully:", receipt);

      // Find the WavsNftTrigger event in the logs
      const event = receipt.logs.length
        ? contract.interface.parseLog(receipt.logs[0])
        : null;
      if (event?.name === "WavsRewardsTrigger") {
        const triggerId = event.args.triggerId.toString();
        console.log("Reward update triggered with ID:", triggerId);
        setIsLoadingRewardUpdate(triggerId);
      }

      return receipt.hash;
    } catch (err: any) {
      console.error("Error triggering reward update:", err);
      setError(`Failed to update rewards: ${err.message || "Unknown error"}`);
      setIsLoadingRewardUpdate(null);
      return null;
    } finally {
      setIsLoadingTx(false);
      // isLoadingRewardUpdate is called once reward update is detected for this trigger ID
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

      const normalizedCid = normalizeCid(currentIpfsHash);
      const ipfsUrl = cidToUrl(normalizedCid);
      console.log(`Fetching Merkle tree data from ${ipfsUrl}`);

      const response = await fetch(ipfsUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch IPFS data with status ${response.status}: ${response.statusText}`
        );
      }

      const data: MerkleTreeData = await response.json();
      console.log("Merkle tree data received:", data);

      setMerkleData(data);
    } catch (err) {
      console.error("Error fetching merkle data:", err);
      setError("Failed to load reward details from IPFS");
    } finally {
      setIsLoading(false);
    }
  }, [currentIpfsHash]);

  // Get pending rewards for the connected account
  const fetchPendingRewards = useCallback(async () => {
    if (!address || !merkleData) {
      console.log(
        "No account or merkle data available for fetchPendingRewards"
      );
      return;
    }

    try {
      setIsLoading(true);
      console.log(
        `Looking for rewards for account ${address} in ${merkleData.tree.length} entries`
      );

      const pendingReward =
        merkleData.tree.find(
          (reward) => reward.account.toLowerCase() === address.toLowerCase()
        ) || null;

      if (pendingReward) {
        console.log("Found pending reward:", pendingReward);
      } else {
        console.log("No pending rewards found for this account");
      }

      setPendingReward(pendingReward);
    } catch (err) {
      console.error("Error fetching pending rewards:", err);
      setError("Failed to load your pending rewards");
    } finally {
      setIsLoading(false);
    }
  }, [address, merkleData, currentIpfsHash]);

  // Get claimed amount
  const fetchClaimedAmount = useCallback(async () => {
    if (!address) {
      console.log("Missing requirements for fetchClaimedAmount");
      return "0";
    }

    try {
      setIsLoading(true);
      console.log("Fetching claimed amount for token:", rewardTokenAddress);

      const distributor = getRewardDistributorContract(distributorAddress);
      const claimed: bigint = await distributor.claimed(
        address,
        rewardTokenAddress
      );

      console.log("Claimed amount:", claimed);
      setClaimedAmount(claimed.toString());

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
              ? await getNftContract(source.metadata.address).balanceOf(address)
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
      return "0";
    }

    try {
      setIsLoading(true);

      const contract = await getRewardTokenContract(rewardTokenAddress);
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

  const refreshAll = useCallback(
    () =>
      Promise.allSettled([
        fetchPendingRewards(),
        fetchClaimedAmount(),
        fetchRewardSources(),
        fetchTokenBalance(),
      ]),
    [
      fetchPendingRewards,
      fetchClaimedAmount,
      fetchRewardSources,
      fetchTokenBalance,
    ]
  );

  // Claim rewards
  const claim = useCallback(async () => {
    if (!address || !pendingReward) {
      setError("Cannot claim: missing account or reward data");
      return null;
    }

    try {
      setError(null);
      setIsLoadingTx(true);
      console.log("Claiming rewards with proof:", pendingReward.proof);

      const claimed = await fetchClaimedAmount();

      // Get signer
      const { signer } = await getBrowserProviderWalletSigner();

      // Connect to the contract
      const contract = getRewardDistributorContract(distributorAddress, signer);

      console.log("Claiming rewards...");

      // Call addTrigger function
      const tx = await contract.claim(
        address,
        pendingReward.reward,
        pendingReward.claimable,
        pendingReward.proof
      );
      console.log("Claim tx:", tx);

      const receipt: ContractTransactionReceipt = await tx.wait();
      console.log("Claim tx receipt:", receipt);

      // Refresh data after claiming
      await refreshAll();

      // Add the claim to the claim history
      setClaimHistory((h) => [
        ...h,
        {
          ...pendingReward,
          claimed: (
            BigInt(pendingReward.claimable) - BigInt(claimed)
          ).toString(),
          timestamp: Date.now(),
          transactionHash: receipt.hash,
        },
      ]);

      return receipt.hash;
    } catch (err: any) {
      console.error("Error claiming rewards:", err);
      setError(`Failed to claim rewards: ${err.message || "Unknown error"}`);
      return null;
    } finally {
      setIsLoadingTx(false);
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

  const isLoadingRewardUpdateRef = useRef(isLoadingRewardUpdate);
  isLoadingRewardUpdateRef.current = isLoadingRewardUpdate;

  // Listen for RewardsUpdate events
  useEffect(() => {
    if (!distributorAddress) return;

    // Get contract instance using the utility
    const contract = getRewardDistributorContract(distributorAddress);

    const rewardsUpdateFilter = contract.filters.RewardsUpdate();

    // Set up event listener
    const handleRewardsUpdate = async (event: LogDescription) => {
      const triggerId = event.args.triggerId.toString();
      // If this event matches the trigger we're waiting for, unset to stop
      // loading indicator.
      if (isLoadingRewardUpdateRef.current === triggerId) {
        setIsLoadingRewardUpdate(null);
      }

      console.log(
        `RewardsUpdate event received with trigger ID ${triggerId}, reloading data...`
      );
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
    if (isConnected && address) {
      console.log("Account available, fetching user data");
      refreshAll();
    }
  }, [isConnected, address, merkleData, refreshAll]);

  return {
    isLoading: isLoading || isLoadingTx || isLoadingRewardUpdate !== null,
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
