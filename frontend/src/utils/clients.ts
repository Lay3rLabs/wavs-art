import { ethers } from "ethers";
import WAVS_NFT_ABI from "@/abis/WavsNft.json";
import WAVS_MINTER_ABI from "../abis/WavsMinter.json";
import REWARD_DISTRIBUTOR_ABI from "@/abis/RewardDistributor.json";
import ERC20_ABI from "@/abis/ERC20.json";
import { getWalletClient } from "wagmi/actions";
import { getAccount } from "@wagmi/core";
import {
  NFT_CONTRACT_ADDRESS,
  MINTER_CONTRACT_ADDRESS,
  REWARD_DISTRIBUTOR_ADDRESS,
  REWARD_TOKEN_ADDRESS,
  IS_LOCALHOST,
} from "@/constants";
import { chains, HOLESKY_RPC_URL } from "./config";
import { wagmiConfig } from "./config";

export const getBrowserProviderWalletSigner = async () => {
  const walletClient = await getWalletClient(wagmiConfig);
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

export const getRewardDistributorContract = (
  address = REWARD_DISTRIBUTOR_ADDRESS,
  signer?: ethers.ContractRunner
) => {
  return new ethers.Contract(
    address,
    REWARD_DISTRIBUTOR_ABI,
    signer || getProvider()
  );
};

export const getRewardTokenContract = (
  address = REWARD_TOKEN_ADDRESS,
  signer?: ethers.ContractRunner
) => {
  return new ethers.Contract(address, ERC20_ABI, signer || getProvider());
};

export const getMinterContract = (
  address = MINTER_CONTRACT_ADDRESS,
  signer?: ethers.ContractRunner
) => {
  return new ethers.Contract(address, WAVS_MINTER_ABI, signer || getProvider());
};

export const getNftContract = (
  address = NFT_CONTRACT_ADDRESS,
  signer?: ethers.ContractRunner
) => {
  return new ethers.Contract(address, WAVS_NFT_ABI, signer || getProvider());
};

export const getProvider = () => {
  const chain = getAccount(wagmiConfig)?.chain || chains[0];
  let rpcUrl = (IS_LOCALHOST ? "http://127.0.0.1:8545" : HOLESKY_RPC_URL) || chain.rpcUrls.default.http[0];
  if (!rpcUrl) {
    console.error("No RPC URL found", chain);
    rpcUrl = "http://127.0.0.1:8545";
  }
  return new ethers.JsonRpcProvider(rpcUrl);
};
