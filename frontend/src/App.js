import React from 'react';
import { Web3ReactProvider } from '@web3-react/core';
import { ethers } from 'ethers';
import JurorStaking from './components/JurorStaking';
import WalletConnect from './WalletConnect';
import { getLibrary, configureProvider } from './utils/web3React';
import './App.css';

// Configure the provider
const getLibraryWithConfig = (provider) => {
  const configuredProvider = configureProvider(provider);
  return getLibrary(configuredProvider);
};

function App() {
  return (
    <Web3ReactProvider getLibrary={getLibraryWithConfig}>
      <div className="App">
        <header className="App-header">
          <h1>GRULL Arbitration System</h1>
        </header>
        <main className="App-main">
          <WalletConnect />
          <JurorStaking />
        </main>
        <footer className="App-footer">
          <p>GRULL Arbitration System &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </Web3ReactProvider>
  );
}

export default App;