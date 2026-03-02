import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { holesky } from 'wagmi/chains';
import { defineChain, http } from 'viem';
import { IS_LOCALHOST } from '@/constants';

export const HOLESKY_RPC_URL =
  (import.meta.env.VITE_RPC_URL as string) ||
  'https://holesky.drpc.org';

export const localhost = defineChain({
  id: 17_000,
  name: 'Localhost Holesky fork',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
});

export const chains = IS_LOCALHOST
  ? [localhost] as const
  : [holesky] as const;

export const wagmiConfig = getDefaultConfig({
  appName: 'WAVS Art',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains,
  transports: IS_LOCALHOST
    ? { [localhost.id]: http('http://127.0.0.1:8545') }
    : { [holesky.id]: http(HOLESKY_RPC_URL) },
});
