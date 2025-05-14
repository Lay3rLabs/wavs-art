import {
  getDefaultWallets,
  connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { configureChains, createConfig } from 'wagmi';
import {  holesky } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { Chain, defineChain } from 'viem';
import { IS_LOCALHOST } from '@/constants';

export const localhost = defineChain({
  id: 17_000,
  name: 'Localhost Holesky fork',
  network: 'localhost_holesky',
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

const _chains: Chain[] = IS_LOCALHOST ? [localhost] : [holesky];

export const { chains, publicClient, webSocketPublicClient } = configureChains(
  _chains,
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: chain.rpcUrls.default.http[0],
      }),
    }),
    publicProvider()
  ]
);

const { wallets } = getDefaultWallets({
  appName: 'WAVS Art',
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
