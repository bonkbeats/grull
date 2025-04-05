/**
 * MetaMask utility functions for handling wallet connections
 * This file provides modern methods for interacting with MetaMask
 * following the EIP-1193 standard
 */

/**
 * Check if MetaMask is installed
 * @returns {boolean} True if MetaMask is installed
 */
export const isMetaMaskInstalled = () => {
  return typeof window.ethereum !== 'undefined';
};

/**
 * Request account access from MetaMask
 * @returns {Promise<string[]>} Array of account addresses
 */
export const requestAccounts = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }
  
  try {
    // Use the modern request method
    return await window.ethereum.request({ method: 'eth_requestAccounts' });
  } catch (error) {
    console.error('Error requesting accounts:', error);
    throw error;
  }
};

/**
 * Get the current chain ID
 * @returns {Promise<string>} Chain ID as a hex string
 */
export const getChainId = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }
  
  try {
    // Use the modern request method
    return await window.ethereum.request({ method: 'eth_chainId' });
  } catch (error) {
    console.error('Error getting chain ID:', error);
    throw error;
  }
};

/**
 * Get the current accounts
 * @returns {Promise<string[]>} Array of account addresses
 */
export const getAccounts = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }
  
  try {
    // Use the modern request method
    return await window.ethereum.request({ method: 'eth_accounts' });
  } catch (error) {
    console.error('Error getting accounts:', error);
    throw error;
  }
};

/**
 * Add event listeners for MetaMask events
 * @param {Object} handlers - Object containing event handlers
 * @param {Function} handlers.accountsChanged - Handler for accountsChanged event
 * @param {Function} handlers.chainChanged - Handler for chainChanged event
 * @param {Function} handlers.disconnect - Handler for disconnect event
 * @returns {Function} Function to remove the event listeners
 */
export const addMetaMaskListeners = (handlers) => {
  if (!isMetaMaskInstalled()) {
    return () => {};
  }
  
  const { accountsChanged, chainChanged, disconnect } = handlers;
  
  // Create a proxy to intercept deprecated methods
  const ethereum = new Proxy(window.ethereum, {
    get(target, prop) {
      // Intercept deprecated 'send' method
      if (prop === 'send') {
        console.warn('ethereum.send() is deprecated. Use ethereum.request() instead.');
        return async (method, params) => {
          return target.request({ method, params });
        };
      }
      return target[prop];
    }
  });
  
  // Add event listeners using the modern methods
  if (accountsChanged) {
    ethereum.on('accountsChanged', accountsChanged);
  }
  
  if (chainChanged) {
    ethereum.on('chainChanged', chainChanged);
  }
  
  if (disconnect) {
    ethereum.on('disconnect', disconnect);
  }
  
  // Return a function to remove the event listeners
  return () => {
    if (accountsChanged) {
      ethereum.removeListener('accountsChanged', accountsChanged);
    }
    
    if (chainChanged) {
      ethereum.removeListener('chainChanged', chainChanged);
    }
    
    if (disconnect) {
      ethereum.removeListener('disconnect', disconnect);
    }
  };
};

/**
 * Get the network name from a chain ID
 * @param {string} chainId - Chain ID as a hex string
 * @returns {string} Network name
 */
export const getNetworkName = (chainId) => {
  switch (chainId) {
    case '0x1':
      return 'Ethereum Mainnet';
    case '0x3':
      return 'Ropsten Testnet';
    case '0x4':
      return 'Rinkeby Testnet';
    case '0x5':
      return 'Goerli Testnet';
    case '0x2a':
      return 'Kovan Testnet';
    case '0x89':
      return 'Polygon Mainnet';
    case '0x13881':
      return 'Mumbai Testnet';
    case '0x539':
      return 'Hardhat Network';
    default:
      return 'Unknown Network';
  }
}; 