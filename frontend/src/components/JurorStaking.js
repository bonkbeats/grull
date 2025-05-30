import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { JUROR_STAKING_ADDRESS, TOKEN_ADDRESS } from '../config';
import JurorStakingABI from '../contracts/JurorStaking.json';
import TokenABI from '../contracts/GRULLToken.json';
import './JurorStaking.css';

const JurorStaking = () => {
  const { active, account, library } = useWeb3React();
  const [contract, setContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [userStake, setUserStake] = useState('0');
  const [userBalance, setUserBalance] = useState('0');
  const [totalStaked, setTotalStaked] = useState('0');
  const [minimumStake, setMinimumStake] = useState('0');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [disputes, setDisputes] = useState([]);
  const [defendantAddress, setDefendantAddress] = useState('');
  const [reward, setReward] = useState('');
  const [disputeId, setDisputeId] = useState('');
  const [jurorRewards, setJurorRewards] = useState('0');
  const [isApproved, setIsApproved] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  // Initialize contracts
  useEffect(() => {
    if (active && library) {
      try {
        setDebugInfo('Initializing contracts...');
        const provider = library;
        
        // Create contract instances with provider
        const jurorStakingContract = new ethers.Contract(
          JUROR_STAKING_ADDRESS,
          JurorStakingABI.abi,
          provider
        );
        
        const tokenContractInstance = new ethers.Contract(
          TOKEN_ADDRESS,
          TokenABI.abi,
          provider
        );
        
        setContract(jurorStakingContract);
        setTokenContract(tokenContractInstance);
        setDebugInfo('Contracts initialized successfully');

        // Add event listener for DisputeCreated
        jurorStakingContract.on('DisputeCreated', (disputeId, disputant, defendant, reward, event) => {
          console.log('Dispute Created:', { disputeId, disputant, defendant, reward });
          
          // Handle both ethers v5 and v6 event formats
          let parsedDisputeId, parsedDisputant, parsedDefendant, parsedReward;
          
          if (typeof disputeId === 'object' && disputeId.args) {
            // ethers v5 format with event object
            parsedDisputeId = disputeId.args.disputeId;
            parsedDisputant = disputeId.args.disputant;
            parsedDefendant = disputeId.args.defendant;
            parsedReward = disputeId.args.reward;
          } else {
            // ethers v6 format or v5 with separate arguments
            parsedDisputeId = disputeId;
            parsedDisputant = disputant;
            parsedDefendant = defendant;
            parsedReward = reward;
          }
          
          setDisputes((prevDisputes) => {
            // Check if dispute already exists
            const exists = prevDisputes.some(d => d.id === parsedDisputeId);
            if (exists) return prevDisputes;
            
            // Set the dispute ID state variable
            setDisputeId(parsedDisputeId.toString());
            
            return [
              ...prevDisputes,
              {
                id: parsedDisputeId,
                disputant: parsedDisputant, 
                defendant: parsedDefendant,
                reward: ethers.formatEther(parsedReward),
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleString(),
                resolved: false,
                disputantVotes: '0',
                defendantVotes: '0',
                jurors: []
              }
            ];
          });
        });

        // Add event listener for JurorSelected
        jurorStakingContract.on('JurorSelected', (disputeId, juror, weight, event) => {
          console.log('Juror Selected:', { disputeId, juror, weight });
          
          setDisputes((prevDisputes) => {
            return prevDisputes.map(dispute => {
              if (dispute.id === disputeId) {
                // Add the new juror to the jurors array if not already present
                if (!dispute.jurors.includes(juror)) {
                  return {
                    ...dispute,
                    jurors: [...dispute.jurors, juror]
                  };
                }
              }
              return dispute;
            });
          });
        });

        // Clean up the event listeners on component unmount
        return () => {
          jurorStakingContract.removeAllListeners('DisputeCreated');
          jurorStakingContract.removeAllListeners('JurorSelected');
        };
      } catch (error) {
        console.error('Error initializing contracts:', error);
        setError(`Error initializing contracts: ${error.message}`);
        setDebugInfo(`Error initializing contracts: ${error.message}`);
      }
    }
  }, [active, library]);

  // Load user-specific data
  const loadUserData = useCallback(async () => {
    try {
      setDebugInfo('Loading user data...');
      if (!contract || !account || !tokenContract) {
        setDebugInfo('Cannot load user data: contract, account, or token contract is missing');
        return;
      }
      
      setDebugInfo('Getting user stake...');
      // Get user stake
      let userStake;
      try {
        userStake = await contract.stakes(account);
        setUserStake(ethers.formatEther(userStake.amount));
      } catch (error) {
        console.error('Error getting user stake:', error);
        setDebugInfo('Error getting user stake, using 0 as fallback');
        setUserStake('0');
      }
      
      setDebugInfo('Getting user token balance...');
      // Get user token balance
      let userBalance;
      try {
        userBalance = await tokenContract.balanceOf(account);
        setUserBalance(ethers.formatEther(userBalance));
      } catch (error) {
        console.error('Error getting user token balance:', error);
        setDebugInfo('Error getting user token balance, using 0 as fallback');
        setUserBalance('0');
      }
      
      setDebugInfo('Getting juror rewards...');
      // Get juror rewards
      let rewards;
      try {
        rewards = await contract.jurorRewards(account);
        setJurorRewards(ethers.formatEther(rewards));
      } catch (error) {
        console.error('Error getting juror rewards:', error);
        setDebugInfo('Error getting juror rewards, using 0 as fallback');
        setJurorRewards('0');
      }
      
      setDebugInfo('Checking token approval...');
      // Check if token is approved for staking
      try {
        const stakingAddress = await contract.getAddress();
        const allowance = await tokenContract.allowance(account, stakingAddress);
        const formattedAllowance = ethers.formatEther(allowance);
        
        // Always update the approval state based on current allowance and stake amount
        if (stakeAmount && !isNaN(parseFloat(stakeAmount)) && parseFloat(stakeAmount) > 0) {
          const stakeAmountBN = ethers.parseEther(stakeAmount);
          const isApprovedAmount = allowance >= stakeAmountBN;
          setIsApproved(isApprovedAmount);
          setDebugInfo(`Current allowance: ${formattedAllowance} GRULL, Required: ${stakeAmount} GRULL, Approved: ${isApprovedAmount}`);
        } else {
          // If no valid stake amount, set isApproved to false to require explicit approval
          setIsApproved(false);
          setDebugInfo(`Current allowance: ${formattedAllowance} GRULL, No stake amount entered. Please enter an amount to check approval status.`);
        }
      } catch (error) {
        console.error('Error checking token approval:', error);
        setDebugInfo('Error checking token approval, assuming not approved');
        setIsApproved(false);
      }
      
      setDebugInfo('User data loaded successfully');
    } catch (error) {
      console.error('Error loading user data:', error);
      setError(`Error loading user data: ${error.message}`);
      setDebugInfo(`Error loading user data: ${error.message}`);
    }
  }, [contract, account, tokenContract, stakeAmount]);

  // Load contract-wide data
  const loadContractData = useCallback(async () => {
    try {
      setDebugInfo('Loading contract data...');
      if (!contract) {
        setDebugInfo('Cannot load contract data: contract is missing');
        return;
      }
      
      setDebugInfo('Getting total staked amount...');
      // Get total staked amount
      let total;
      try {
        total = await contract.totalStaked();
        setTotalStaked(ethers.formatEther(total));
      } catch (error) {
        console.error('Error getting total staked amount:', error);
        setDebugInfo('Error getting total staked amount, using 0 as fallback');
        setTotalStaked('0');
      }
      
      setDebugInfo('Getting minimum stake requirement...');
      // Get minimum stake requirement
      let min;
      try {
        min = await contract.minimumStake();
        setMinimumStake(ethers.formatEther(min));
      } catch (error) {
        console.error('Error getting minimum stake requirement:', error);
        setDebugInfo('Error getting minimum stake requirement, using 0 as fallback');
        setMinimumStake('0');
      }
      
      setDebugInfo('Getting dispute count...');
      // Get dispute count
      let disputeCount;
      try {
        disputeCount = await contract.getDisputeCount();
      } catch (error) {
        console.error('Error getting dispute count:', error);
        setDebugInfo('Error getting dispute count, using 0 as fallback');
        disputeCount = 0;
      }
      
      // Load disputes
      const loadedDisputes = [];
      for (let i = 0; i < disputeCount; i++) {
        try {
          const dispute = await contract.disputes(i);
          
          // Get the jurors array for this dispute
          let jurors = [];
          try {
            // Try to get the jurors array directly
            jurors = await contract.getJurors(i);
          } catch (error) {
            console.error(`Error getting jurors for dispute ${i}:`, error);
            // If that fails, try to get each juror individually
            for (let j = 0; j < 5; j++) { // Assuming max 5 jurors
              try {
                const juror = await contract.getJuror(i, j);
                if (juror !== ethers.ZeroAddress) {
                  jurors.push(juror);
                }
              } catch (e) {
                // Ignore errors for individual jurors
              }
            }
          }
          
          loadedDisputes.push({
            id: dispute.id,
            disputant: dispute.disputant,
            defendant: dispute.defendant,
            reward: ethers.formatEther(dispute.reward),
            deadline: new Date(dispute.deadline * 1000).toLocaleString(),
            resolved: dispute.resolved,
            disputantVotes: dispute.disputantVotes.toString(),
            defendantVotes: dispute.defendantVotes.toString(),
            jurors: jurors
          });
        } catch (error) {
          console.error(`Error loading dispute ${i}:`, error);
          setDebugInfo(`Error loading dispute ${i}, skipping`);
        }
      }
      
      setDisputes(loadedDisputes);
      setDebugInfo('Contract data loaded successfully');
    } catch (error) {
      console.error('Error loading contract data:', error);
      setError(`Error loading contract data: ${error.message}`);
      setDebugInfo(`Error loading contract data: ${error.message}`);
    }
  }, [contract]);

  // Load data when contracts are initialized
  useEffect(() => {
    if (contract && tokenContract) {
      loadContractData();
    }
  }, [contract, tokenContract, loadContractData]);

  // Load user data when account changes
  useEffect(() => {
    if (contract && tokenContract && account) {
      loadUserData();
    }
  }, [contract, tokenContract, account, loadUserData]);

  // Load user data when stake amount changes to update approval state
  useEffect(() => {
    if (contract && tokenContract && account && stakeAmount && !isNaN(parseFloat(stakeAmount)) && parseFloat(stakeAmount) > 0) {
      // Add a small delay to allow the stake amount to be fully updated
      const timer = setTimeout(() => {
        loadUserData();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [contract, tokenContract, account, stakeAmount, loadUserData]);

  // Approve tokens for staking
  const approveTokens = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo('Approving tokens...');
      
      if (!tokenContract || !contract || !library) {
        throw new Error('Token contract, staking contract, or library not available');
      }

      if (!stakeAmount || isNaN(parseFloat(stakeAmount)) || parseFloat(stakeAmount) <= 0) {
        throw new Error('Please enter a valid stake amount greater than 0');
      }
      
      // Get signer from library
      const signer = await library.getSigner();
      
      // Create a new token contract instance with the signer
      const tokenContractWithSigner = tokenContract.connect(signer);
      
      // Get the staking contract address
      const stakingAddress = await contract.getAddress();
      
      // Parse the approval amount as a string to avoid BigInt issues
      const amount = ethers.parseEther(stakeAmount);
      
      // Check current allowance
      const currentAllowance = await tokenContract.allowance(account, stakingAddress);
      const formattedAllowance = ethers.formatEther(currentAllowance);
      setDebugInfo(`Current allowance: ${formattedAllowance} GRULL, Required: ${stakeAmount} GRULL`);
      
      // If already approved with sufficient amount, skip approval
      if (currentAllowance >= amount) {
        setDebugInfo(`Tokens already approved with sufficient amount (${formattedAllowance} GRULL). You can proceed to stake.`);
        setIsApproved(true);
        setIsLoading(false);
        return;
      }
      
      setDebugInfo(`Approving ${stakeAmount} GRULL for staking...`);
      
      // Use the signer to send the transaction
      const tx = await tokenContractWithSigner.approve(stakingAddress, amount);
      setDebugInfo('Approval transaction sent, waiting for confirmation...');
      
      const receipt = await tx.wait();
      setDebugInfo('Approval transaction confirmed');
      
      // Check if the approval was successful
      const newAllowance = await tokenContract.allowance(account, stakingAddress);
      const formattedNewAllowance = ethers.formatEther(newAllowance);
      const isApprovedAmount = newAllowance >= amount;
      setIsApproved(isApprovedAmount);
      
      if (isApprovedAmount) {
        setDebugInfo(`Tokens approved successfully. Allowance: ${formattedNewAllowance} GRULL. You can now stake your tokens.`);
      } else {
        throw new Error(`Approval failed. Current allowance: ${formattedNewAllowance} GRULL, Required: ${stakeAmount} GRULL`);
      }
    } catch (error) {
      console.error('Error approving tokens:', error);
      
      // Check for user rejection error
      if (error.code === 'ACTION_REJECTED' || 
          (error.message && error.message.includes('user rejected')) ||
          (error.message && error.message.includes('User denied transaction'))) {
        setError('Transaction was rejected. Please confirm the transaction in MetaMask to approve tokens for staking.');
      } else {
        setError(`Error approving tokens: ${error.message}`);
      }
      
      setDebugInfo(`Error approving tokens: ${error.message}`);
      setIsApproved(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Stake tokens
  const stakeTokens = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo('Staking tokens...');
      
      if (!contract || !account || !library) {
        throw new Error('Contract, account, or library not available');
      }

      if (!stakeAmount || isNaN(parseFloat(stakeAmount)) || parseFloat(stakeAmount) <= 0) {
        throw new Error('Please enter a valid stake amount greater than 0');
      }

      if (!isApproved) {
        throw new Error('Please approve tokens before staking');
      }
      
      // Get signer from library
      const signer = await library.getSigner();
      
      // Create a new contract instance with the signer
      const contractWithSigner = contract.connect(signer);
      
      // Parse the stake amount as a string to avoid BigInt issues
      const amount = ethers.parseEther(stakeAmount);
      setDebugInfo(`Staking ${stakeAmount} tokens...`);
      
      // Use the signer to send the transaction
      const tx = await contractWithSigner.stake(amount);
      setDebugInfo('Staking transaction sent, waiting for confirmation...');
      
      const receipt = await tx.wait();
      setDebugInfo('Staking transaction confirmed');
      
      // Reload data
      await loadUserData();
      await loadContractData();
      
      setStakeAmount('');
      setDebugInfo('Tokens staked successfully');
    } catch (error) {
      console.error('Error staking tokens:', error);
      
      // Check for user rejection error
      if (error.code === 'ACTION_REJECTED' || 
          (error.message && error.message.includes('user rejected')) ||
          (error.message && error.message.includes('User denied transaction'))) {
        setError('Transaction was rejected. Please confirm the transaction in MetaMask to complete the staking process.');
      } else {
        setError(`Error staking tokens: ${error.message}`);
      }
      
      setDebugInfo(`Error staking tokens: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Unstake tokens
  const unstakeTokens = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo('Unstaking tokens...');
      
      if (!contract || !account || !library) {
        throw new Error('Contract, account, or library not available');
      }
      
      // Get signer from library
      const signer = await library.getSigner();
      
      // Create a new contract instance with the signer
      const contractWithSigner = contract.connect(signer);
      
      // Parse the unstake amount as a string to avoid BigInt issues
      const amount = ethers.parseEther(unstakeAmount);
      setDebugInfo(`Unstaking ${unstakeAmount} tokens...`);
      
      // Use the signer to send the transaction
      const tx = await contractWithSigner.unstake(amount);
      setDebugInfo('Unstaking transaction sent, waiting for confirmation...');
      
      await tx.wait();
      
      // Reload data
      await loadUserData();
      await loadContractData();
      
      setUnstakeAmount('');
      setDebugInfo('Tokens unstaked successfully');
    } catch (error) {
      console.error('Error unstaking tokens:', error);
      setError(`Error unstaking tokens: ${error.message}`);
      setDebugInfo(`Error unstaking tokens: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a dispute
  const createDispute = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo('Creating dispute...');
      
      if (!contract || !account || !library) {
        throw new Error('Contract, account, or library not available');
      }
      
      if (!defendantAddress || !reward) {
        throw new Error('Defendant address and reward are required');
      }
      
      // Get signer from library
      const signer = await library.getSigner();
      
      // Create a new contract instance with the signer
      const contractWithSigner = contract.connect(signer);
      
      // Parse the reward amount as a string to avoid BigInt issues
      const rewardAmount = ethers.parseEther(reward);
      setDebugInfo(`Creating dispute with defendant ${defendantAddress} and reward ${reward}...`);
      
      // Use the signer to send the transaction
      const tx = await contractWithSigner.createDispute(defendantAddress, rewardAmount);
      setDebugInfo('Dispute creation transaction sent, waiting for confirmation...');
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      setDebugInfo('Transaction confirmed, processing receipt...');
      
      // Get the dispute ID from the event - handle different ethers.js versions
      let disputeId;
      
      // Check if we're using ethers v6 (which has a different event structure)
      if (receipt.logs) {
        // ethers v6 format
        setDebugInfo('Using ethers v6 format for events');
        const disputeCreatedLog = receipt.logs.find(log => {
          try {
            const parsedLog = contract.interface.parseLog(log);
            return parsedLog && parsedLog.name === 'DisputeCreated';
          } catch (e) {
            return false;
          }
        });
        
        if (disputeCreatedLog) {
          const parsedLog = contract.interface.parseLog(disputeCreatedLog);
          disputeId = parsedLog.args.disputeId;
        }
      } else if (receipt.events) {
        // ethers v5 format
        setDebugInfo('Using ethers v5 format for events');
        const disputeCreatedEvent = receipt.events.find(event => event.event === 'DisputeCreated');
        if (disputeCreatedEvent) {
          disputeId = disputeCreatedEvent.args.disputeId;
        }
      }
      
      if (disputeId !== undefined) {
        setDebugInfo(`Dispute created with ID: ${disputeId}`);
        
        // Set the dispute ID state variable
        setDisputeId(disputeId.toString());
        
        // Add the new dispute to the state
        setDisputes(prevDisputes => [
          ...prevDisputes,
          {
            id: disputeId,
            disputant: account,
            defendant: defendantAddress,
            reward: reward,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleString(),
            resolved: false,
            disputantVotes: '0',
            defendantVotes: '0',
            jurors: []
          }
        ]);
      } else {
        setDebugInfo('Could not extract dispute ID from transaction receipt');
        // Fallback: reload all disputes
        await loadContractData();
      }
      
      setDefendantAddress('');
      setReward('');
      setDebugInfo('Dispute created successfully');
    } catch (error) {
      console.error('Error creating dispute:', error);
      setError(`Error creating dispute: ${error.message}`);
      setDebugInfo(`Error creating dispute: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Select jurors for a dispute
  const selectJurors = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo('Selecting jurors...');
      
      if (!contract || !account || !library) {
        throw new Error('Contract, account, or library not available');
      }
      
      if (!disputeId) {
        throw new Error('Dispute ID is required');
      }
      
      // Get signer from library
      const signer = await library.getSigner();
      
      // Create a new contract instance with the signer
      const contractWithSigner = contract.connect(signer);
      
      // Convert dispute ID to a number to avoid BigInt issues
      const parsedDisputeId = parseInt(disputeId, 10);
      setDebugInfo(`Selecting jurors for dispute ${disputeId}...`);
      
      // Use the signer to send the transaction
      const tx = await contractWithSigner.selectJurors(parsedDisputeId);
      setDebugInfo('Juror selection transaction sent, waiting for confirmation...');
      
      await tx.wait();
      
      // Refresh the jurors list after selection
      await refreshDisputeJurors(parsedDisputeId);
      
      setDebugInfo('Jurors selected successfully');
    } catch (error) {
      console.error('Error selecting jurors:', error);
      setError(`Error selecting jurors: ${error.message}`);
      setDebugInfo(`Error selecting jurors: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Cast a vote
  const castVote = async (disputeId, forDisputant) => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo(`Casting vote for dispute ${disputeId}...`);
      
      if (!contract || !account || !library) {
        throw new Error('Contract, account, or library not available');
      }
      
      // Get signer from library
      const signer = await library.getSigner();
      
      // Create a new contract instance with the signer
      const contractWithSigner = contract.connect(signer);
      
      // Convert dispute ID to a number to avoid BigInt issues
      const parsedDisputeId = parseInt(disputeId, 10);
      setDebugInfo(`Casting vote for dispute ${disputeId}, forDisputant: ${forDisputant}...`);
      
      // Use the signer to send the transaction
      const tx = await contractWithSigner.castVote(parsedDisputeId, forDisputant);
      setDebugInfo('Vote transaction sent, waiting for confirmation...');
      
      await tx.wait();
      
      // Reload data
      await loadContractData();
      
      setDebugInfo('Vote cast successfully');
    } catch (error) {
      console.error('Error casting vote:', error);
      setError(`Error casting vote: ${error.message}`);
      setDebugInfo(`Error casting vote: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Resolve a dispute
  const resolveDispute = async (disputeId) => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo(`Resolving dispute ${disputeId}...`);
      
      if (!contract || !account || !library) {
        throw new Error('Contract, account, or library not available');
      }
      
      // Get signer from library
      const signer = await library.getSigner();
      
      // Create a new contract instance with the signer
      const contractWithSigner = contract.connect(signer);
      
      // Convert dispute ID to a number to avoid BigInt issues
      const parsedDisputeId = parseInt(disputeId, 10);
      setDebugInfo(`Resolving dispute ${disputeId}...`);
      
      // Use the signer to send the transaction
      const tx = await contractWithSigner.resolveDispute(parsedDisputeId);
      setDebugInfo('Resolve transaction sent, waiting for confirmation...');
      
      await tx.wait();
      
      // Reload data
      await loadContractData();
      
      setDebugInfo('Dispute resolved successfully');
    } catch (error) {
      console.error('Error resolving dispute:', error);
      setError(`Error resolving dispute: ${error.message}`);
      setDebugInfo(`Error resolving dispute: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Claim rewards
  const claimRewards = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo('Claiming rewards...');
      
      if (!contract || !account || !library) {
        throw new Error('Contract, account, or library not available');
      }
      
      // Get signer from library
      const signer = await library.getSigner();
      
      // Create a new contract instance with the signer
      const contractWithSigner = contract.connect(signer);
      
      setDebugInfo('Claiming rewards...');
      
      // Use the signer to send the transaction
      const tx = await contractWithSigner.claimRewards();
      setDebugInfo('Reward claim transaction sent, waiting for confirmation...');
      
      await tx.wait();
      
      // Reload data
      await loadUserData();
      
      setDebugInfo('Rewards claimed successfully');
    } catch (error) {
      console.error('Error claiming rewards:', error);
      setError(`Error claiming rewards: ${error.message}`);
      setDebugInfo(`Error claiming rewards: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user is a juror for a dispute
  const isJuror = async (disputeId) => {
    try {
      if (!contract || !account) {
        return false;
      }
      
      return await contract.isJuror(disputeId, account);
    } catch (error) {
      console.error('Error checking if user is a juror:', error);
      return false;
    }
  };

  // Calculate weight based on stake
  const calculateWeight = async (stakeAmount) => {
    try {
      if (!contract) {
        return 1;
      }
      
      return await contract.calculateWeight(ethers.parseEther(stakeAmount));
    } catch (error) {
      console.error('Error calculating weight:', error);
      return 1;
    }
  };

  // Add a function to refresh jurors for a specific dispute
  const refreshDisputeJurors = async (disputeId) => {
    try {
      if (!contract) return;
      
      const jurors = await contract.getJurors(disputeId);
      
      setDisputes((prevDisputes) => {
        return prevDisputes.map(dispute => {
          if (dispute.id === disputeId) {
            return {
              ...dispute,
              jurors: jurors
            };
          }
          return dispute;
        });
      });
    } catch (error) {
      console.error('Error refreshing dispute jurors:', error);
      setError(`Error refreshing dispute jurors: ${error.message}`);
    }
  };

  // End dispute early
  const endDisputeEarly = async (disputeId, disputantWon) => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo(`Ending dispute ${disputeId} early...`);
      
      if (!contract || !account || !library) {
        throw new Error('Contract, account, or library not available');
      }
      
      // Get signer from library
      const signer = await library.getSigner();
      
      // Create a new contract instance with the signer
      const contractWithSigner = contract.connect(signer);
      
      // Convert dispute ID to a number to avoid BigInt issues
      const parsedDisputeId = parseInt(disputeId, 10);
      
      // Use the signer to send the transaction
      const tx = await contractWithSigner.endDisputeEarly(parsedDisputeId, disputantWon);
      setDebugInfo('End dispute transaction sent, waiting for confirmation...');
      
      await tx.wait();
      
      // Refresh disputes
      await loadContractData();
      
      setDebugInfo('Dispute ended successfully');
    } catch (error) {
      console.error('Error ending dispute:', error);
      setError(`Error ending dispute: ${error.message}`);
      setDebugInfo(`Error ending dispute: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Distribute rewards evenly
  const distributeRewardsEvenly = async (disputeId) => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo(`Distributing rewards evenly for dispute ${disputeId}...`);
      
      if (!contract || !account || !library) {
        throw new Error('Contract, account, or library not available');
      }
      
      // Get signer from library
      const signer = await library.getSigner();
      
      // Create a new contract instance with the signer
      const contractWithSigner = contract.connect(signer);
      
      // Convert dispute ID to a number to avoid BigInt issues
      const parsedDisputeId = parseInt(disputeId, 10);
      
      // Use the signer to send the transaction
      const tx = await contractWithSigner.distributeRewardsEvenly(parsedDisputeId);
      setDebugInfo('Distribute rewards transaction sent, waiting for confirmation...');
      
      await tx.wait();
      
      // Refresh disputes
      await loadContractData();
      
      setDebugInfo('Rewards distributed successfully');
    } catch (error) {
      console.error('Error distributing rewards:', error);
      setError(`Error distributing rewards: ${error.message}`);
      setDebugInfo(`Error distributing rewards: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="juror-staking">
      <h2>GRULL Juror Staking</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {!active ? (
        <div className="connection-prompt">
          <p>Please connect your wallet to interact with the GRULL Juror Staking system.</p>
        </div>
      ) : (
        <>
          <div className="user-info">
            <h3>Your Information</h3>
            <p><strong>Account:</strong> {account}</p>
            <p><strong>Token Balance:</strong> {userBalance} GRULL</p>
            <p><strong>Staked Amount:</strong> {userStake} GRULL</p>
            <p><strong>Available Rewards:</strong> {jurorRewards} GRULL</p>
          </div>
          
          <div className="staking-actions">
            <h3>Staking Actions</h3>
            
            <div className="action-group">
              <h4>Stake Tokens</h4>
              <p className="help-text">To stake tokens, first enter an amount, then approve the tokens, and finally click "Stake Tokens". You'll need to confirm each transaction in MetaMask.</p>
              <div className="input-group">
                <input
                  type="text"
                  value={stakeAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log('Stake amount changed:', value);
                    setStakeAmount(value);
                    
                    // Reset approval state when amount changes
                    if (value && !isNaN(parseFloat(value)) && parseFloat(value) > 0) {
                      // If there's a valid amount, we'll check approval in loadUserData
                      setDebugInfo(`Stake amount changed to ${value}. Checking approval status...`);
                      // We'll let loadUserData handle the approval check
                    } else {
                      // If the amount is invalid or empty, reset approval state
                      setIsApproved(false);
                      setDebugInfo('Please enter a valid stake amount to check approval status.');
                    }
                  }}
                  placeholder="Amount to stake"
                  disabled={isLoading}
                />
                <button
                  onClick={() => {
                    console.log('Approve button clicked');
                    console.log('Current state:', {
                      isLoading,
                      stakeAmount,
                      isValidAmount: !isNaN(parseFloat(stakeAmount)) && parseFloat(stakeAmount) > 0,
                      isApproved
                    });
                    approveTokens();
                  }}
                  disabled={isLoading || !stakeAmount || isNaN(parseFloat(stakeAmount)) || parseFloat(stakeAmount) <= 0}
                >
                  {isLoading ? 'Approving...' : isApproved ? 'Approved' : 'Approve Tokens'}
                </button>
                <button
                  onClick={stakeTokens}
                  disabled={isLoading || !stakeAmount || !isApproved}
                >
                  {isLoading ? 'Staking...' : 'Stake Tokens'}
                </button>
              </div>
            </div>
            
            <div className="action-group">
              <h4>Unstake Tokens</h4>
              <div className="input-group">
                <input
                  type="text"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  placeholder="Amount to unstake"
                  disabled={isLoading}
                />
                <button
                  onClick={unstakeTokens}
                  disabled={isLoading || !unstakeAmount || parseFloat(unstakeAmount) > parseFloat(userStake)}
                >
                  {isLoading ? 'Unstaking...' : 'Unstake Tokens'}
                </button>
              </div>
            </div>
            
            <div className="action-group">
              <h4>Claim Rewards</h4>
              <button
                onClick={claimRewards}
                disabled={isLoading || parseFloat(jurorRewards) <= 0}
              >
                {isLoading ? 'Claiming...' : 'Claim Rewards'}
              </button>
            </div>
          </div>
          
          <div className="disputes">
            <h3>Disputes</h3>
            
            <div className="action-group">
              <h4>Create Dispute</h4>
              <div className="input-group">
                <input
                  type="text"
                  value={defendantAddress}
                  onChange={(e) => setDefendantAddress(e.target.value)}
                  placeholder="Defendant Address"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  placeholder="Reward Amount"
                  disabled={isLoading}
                />
                <button
                  onClick={createDispute}
                  disabled={isLoading || !defendantAddress || !reward}
                >
                  {isLoading ? 'Creating...' : 'Create Dispute'}
                </button>
              </div>
            </div>
            
            <div className="action-group">
              <h4>Manage Dispute</h4>
              <div className="input-group">
                <input
                  type="text"
                  value={disputeId}
                  onChange={(e) => setDisputeId(e.target.value)}
                  placeholder="Dispute ID"
                  disabled={isLoading}
                />
                <button
                  onClick={selectJurors}
                  disabled={isLoading || !disputeId}
                >
                  {isLoading ? 'Selecting...' : 'Select Jurors'}
                </button>
                <button
                  onClick={() => resolveDispute(disputeId)}
                  disabled={isLoading || !disputeId}
                >
                  {isLoading ? 'Resolving...' : 'Resolve Dispute'}
                </button>
              </div>
            </div>
            
            <div className="disputes-list">
              <h4>Active Disputes</h4>
              {disputes.length === 0 ? (
                <p>No active disputes</p>
              ) : (
                <div className="disputes-grid">
                  {disputes.map((dispute) => (
                    <div key={dispute.id} className="dispute-item">
                      <h5>Dispute #{dispute.id}</h5>
                      <p><strong>Disputant:</strong> {dispute.disputant}</p>
                      <p><strong>Defendant:</strong> {dispute.defendant}</p>
                      <p><strong>Reward:</strong> {dispute.reward} GRULL</p>
                      <p><strong>Deadline:</strong> {dispute.deadline}</p>
                      <p><strong>Status:</strong> {dispute.resolved ? 'Resolved' : 'Active'}</p>
                      <p><strong>Disputant Votes:</strong> {dispute.disputantVotes}</p>
                      <p><strong>Defendant Votes:</strong> {dispute.defendantVotes}</p>
                      
                      {!dispute.resolved && dispute.jurors.includes(account) && (
                        <div className="voting-actions">
                          <button
                            onClick={() => castVote(dispute.id, true)}
                            disabled={isLoading}
                          >
                            Vote for Disputant
                          </button>
                          <button
                            onClick={() => castVote(dispute.id, false)}
                            disabled={isLoading}
                          >
                            Vote for Defendant
                          </button>
                        </div>
                      )}
                      
                      {!dispute.resolved && dispute.jurors.length > 0 && (
                        <div className="dispute-actions">
                          <button
                            onClick={() => endDisputeEarly(dispute.id, true)}
                            disabled={isLoading}
                          >
                            End Dispute (Disputant Wins)
                          </button>
                          <button
                            onClick={() => endDisputeEarly(dispute.id, false)}
                            disabled={isLoading}
                          >
                            End Dispute (Defendant Wins)
                          </button>
                          <button
                            onClick={() => distributeRewardsEvenly(dispute.id)}
                            disabled={isLoading}
                          >
                            Distribute Rewards Evenly
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="contract-info">
            <h3>Contract Information</h3>
            <p><strong>Total Staked:</strong> {totalStaked} GRULL</p>
            <p><strong>Minimum Stake:</strong> {minimumStake} GRULL</p>
          </div>
          
          <div className="debug-info">
            <h3>Debug Information</h3>
            <p><strong>Debug Info:</strong> {debugInfo}</p>
            <p><strong>Web3React Active:</strong> {active ? 'Yes' : 'No'}</p>
            <p><strong>Account:</strong> {account || 'None'}</p>
            <p><strong>Contract Initialized:</strong> {contract ? 'Yes' : 'No'}</p>
            <p><strong>Token Contract Initialized:</strong> {tokenContract ? 'Yes' : 'No'}</p>
            <p><strong>Approval Status:</strong> {isApproved ? 'Approved' : 'Not Approved'}</p>
            <p><strong>Stake Amount:</strong> {stakeAmount || 'Not set'}</p>
            <p><strong>Help:</strong> To stake tokens, first enter an amount, then approve the tokens, and finally click "Stake Tokens". If you see "Approved" but haven't approved yet, it means you already have sufficient allowance from a previous approval.</p>
          </div>
        </>
      )}
    </div>
  );
};

export default JurorStaking; 