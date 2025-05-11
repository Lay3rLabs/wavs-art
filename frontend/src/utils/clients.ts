import { ethers } from "ethers";
import WavsNftABI from "@/abis/WavsNft.json";
import WavsMinterABI from "../abis/WavsMinter.json";
import REWARDS_DISTRIBUTOR_ABI from "@/abis/UniversalRewardsDistributor.json";
import { getNetwork, getWalletClient } from "wagmi/actions";
import {
  NFT_CONTRACT_ADDRESS,
  MINTER_CONTRACT_ADDRESS,
  REWARD_DISTRIBUTOR_ADDRESS,
} from "@/constants";
import { chains } from "./config";

export const getBrowserProviderWalletSigner = async () => {
  const walletClient = await getWalletClient();
  if (!walletClient) {
    throw new Error("No wallet client found");
  }
  const provider = new ethers.BrowserProvider({
    request: walletClient.request.bind(walletClient),
  } as any);
  const signer = await provider.getSigner();
  return {
    provider,
    signer,
  };
};

export const getDistributorContract = (
  address = REWARD_DISTRIBUTOR_ADDRESS,
  signer?: ethers.ContractRunner
) => {
  return new ethers.Contract(
    address,
    REWARDS_DISTRIBUTOR_ABI,
    signer || getProvider()
  );
};

export const getMinterContract = (
  address = MINTER_CONTRACT_ADDRESS,
  signer?: ethers.ContractRunner
) => {
  return new ethers.Contract(address, WavsMinterABI, signer || getProvider());
};

export const getNftContract = (
  address = NFT_CONTRACT_ADDRESS,
  signer?: ethers.ContractRunner
) => {
  return new ethers.Contract(address, WavsNftABI, signer || getProvider());
};

export const getProvider = () => {
  const chain = getNetwork()?.chain || chains[0];
  let rpcUrl = chain.rpcUrls.default.http[0];
  if (!rpcUrl) {
    console.error("No RPC URL found", chain);
    rpcUrl = 'http://localhost:8545';
  }
  return new ethers.JsonRpcProvider(rpcUrl);
};
