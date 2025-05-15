import React, { useState } from "react";
import { useAccount } from "wagmi";
import { useRewards } from "@/hooks/useRewards";
import { RewardSource, RewardClaim } from "@/types";
import { REWARD_DISTRIBUTOR_ADDRESS } from "@/constants";
import { ethers } from "ethers";

const RewardsPage: React.FC = () => {
  const { isConnected } = useAccount();
  const [isUpdating, setIsUpdating] = useState(false);
  const {
    isLoading,
    error,
    merkleRoot,
    currentIpfsHash,
    pendingReward,
    claimedAmount,
    claimHistory,
    rewardSources,
    tokenBalance,
    claim,
    refresh,
    triggerUpdate,
  } = useRewards({ distributorAddress: REWARD_DISTRIBUTOR_ADDRESS });

  const handleTriggerRewardUpdate = async () => {
    console.log("Triggering reward update");
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      const txHash = await triggerUpdate();
      
      if (txHash) {
        console.log('Reward update successful, transaction hash:', txHash);
      }
    } catch (error) {
      console.error('Error triggering reward update:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isConnected) {
    return (
      <main className="flex-1 py-8 px-4 md:px-8 max-w-6xl mx-auto w-full">
        <div className="card relative">
          <div className="absolute top-0 left-0 w-full h-6 bg-dark-800 flex items-center">
            <div className="flex space-x-1 px-2">
              <div className="w-2 h-2 rounded-full bg-danger"></div>
              <div className="w-2 h-2 rounded-full bg-warning"></div>
              <div className="w-2 h-2 rounded-full bg-primary"></div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <span className="font-mono text-xs text-primary/70">
                TERMINAL::REWARDS_VAULT
              </span>
            </div>
          </div>

          <div className="mt-8 text-center py-12 border border-dashed border-primary/30">
            <div className="w-16 h-16 mx-auto border-2 border-primary flex items-center justify-center rounded-full mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="font-mono text-primary tracking-widest">
              ACCESS_REQUIRED
            </h3>
            <div className="console-output max-w-sm mx-auto mt-4 text-center">
              <div className="terminal-line">Authentication required</div>
              <div className="terminal-line">Connect wallet to proceed</div>
              <div className="text-danger mt-2">
                {">> STATUS: UNAUTHORIZED <<"}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex-1 py-8 px-4 md:px-8 max-w-6xl mx-auto w-full">
        <div className="card">
          <div className="absolute top-0 left-0 w-full h-6 bg-dark-800 flex items-center">
            <div className="flex space-x-1 px-2">
              <div className="w-2 h-2 rounded-full bg-accent"></div>
              <div className="w-2 h-2 rounded-full bg-warning"></div>
              <div className="w-2 h-2 rounded-full bg-primary"></div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <span className="font-mono text-xs text-primary/70">
                TERMINAL::LOADING
              </span>
            </div>
          </div>

          <div className="text-center py-16 mt-8">
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-cyber-gradient opacity-20 animate-pulse rounded-full"></div>
              <div className="relative animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-primary font-mono text-sm">LOAD</span>
              </div>
            </div>
            <div className="mt-6 font-mono text-primary/80 text-sm">
              <span className="animate-pulse">SCANNING BLOCKCHAIN...</span>
            </div>
            <div className="mt-2 font-mono text-xs text-primary/40">
              ETA: 3 SECONDS
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-8 px-4 md:px-8 max-w-6xl mx-auto w-full">
      <div className="card relative">
        {/* Terminal header */}
        <div className="absolute top-0 left-0 w-full h-6 bg-dark-800 flex items-center">
          <div className="flex space-x-1 px-2 z-10">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <div 
              className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-warning animate-pulse' : 'bg-secondary'} cursor-pointer hover:bg-secondary/80 transition-colors`}
              onClick={handleTriggerRewardUpdate}
            ></div>
            <div className="w-2 h-2 rounded-full bg-accent"></div>
          </div>
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            <span className="font-mono text-xs text-primary/70">
              TERMINAL::REWARDS_VAULT
            </span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between mb-4 mt-8 font-mono text-xs border border-dark-700 bg-dark-900 p-2">
          <div className="text-primary">
            MERKLE::
            <span className="text-accent">
              {merkleRoot ? merkleRoot.substring(0, 8) + "..." : "NONE"}
            </span>
          </div>
          <div className="text-primary">
            IPFS::
            <span className="text-warning">
              {currentIpfsHash
                ? currentIpfsHash.substring(0, 8) + "..."
                : "NONE"}
            </span>
          </div>
          <div className="text-primary">
            CLAIMED::
            <span className="text-secondary">
              {ethers.formatEther(claimedAmount)}
            </span>
          </div>
          <div className="text-primary">
            STATUS::<span className="text-accent">ONLINE</span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-glitch relative">
            <span className="text-primary mr-2">[</span>
            <span className="crt-flicker">REWARDS_VAULT</span>
            <span className="text-primary ml-2">]</span>
            <span className="absolute -top-1 -right-3 w-2 h-2 bg-primary animate-pulse"></span>
          </h2>
          <button
            onClick={() => refresh()}
            className="btn btn-secondary text-sm flex items-center"
          >
            <svg
              className="h-3 w-3 mr-1"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 10C2 10 4.00498 7.26822 5 6C8.5 2 13.5 2 17 6C18.0104 7.10851 19 10 19 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 14C22 14 19.995 16.7318 19 18C15.5 22 10.5 22 7 18C5.98959 16.8915 5 14 5 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 10H8V4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 14H16V20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            RESCAN
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 border border-danger/50 bg-danger/10">
            <div className="flex items-center text-danger">
              <svg
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-mono">ERROR</span>
            </div>
            <p className="mt-2 text-danger/80 font-mono text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Token Balance Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-mono text-secondary flex items-center">
              <span className="w-1 h-6 bg-secondary mr-2"></span>
              TOKEN_BALANCE
            </h3>

            <div className="border border-dark-600 p-4 bg-dark-800">
              <div className="bg-dark-900 p-3 rounded">
                <div className="text-xs text-primary/60 font-mono mb-1">
                  CURRENT_BALANCE
                </div>
                <div className="text-lg text-secondary font-mono">
                  {ethers.formatEther(tokenBalance)} tokens
                </div>
              </div>
            </div>
          </div>

          {/* Pending Rewards Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-mono text-accent flex items-center">
              <span className="w-1 h-6 bg-accent mr-2"></span>
              PENDING_REWARDS
              <span className="ml-2 text-xs border border-accent px-1 bg-dark-900">
                {pendingReward ? "1" : "0"}
              </span>
            </h3>

            {!pendingReward ? (
              <div className="border border-dashed border-dark-600 py-8 text-center relative">
                <div className="console-output max-w-md mx-auto">
                  <div className="terminal-line">No pending rewards found</div>
                  <div className="terminal-line">
                    Check back later for new rewards
                  </div>
                  <div className="terminal-line text-primary/50">
                    System ready for input...
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dark-600 p-4 bg-dark-800">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-dark-900 p-3 rounded">
                    <div className="text-xs text-primary/60 font-mono mb-1">
                      TOTAL_ALLOCATED
                    </div>
                    <div className="text-lg text-accent font-mono">
                      {ethers.formatEther(pendingReward.claimable)} tokens
                    </div>
                  </div>
                  <div className="bg-dark-900 p-3 rounded">
                    <div className="text-xs text-primary/60 font-mono mb-1">
                      ALREADY_CLAIMED
                    </div>
                    <div className="text-lg text-primary font-mono">
                      {ethers.formatEther(claimedAmount)} tokens
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => claim()}
                  className="w-full btn btn-accent font-mono text-sm"
                  disabled={
                    BigInt(pendingReward.claimable) <= BigInt(claimedAmount)
                  }
                >
                  {BigInt(pendingReward.claimable) <= BigInt(claimedAmount)
                    ? "NO_REWARDS_TO_CLAIM"
                    : "CLAIM_REWARDS"}
                </button>
              </div>
            )}
          </div>

          {/* Reward Sources Section */}
          {rewardSources.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-mono text-primary flex items-center">
                <span className="w-1 h-6 bg-primary mr-2"></span>
                REWARD_SOURCES
                <span className="ml-2 text-xs border border-primary px-1 bg-dark-900">
                  {rewardSources.length}
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewardSources.map((source: RewardSource, index: number) => (
                  <div
                    key={index}
                    className="border border-dark-600 p-4 bg-dark-800"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-mono text-primary">
                        {source.name === "ERC721"
                          ? "NFT_HOLDINGS"
                          : source.name}
                      </h4>
                      {source.balance && (
                        <div className="text-xs border border-primary/50 px-2 py-1 bg-dark-900">
                          BALANCE: {source.balance}
                        </div>
                      )}
                    </div>

                    {source.metadata && (
                      <div className="space-y-2">
                        <div className="text-xs text-primary/60 font-mono break-all">
                          ADDRESS: {source.metadata.address}
                        </div>
                        <div className="bg-dark-900 p-2 rounded">
                          <div className="text-xs text-primary/60">
                            REWARDS_PER_TOKEN:
                          </div>
                          <div className="font-mono text-accent">
                            {ethers.formatEther(
                              source.metadata.rewards_per_token
                            )}{" "}
                            tokens
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Claim History Section */}
          {claimHistory.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-mono text-primary flex items-center">
                <span className="w-1 h-6 bg-primary mr-2"></span>
                CLAIM_HISTORY
                <span className="ml-2 text-xs border border-primary px-1 bg-dark-900">
                  {claimHistory.length}
                </span>
              </h3>

              <div className="border border-dark-600 divide-y divide-dark-600">
                {claimHistory.map((claim: RewardClaim, index: number) => (
                  <div key={index} className="p-4 bg-dark-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs text-primary/60 font-mono">
                          AMOUNT_CLAIMED
                        </div>
                        <div className="text-accent font-mono">
                          {ethers.formatEther(claim.claimed)} tokens
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-primary/60 font-mono">
                          TIMESTAMP
                        </div>
                        <div className="text-primary font-mono">
                          {new Date(claim.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-primary/40 font-mono break-all">
                      TX: {claim.transactionHash}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default RewardsPage;
