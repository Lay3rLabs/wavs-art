import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useMint } from "../contexts/MintContext";
import { IPFS_GATEWAY_URL } from "@/constants";
import { getNftContract } from "@/utils/clients";

const NFTDetailPage: React.FC = () => {
  const { tokenId } = useParams<{ tokenId: string }>();
  const { ownedNfts } = useMint();
  const navigate = useNavigate();
  const location = useLocation();
  const [nft, setNft] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Extract the source from location state, default to '/' if not provided
  const fromVault = location.state?.fromVault === true;

  const handleBack = () => {
    if (fromVault) {
      navigate("/");
    } else {
      navigate("/explorer");
    }
  };

  useEffect(() => {
    const loadNFT = async () => {
      try {
        // First try to find the NFT in ownedNfts
        const foundNft = ownedNfts.find((n) => n.tokenId === tokenId);

        if (foundNft) {
          setNft(foundNft);
          setLoading(false);
          return;
        }

        // If not found in ownedNfts, load from contract
        const nftContract = getNftContract();

        try {
          // Check if token exists by trying to get its URI
          const tokenURI = await nftContract.tokenURI(tokenId);
          const owner = await nftContract.ownerOf(tokenId);

          // Fetch metadata
          let metadata = null;
          let imageUrl = null;

          try {
            const isIpfs = tokenURI.startsWith("ipfs://");
            const metadataUrl = isIpfs
              ? tokenURI.replace("ipfs://", IPFS_GATEWAY_URL)
              : tokenURI;

            const response = await fetch(metadataUrl);
            metadata = await response.json();

            if (metadata.image) {
              imageUrl = metadata.image.startsWith("ipfs://")
                ? metadata.image.replace("ipfs://", IPFS_GATEWAY_URL)
                : metadata.image;
            }
          } catch (metadataError) {
            console.error(
              `Error fetching metadata for token ${tokenId}:`,
              metadataError
            );
          }

          // Set the NFT data
          setNft({
            tokenId: tokenId,
            tokenURI,
            imageUrl,
            metadata,
            owner,
          });
        } catch (contractError) {
          console.error(`Error loading NFT from contract:`, contractError);
          setError(true);
        }
      } catch (error) {
        console.error("Error in loadNFT:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadNFT();
  }, [tokenId, ownedNfts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-800 text-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!nft || error) {
    return (
      <div className="min-h-screen bg-dark-800 text-primary flex flex-col items-center justify-center p-4">
        <div className="card max-w-2xl w-full p-6">
          <h2 className="text-xl font-glitch mb-4 text-danger">
            ERROR::NFT_NOT_FOUND
          </h2>
          <p className="mb-6 font-mono text-primary/70">
            The requested asset #{tokenId} could not be located in your vault or
            on the blockchain.
          </p>
          <button onClick={handleBack} className="btn btn-primary font-mono">
            {fromVault ? "RETURN_TO_VAULT" : "RETURN_TO_EXPLORER"}
          </button>
        </div>
      </div>
    );
  }

  // Extract metadata
  const { metadata, imageUrl } = nft;

  return (
    <div className="min-h-screen bg-dark-800 text-primary p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="mb-4 sm:mb-6 flex items-center text-accent hover:text-accent/80 transition-colors font-mono text-xs sm:text-sm"
        >
          <svg
            className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12H5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 19L5 12L12 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {fromVault ? "RETURN_TO_VAULT" : "RETURN_TO_EXPLORER"}
        </button>

        <div className="card overflow-hidden border border-primary/30">
          {/* Terminal header */}
          <div className="h-6 bg-dark-800 flex items-center">
            <div className="flex space-x-1 px-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <div className="w-2 h-2 rounded-full bg-secondary"></div>
              <div className="w-2 h-2 rounded-full bg-accent"></div>
            </div>
            <div className="mx-auto font-mono text-xs text-primary/70 truncate">
              WAVS::NFT_ASSET::#{tokenId}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
            {/* Image section */}
            <div className="relative w-full">
              <div className="relative aspect-square">
                {/* Tech frame for the image */}
                <div className="absolute -inset-px border border-primary/30"></div>

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

                {/* NFT Image */}
                {imageUrl ? (
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={metadata?.name || `NFT #${tokenId}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-dark-900 flex items-center justify-center">
                    <div className="border-2 border-primary p-4">
                      <p className="text-primary/70 font-mono">NO_IMAGE_DATA</p>
                    </div>
                  </div>
                )}

                {/* Token ID overlay */}
                <div className="absolute top-4 left-4 bg-dark-900/80 backdrop-blur-sm border border-primary/50 px-2 sm:px-3 py-1 sm:py-2">
                  <div className="text-primary font-mono text-sm">
                    #{tokenId}
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata section */}
            <div className="space-y-4 sm:space-y-6">
              {/* Title */}
              <div>
                <h1 className="text-xl sm:text-2xl font-glitch mb-2 relative">
                  <span className="text-primary mr-2">[</span>
                  {metadata?.name || "UNNAMED_ASSET"}
                  <span className="text-primary ml-2">]</span>
                </h1>

                {/* Blockchain info */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono text-primary/60">
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-accent animate-pulse mr-1 sm:mr-2"></span>
                    <span>VERIFIED</span>
                  </div>
                  <div className="hidden sm:block">
                    IPFS::{nft.tokenURI.substring(0, 20)}...
                  </div>
                  <div className="sm:hidden">
                    IPFS::{nft.tokenURI.substring(0, 10)}...
                  </div>
                  <a
                    href={nft.tokenURI.replace("ipfs://", IPFS_GATEWAY_URL)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    VIEW_METADATA
                  </a>
                </div>
              </div>

              {/* Description */}
              {metadata?.description && (
                <div className="space-y-2">
                  <div className="font-mono text-sm text-primary/80 border-b border-dark-700 pb-1">
                    DESCRIPTION
                  </div>
                  <div className="font-mono text-sm text-primary/90 leading-relaxed whitespace-pre-line">
                    {metadata.description}
                  </div>
                </div>
              )}

              {/* Attributes */}
              {metadata?.attributes && metadata.attributes.length > 0 && (
                <div className="space-y-3">
                  <div className="font-mono text-sm text-primary/80 border-b border-dark-700 pb-1">
                    ATTRIBUTES
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {metadata.attributes.map((attr: any, i: number) => (
                      <div
                        key={i}
                        className="border border-dark-700 bg-dark-900/50 p-3"
                      >
                        <div className="text-xs text-primary/60 font-mono mb-1">
                          {attr.trait_type}
                        </div>
                        <div className="text-sm text-accent font-mono">
                          {attr.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* On-chain data */}
              <div className="space-y-3">
                <div className="font-mono text-sm text-primary/80 border-b border-dark-700 pb-1">
                  BLOCKCHAIN_DATA
                </div>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-primary/60">Token ID:</span>
                    <span className="text-primary">{tokenId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary/60">Token Standard:</span>
                    <span className="text-primary">ERC-721</span>
                  </div>
                  <div className="flex flex-col sm:flex-row">
                    <span className="text-primary/60 sm:mr-2">Token URI:</span>
                    <span className="text-primary break-all text-xs">
                      {nft.tokenURI}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTDetailPage;
