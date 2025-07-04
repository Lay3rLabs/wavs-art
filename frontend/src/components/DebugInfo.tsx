import React, { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { addLocalNetwork } from "../utils/addLocalNetwork";
import { ethers } from "ethers";
import { MINTER_CONTRACT_ADDRESS, NFT_CONTRACT_ADDRESS } from "../constants";

interface DebugData {
  isConnected: boolean;
  address: string | undefined;
  chainId: number | undefined;
  chainName: string | undefined;
  actualNodeChainId: string | null;
  minterAddress: string;
  nftAddress: string;
  minterExists: boolean;
  nftExists: boolean;
  balance: string;
}

const DebugInfo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const fetchDebugData = async () => {
    if (!publicClient) return;

    setIsLoading(true);

    try {
      // For ethers v5 compatibility
      const provider = new ethers.JsonRpcProvider(
        "http://localhost:8545"
      );

      // Detect actual chain ID from the local node
      let actualNodeChainId = null;
      try {
        const response = await fetch("http://localhost:8545", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_chainId",
            params: [],
            id: 1,
          }),
        });

        const data = await response.json();
        actualNodeChainId = data.result;
      } catch (err) {
        console.error("Error fetching chain ID from node:", err);
      }

      // Check if contracts exist
      const minterBytecode = await provider.getCode(MINTER_CONTRACT_ADDRESS);
      const nftBytecode = await provider.getCode(NFT_CONTRACT_ADDRESS);
      const minterExists = minterBytecode !== "0x";
      const nftExists = nftBytecode !== "0x";

      // Get user balance
      const balance = address ? await provider.getBalance(address) : 0n;

      setDebugData({
        isConnected,
        address,
        chainId: publicClient.chain.id,
        chainName: publicClient.chain.name,
        actualNodeChainId,
        minterAddress: MINTER_CONTRACT_ADDRESS,
        nftAddress: NFT_CONTRACT_ADDRESS,
        minterExists,
        nftExists,
        balance: ethers.formatEther(balance),
      });
    } catch (error) {
      console.error("Error fetching debug data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add the debug panel hotkey (press Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        setIsOpen((prev) => !prev);
        if (!isOpen) {
          fetchDebugData();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 m-4 p-4 bg-dark-800 border border-primary text-primary z-50 w-96 shadow-lg font-mono text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-accent font-bold">Debug Panel</h3>
        <div className="flex gap-2">
          <button
            onClick={fetchDebugData}
            className="px-2 py-1 bg-dark-700 hover:bg-dark-600 rounded"
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="px-2 py-1 bg-dark-700 hover:bg-dark-600 rounded"
          >
            Close
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-auto">
        {debugData ? (
          <>
            <div className="grid grid-cols-2 gap-1">
              <div className="text-primary/70">Connection:</div>
              <div
                className={
                  debugData.isConnected ? "text-green-500" : "text-red-500"
                }
              >
                {debugData.isConnected ? "Connected" : "Disconnected"}
              </div>

              <div className="text-primary/70">Address:</div>
              <div className="truncate">{debugData.address || "N/A"}</div>

              <div className="text-primary/70">Chain ID:</div>
              <div>{debugData.chainId}</div>

              <div className="text-primary/70">Chain Name:</div>
              <div>{debugData.chainName}</div>

              <div className="text-primary/70">Balance:</div>
              <div>{debugData.balance} ETH</div>

              <div className="text-primary/70">Minter Contract:</div>
              <div
                className={
                  debugData.minterExists ? "text-green-500" : "text-red-500"
                }
              >
                {debugData.minterExists ? "Exists" : "Not Found"}
              </div>

              <div className="text-primary/70">NFT Contract:</div>
              <div
                className={
                  debugData.nftExists ? "text-green-500" : "text-red-500"
                }
              >
                {debugData.nftExists ? "Exists" : "Not Found"}
              </div>
            </div>

            {(!debugData.minterExists || !debugData.nftExists) && (
              <div className="mt-2 p-2 bg-red-900/30 border border-red-700 rounded">
                <p className="text-red-400 mb-1">Contract Issue Detected!</p>
                <p className="text-primary/80">
                  One or more contracts not found at the expected addresses.
                </p>
              </div>
            )}

            {debugData.actualNodeChainId && (
              <div className="grid grid-cols-2 gap-1 mt-2">
                <div className="text-primary/70">Node Chain ID:</div>
                <div>
                  {debugData.actualNodeChainId} (decimal:{" "}
                  {parseInt(debugData.actualNodeChainId, 16)})
                </div>
              </div>
            )}

            {debugData.chainId !==
              parseInt(debugData.actualNodeChainId || "0x0", 16) && (
              <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded">
                <p className="text-yellow-400 mb-1">Network Mismatch!</p>
                <p className="text-primary/80 mb-1">
                  MetaMask Chain ID: {debugData.chainId || "Unknown"}
                  <br />
                  Node Chain ID:{" "}
                  {debugData.actualNodeChainId
                    ? parseInt(debugData.actualNodeChainId, 16)
                    : "Unknown"}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => addLocalNetwork()}
                    className="px-2 py-1 bg-yellow-800 hover:bg-yellow-700 text-yellow-200 rounded flex-1"
                  >
                    Auto-Fix
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // Try to switch to predefined networks as a fallback
                        await window.ethereum.request({
                          method: "wallet_switchEthereumChain",
                          params: [{ chainId: "0x1" }], // Switch to mainnet first (to reset)
                        });
                        setTimeout(async () => {
                          if (debugData?.actualNodeChainId) {
                            // Then switch to our local network
                            await window.ethereum.request({
                              method: "wallet_switchEthereumChain",
                              params: [
                                { chainId: debugData.actualNodeChainId },
                              ],
                            });
                          }
                        }, 500);
                      } catch (error) {
                        console.error("Manual network switch failed:", error);
                      }
                    }}
                    className="px-2 py-1 bg-dark-700 hover:bg-dark-600 text-primary rounded flex-1"
                  >
                    Manual Reset
                  </button>
                </div>
              </div>
            )}

            {Number(debugData.balance) < 0.1 && (
              <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded">
                <p className="text-yellow-400 mb-1">Insufficient Balance!</p>
                <p className="text-primary/80">
                  You need at least 0.1 ETH to mint (plus gas fees).
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            {isLoading ? "Loading debug data..." : "No debug data available"}
          </div>
        )}
      </div>

      <div className="mt-4 text-primary/50 text-center">
        Press Ctrl+Shift+D to toggle this panel
      </div>
    </div>
  );
};

export default DebugInfo;
