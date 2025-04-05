import React, { useState } from 'react';
import './MetaMaskTroubleshooting.css';

const MetaMaskTroubleshooting = () => {
  const [activeTab, setActiveTab] = useState('installation');

  return (
    <div className="troubleshooting-container">
      <h2>MetaMask Connection Troubleshooting</h2>
      
      <div className="tabs">
        <button 
          className={activeTab === 'installation' ? 'active' : ''} 
          onClick={() => setActiveTab('installation')}
        >
          Installation
        </button>
        <button 
          className={activeTab === 'connection' ? 'active' : ''} 
          onClick={() => setActiveTab('connection')}
        >
          Connection Issues
        </button>
        <button 
          className={activeTab === 'network' ? 'active' : ''} 
          onClick={() => setActiveTab('network')}
        >
          Network Issues
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'installation' && (
          <div>
            <h3>MetaMask Installation</h3>
            <ol>
              <li>
                <strong>Install MetaMask Extension</strong>
                <p>Visit the <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask website</a> and install the extension for your browser.</p>
              </li>
              <li>
                <strong>Create or Import a Wallet</strong>
                <p>Follow the setup wizard to create a new wallet or import an existing one.</p>
              </li>
              <li>
                <strong>Verify Installation</strong>
                <p>Check that the MetaMask icon appears in your browser toolbar.</p>
              </li>
              <li>
                <strong>Refresh the Application</strong>
                <p>After installing MetaMask, refresh this application and try connecting again.</p>
              </li>
            </ol>
          </div>
        )}
        
        {activeTab === 'connection' && (
          <div>
            <h3>Connection Issues</h3>
            <ol>
              <li>
                <strong>Check MetaMask Status</strong>
                <p>Make sure MetaMask is unlocked and you're logged in.</p>
              </li>
              <li>
                <strong>Clear Browser Cache</strong>
                <p>Try clearing your browser cache and cookies, then refresh the page.</p>
              </li>
              <li>
                <strong>Check Console for Errors</strong>
                <p>Open your browser's developer tools (F12) and check the console for any error messages.</p>
              </li>
              <li>
                <strong>Try a Different Browser</strong>
                <p>If issues persist, try using a different browser with MetaMask installed.</p>
              </li>
              <li>
                <strong>Reinstall MetaMask</strong>
                <p>As a last resort, try uninstalling and reinstalling the MetaMask extension.</p>
              </li>
            </ol>
          </div>
        )}
        
        {activeTab === 'network' && (
          <div>
            <h3>Network Issues</h3>
            <ol>
              <li>
                <strong>Check Network Selection</strong>
                <p>Make sure you're connected to the correct network (Localhost 8545 for local development).</p>
              </li>
              <li>
                <strong>Add Local Network</strong>
                <p>If using a local Hardhat network, add it to MetaMask with these settings:</p>
                <ul>
                  <li>Network Name: Hardhat Local</li>
                  <li>RPC URL: http://127.0.0.1:8545</li>
                  <li>Chain ID: 31337</li>
                  <li>Currency Symbol: ETH</li>
                </ul>
              </li>
              <li>
                <strong>Import Test Accounts</strong>
                <p>For local development, import one of the test accounts provided by Hardhat:</p>
                <ul>
                  <li>Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</li>
                  <li>This account has 10000 ETH on the local network</li>
                </ul>
              </li>
              <li>
                <strong>Check Contract Deployment</strong>
                <p>Ensure the contracts are properly deployed to the network you're connected to.</p>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetaMaskTroubleshooting; 