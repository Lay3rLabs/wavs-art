import React, { createContext, useState, useContext, ReactNode, useCallback, useRef } from 'react';
import { getNftContract } from "@/utils/clients";
import { IPFS_GATEWAY_URL } from "@/constants";

interface NFT {
  tokenId: string;
  tokenURI: string;
  imageUrl: string | null;
  metadata: any;
  owner: string;
}

interface NFTExplorerContextType {
  nfts: NFT[];
  loading: boolean;
  hasMore: boolean;
  loadNFTs: () => Promise<void>;
  resetNFTs: () => void;
}

const NFTExplorerContext = createContext<NFTExplorerContextType | undefined>(undefined);

export const useNFTExplorer = () => {
  const context = useContext(NFTExplorerContext);
  if (!context) {
    throw new Error('useNFTExplorer must be used within an NFTExplorerProvider');
  }
  return context;
};

interface NFTExplorerProviderProps {
  children: ReactNode;
}

export const NFTExplorerProvider: React.FC<NFTExplorerProviderProps> = ({ children }) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const alreadyLoadingRef = useRef(false);
  const pageSize = 9; // Number of NFTs per page
  
  // Track the current length of nfts array
  const nftsLengthRef = useRef(0);
  nftsLengthRef.current = nfts.length;

  const loadNFTs = useCallback(async () => {
    if (alreadyLoadingRef.current) {
      return;
    }

    try {
      setLoading(true);
      alreadyLoadingRef.current = true;
      const nftContract = getNftContract();

      // Get the total supply
      const totalSupply = await nftContract.totalSupply();
      const totalSupplyNum = Number(totalSupply);

      // Calculate the start index for this page using the ref
      const startIdx = nftsLengthRef.current;
      
      if (startIdx >= totalSupplyNum) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Calculate how many NFTs to fetch (up to pageSize)
      const count = Math.min(pageSize, totalSupplyNum - startIdx);
      let newNfts: NFT[] = [];

      // Fetch NFTs for this page
      for (let i = 0; i < count; i++) {
        const index = startIdx + i;
        const tokenId = await nftContract.tokenByIndex(index);
        const tokenIdStr = tokenId.toString();

        // We'll check for duplicates later in a functional update

        const [tokenURI, owner] = await Promise.all([
          nftContract.tokenURI(tokenId),
          nftContract.ownerOf(tokenId),
        ]);

        let metadata = null;
        let imageUrl = null;

        try {
          // Assume tokenURI is either IPFS or HTTP URL
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
        } catch (error) {
          console.error(`Error fetching metadata for token ${tokenId}:`, error);
        }

        newNfts.push({
          tokenId: tokenIdStr,
          tokenURI,
          imageUrl,
          metadata,
          owner,
        });
      }

      // Only update if we have new NFTs to add, and use functional update
      // to ensure we're working with the latest state
      if (newNfts.length > 0) {
        setNfts(prevNfts => {
          // Filter out any duplicates based on the current state
          const filteredNewNfts = newNfts.filter(
            newNft => !prevNfts.some(existing => existing.tokenId === newNft.tokenId)
          );
          return [...prevNfts, ...filteredNewNfts];
        });
      }

      setHasMore(startIdx + count < totalSupplyNum);
    } catch (error) {
      console.error("Error loading NFTs:", error);
    } finally {
      setLoading(false);
      alreadyLoadingRef.current = false;
    }
  }, []);

  const resetNFTs = useCallback(() => {
    setNfts([]);
    setHasMore(true);
    nftsLengthRef.current = 0;
  }, []);

  return (
    <NFTExplorerContext.Provider value={{ nfts, loading, hasMore, loadNFTs, resetNFTs }}>
      {children}
    </NFTExplorerContext.Provider>
  );
}; 