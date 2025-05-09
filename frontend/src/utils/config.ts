import {
  getDefaultWallets,
  connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { configureChains, createConfig } from 'wagmi';
import { mainnet, sepolia, holesky } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { defineChain } from 'viem';

export const localhost = defineChain({
  id: 31337,
  name: 'Localhost',
  network: 'localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
})

export const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, holesky, sepolia, localhost],
  [
    jsonRpcProvider({
      rpc: () => ({
        http: 'http://localhost:8545',
      }),
    }),
    publicProvider()
  ]
);

const { wallets } = getDefaultWallets({
  appName: 'Wavs NFT Generator',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Replace with your WalletConnect project ID in production
  chains,
});

const connectors = connectorsForWallets(wallets);

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});
