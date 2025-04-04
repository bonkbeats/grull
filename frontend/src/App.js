import React from 'react';
import { Web3ReactProvider } from '@web3-react/core';
import { BrowserProvider } from 'ethers';
import JurorStaking from './components/JurorStaking';
import './App.css';

// This function is used by Web3React to create an ethers provider
// It's compatible with ethers v6.x
function getLibrary(provider) {
  return new BrowserProvider(provider);
}

function App() {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <div className="App">
        <JurorStaking />
      </div>
    </Web3ReactProvider>
  );
}

export default App;