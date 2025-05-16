import React, { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useNFTExplorer } from "@/contexts/NFTExplorerContext";
import { IPFS_GATEWAY_URL } from "@/constants";

const NFTExplorer: React.FC = () => {
  const { nfts, loading, hasMore, loadNFTs } = useNFTExplorer();
  const observer = useRef<IntersectionObserver | null>(null);
  const navigate = useNavigate();

  // Set up the intersection observer for infinite scroll
  const lastNftElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;

      // Always disconnect the previous observer before creating a new one
      if (observer.current) {
        observer.current.disconnect();
      }

      // Create new observer with smaller threshold and rootMargin to trigger earlier
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            console.log("Intersection observed - loading more NFTs");
            loadNFTs();
          }
        },
        {
          threshold: 0.1, // Trigger when at least 10% of the element is visible
          rootMargin: "100px", // Start loading before the element is fully visible
        }
      );

      if (node) {
        console.log("Observing last element", node);
        observer.current.observe(node);
      }
    },
    [loading, hasMore, loadNFTs]
  );

  // Initial load - only load if we don't have any NFTs yet
  useEffect(() => {
    if (nfts.length === 0) {
      loadNFTs();
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loadNFTs, nfts.length]);

  // Network metrics for cyberpunk UI
  const networkLatency = Math.floor(Math.random() * 30) + 15;
  const totalNfts = nfts.length;

  return (
    <div className="card relative">
      <div className="absolute top-0 left-0 w-full h-6 bg-dark-800 flex items-center">
        <div className="flex space-x-1 px-2">
          <div className="w-2 h-2 rounded-full bg-accent"></div>
          <div className="w-2 h-2 rounded-full bg-warning"></div>
          <div className="w-2 h-2 rounded-full bg-primary"></div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <span className="font-mono text-xs text-primary/70">
            GLOBAL::NFT_INDEX
          </span>
        </div>
      </div>

      <div className="p-4 pt-8">
        {/* Network metrics display */}
        <div className="mb-4 font-mono text-xs text-primary/60 flex justify-between border-b border-dark-700 pb-2">
          <div>NETWORK_LATENCY: {networkLatency}ms</div>
          <div>INDEXED_ASSETS: {totalNfts}</div>
          <div>STATUS: {loading ? "SCANNING" : "ONLINE"}</div>
        </div>

        {nfts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nfts.map((nft, index) => {
              // If this is the last NFT, attach the ref for infinite scroll
              const isLastElement = index === nfts.length - 1;

              return (
                <div
                  key={nft.tokenId}
                  ref={isLastElement ? lastNftElementRef : null}
                  className="relative border group cursor-pointer transition-all bg-dark-800 overflow-hidden border-dark-600 hover:border-primary/30"
                  onClick={() => {
                    navigate(`/nft/${nft.tokenId}`);
                    window.scrollTo(0, 0);
                  }}
                >
                  {/* Status indicator */}
                  <div className="absolute top-0 right-0 border-l border-b border-dark-600 px-2 py-1 text-[10px] font-mono text-primary">
                    VERIFIED
                  </div>

                  {/* Token ID badge */}
                  <div className="absolute top-3 left-3 z-20 bg-dark-900/80 backdrop-blur-sm border border-primary/50 px-2 py-1">
                    <div className="text-primary font-mono text-sm">
                      #{nft.tokenId}
                    </div>
                  </div>

                  {/* Image frame */}
                  <div className="relative">
                    {/* Scanlines effect */}
                    <div className="absolute inset-0 z-10 pointer-events-none">
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(to bottom, transparent 0px, transparent 1px, rgba(0, 255, 65, 0.03) 1px, rgba(0, 255, 65, 0.03) 2px)",
                          backgroundSize: "100% 2px",
                        }}
                      ></div>
                    </div>

                    {nft.imageUrl ? (
                      <div className="relative h-48 overflow-hidden group-hover:opacity-90 transition-opacity">
                        <img
                          src={nft.imageUrl}
                          alt={`NFT #${nft.tokenId}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 to-transparent opacity-60"></div>
                      </div>
                    ) : (
                      <div className="h-48 bg-dark-900 flex items-center justify-center">
                        <div className="border-2 border-primary p-2">
                          <p className="text-xs text-primary/70 font-mono">
                            NO_IMAGE_DATA
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* NFT info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-primary/90">
                        {nft.metadata?.name || "UNNAMED_ASSET"}
                      </div>
                      <div className="flex space-x-2">
                        {/* View details button */}
                        <button
                          className="text-[10px] border border-accent/70 px-1 font-mono text-accent"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/nft/${nft.tokenId}`);
                            window.scrollTo(0, 0);
                          }}
                        >
                          VIEW
                        </button>
                        {/* Technical details button */}
                        <button
                          className="text-[10px] border border-primary/40 px-1 font-mono text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              nft.tokenURI.replace("ipfs://", IPFS_GATEWAY_URL),
                              "_blank"
                            );
                          }}
                        >
                          IPFS_DATA
                        </button>
                      </div>
                    </div>

                    {/* Owner address */}
                    <div className="mt-2 font-mono text-xs">
                      <div className="text-primary/60">OWNER::</div>
                      <div className="pl-2 text-primary/90 truncate">
                        {nft.owner}
                      </div>
                    </div>

                    {/* Description if available */}
                    {nft.metadata?.description && (
                      <div className="mt-2 font-mono text-xs">
                        <div className="console-output text-[10px]">
                          <div className="text-primary/60">DESC::</div>
                          <div className="pl-2 text-primary/90 mb-2 line-clamp-3 group-hover:line-clamp-none transition-all">
                            {nft.metadata.description}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            {loading ? (
              <div className="inline-block relative">
                <div className="absolute inset-0 bg-cyber-gradient opacity-20 animate-pulse rounded-full"></div>
                <div className="relative animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-primary font-mono text-sm">LOAD</span>
                </div>
              </div>
            ) : (
              <div className="font-mono text-primary/70">NO_ASSETS_FOUND</div>
            )}
          </div>
        )}

        {/* Loading indicator at the bottom */}
        {loading && nfts.length > 0 && (
          <div className="text-center py-8">
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-cyber-gradient opacity-20 animate-pulse rounded-full"></div>
              <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </div>
        )}

        {/* Manual load more button as a fallback */}
        {!loading && hasMore && nfts.length > 0 && (
          <div className="text-center py-8">
            <button
              onClick={() => loadNFTs()}
              className="font-mono text-sm text-primary border border-primary/50 px-4 py-2 hover:bg-primary/10 transition-colors"
            >
              LOAD_MORE_DATA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTExplorer;
