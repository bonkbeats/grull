import React, { useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { 
  isMetaMaskInstalled, 
  requestAccounts, 
  getChainId, 
  getNetworkName 
} from './utils/metamask';
import './WalletConnect.css';

// Create an injected connector for MetaMask
const injected = new InjectedConnector({
  supportedChainIds: [1, 3, 4, 5, 42, 56, 97, 137, 80001, 1337], // Including Hardhat
});

const WalletConnect = () => {
  const { active, account, activate, deactivate, error: web3Error } = useWeb3React();
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected, error
  const [error, setError] = useState(null);
  const [networkInfo, setNetworkInfo] = useState({ chainId: null, networkName: null });

  // Handle connection state changes
  useEffect(() => {
    if (active && account) {
      setConnectionState('connected');
      setError(null);
      updateNetworkInfo();
    } else if (web3Error) {
      setConnectionState('error');
      setError(web3Error.message);
    }
  }, [active, account, web3Error]);

  // Update network information
  const updateNetworkInfo = async () => {
    try {
      const chainId = await getChainId();
      setNetworkInfo({
        chainId,
        networkName: getNetworkName(chainId)
      });
    } catch (err) {
      console.error('Error getting network info:', err);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      setConnectionState('connecting');
      setError(null);

      if (!isMetaMaskInstalled()) {
        throw new Error('Please install MetaMask to connect your wallet');
      }

      await requestAccounts();
      await activate(injected);
      
      // Network info will be updated by the useEffect when connection is active
    } catch (err) {
      console.error('Connection error:', err);
      setConnectionState('error');
      setError(err.message || 'Failed to connect wallet');
      deactivate();
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    try {
      deactivate();
      setConnectionState('disconnected');
      setError(null);
      setNetworkInfo({ chainId: null, networkName: null });
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(err.message);
    }
  };

  // Render different content based on connection state
  const renderContent = () => {
    switch (connectionState) {
      case 'connected':
        return (
          <div className="wallet-connected">
            <div className="wallet-info">
              <h3>Connected Wallet</h3>
              <p className="account">
                <strong>Account:</strong> 
                <span title={account}>{`${account.slice(0, 6)}...${account.slice(-4)}`}</span>
              </p>
              {networkInfo.networkName && (
                <p className="network">
                  <strong>Network:</strong> {networkInfo.networkName}
                </p>
              )}
            </div>
            <button 
              onClick={disconnectWallet}
              className="disconnect-button"
            >
              Disconnect
            </button>
          </div>
        );

      case 'connecting':
        return (
          <div className="wallet-connecting">
            <div className="connecting-spinner"></div>
            <p>Connecting to MetaMask...</p>
          </div>
        );

      case 'error':
        return (
          <div className="wallet-error">
            <p className="error-message">{error}</p>
            <button 
              onClick={connectWallet}
              className="retry-button"
            >
              Retry Connection
            </button>
          </div>
        );

      default: // disconnected
        return (
          <div className="wallet-disconnected">
            <p className="connect-prompt">Connect your wallet to use GRULL</p>
            {!isMetaMaskInstalled() ? (
              <div className="metamask-prompt">
                <p>MetaMask is not installed</p>
                <a 
                  href="https://metamask.io/download.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="install-button"
                >
                  Install MetaMask
                </a>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                className="connect-button"
              >
                Connect Wallet
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className="wallet-connect">
      <h2>Wallet Connection</h2>
      {renderContent()}
    </div>
  );
};

export default WalletConnect;
