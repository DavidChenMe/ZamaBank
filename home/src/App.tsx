import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { sepolia } from 'wagmi/chains';

import '@rainbow-me/rainbowkit/styles.css';

import ZamaBankApp from './components/ZamaBankApp';

const config = getDefaultConfig({
  appName: 'ZamaBank',
  projectId: 'YOUR_PROJECT_ID', // Get this from WalletConnect
  chains: [sepolia],
  ssr: false,
});

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div className="App">
            <ZamaBankApp />
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;