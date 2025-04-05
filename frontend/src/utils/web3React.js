/**
 * Web3React utility functions for configuring the Web3React provider
 * This file provides configuration for Web3React to work properly with MetaMask
 */

import { ethers } from 'ethers';

/**
 * Get the library for Web3React
 * @param {Object} provider - The Ethereum provider
 * @returns {Object} The ethers.js provider
 */
export function getLibrary(provider) {
  // For ethers v6, we need to use BrowserProvider
  return new ethers.BrowserProvider(provider);
}

/**
 * Configure the Web3React provider
 * @param {Object} provider - The Ethereum provider
 * @returns {Object} The configured provider
 */
export function configureProvider(provider) {
  if (!provider) return provider;
  
  // Create a proxy to intercept deprecated methods
  const proxyProvider = new Proxy(provider, {
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
  
  // Add event listeners for MetaMask events
  if (proxyProvider.on) {
    // Remove any existing listeners to avoid duplicates
    proxyProvider.removeAllListeners?.();
    
    // Add event listeners using the modern methods
    proxyProvider.on('accountsChanged', (accounts) => {
      // Handle accounts changed
      console.log('Accounts changed:', accounts);
    });
    
    // Use chainChanged instead of networkChanged
    proxyProvider.on('chainChanged', (chainId) => {
      // Handle chain changed
      console.log('Chain changed:', chainId);
      // Reload the page as recommended by MetaMask
      window.location.reload();
    });
    
    // Use disconnect instead of close
    proxyProvider.on('disconnect', (error) => {
      // Handle disconnect
      console.log('Disconnected:', error);
    });
  }
  
  return proxyProvider;
} 