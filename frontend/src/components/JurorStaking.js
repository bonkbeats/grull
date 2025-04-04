import React, { useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { InjectedConnector } from '@web3-react/injected-connector';
import { JUROR_STAKING_ADDRESS, TOKEN_ADDRESS } from '../config';
import './JurorStaking.css';

// ABI for the JurorStaking contract
const JUROR_STAKING_ABI = [
  "function stake(uint256 _amount) external",
  "function unstake(uint256 _amount) external",
  "function createDispute(address _defendant, uint256 _reward) external",
  "function selectJurors(uint256 _disputeId) external",
  "function castVote(uint256 _disputeId, bool _forDisputant) external",
  "function resolveDispute(uint256 _disputeId) external",
  "function claimRewards() external",
  "function stakes(address) view returns (uint256 amount, uint256 lastActive, bool isActive)",
  "function disputes(uint256) view returns (uint256 id, address disputant, address defendant, uint256 reward, uint256 deadline, bool resolved)",
  "function jurorRewards(address) view returns (uint256)",
  "function minimumStake() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function isJuror(uint256, address) view returns (bool)",
  "event Staked(address indexed user, uint256 amount)",
  "event Unstaked(address indexed user, uint256 amount)",
  "event DisputeCreated(uint256 indexed disputeId, address disputant, address defendant, uint256 reward)",
  "event DisputeResolved(uint256 indexed disputeId, bool disputantWon)",
  "event JurorSelected(uint256 indexed disputeId, address juror, uint256 weight)",
  "event VoteCast(uint256 indexed disputeId, address juror, bool forDisputant)",
  "event RewardClaimed(address juror, uint256 amount)"
];

// ABI for the GRULL token
const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
];

const injected = new InjectedConnector({
  supportedChainIds: [1, 3, 4, 5, 42, 1337], // Add 1337 for local Hardhat network
});

const JurorStaking = () => {
  const { active, account, library, activate, deactivate } = useWeb3React();
  const [jurorStakingContract, setJurorStakingContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [defendantAddress, setDefendantAddress] = useState('');
  const [disputeReward, setDisputeReward] = useState('');
  const [disputeId, setDisputeId] = useState('');
  const [voteForDisputant, setVoteForDisputant] = useState(true);
  const [userStake, setUserStake] = useState({ amount: '0', isActive: false });
  const [userRewards, setUserRewards] = useState('0');
  const [minimumStake, setMinimumStake] = useState('0');
  const [totalStaked, setTotalStaked] = useState('0');
  const [disputes, setDisputes] = useState([]);
  const [isJurorForDispute, setIsJurorForDispute] = useState(false);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [tokenAllowance, setTokenAllowance] = useState('0');

  useEffect(() => {
    if (active && library) {
      const jurorStaking = new ethers.Contract(
        JUROR_STAKING_ADDRESS,
        JUROR_STAKING_ABI,
        library.getSigner()
      );
      setJurorStakingContract(jurorStaking);

      const token = new ethers.Contract(
        TOKEN_ADDRESS,
        TOKEN_ABI,
        library.getSigner()
      );
      setTokenContract(token);

      // Load user data
      loadUserData(jurorStaking, token);
      loadContractData(jurorStaking);
    }
  }, [active, library, account]);

  const loadUserData = async (jurorStaking, token) => {
    if (!account) return;

    try {
      // Get user stake
      const stake = await jurorStaking.stakes(account);
      setUserStake({
        amount: ethers.formatEther(stake.amount),
        isActive: stake.isActive
      });

      // Get user rewards
      const rewards = await jurorStaking.jurorRewards(account);
      setUserRewards(ethers.formatEther(rewards));

      // Get token balance
      const balance = await token.balanceOf(account);
      setTokenBalance(ethers.formatEther(balance));

      // Get token allowance
      const allowance = await token.allowance(account, JUROR_STAKING_ADDRESS);
      setTokenAllowance(ethers.formatEther(allowance));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadContractData = async (jurorStaking) => {
    try {
      // Get minimum stake
      const minStake = await jurorStaking.minimumStake();
      setMinimumStake(ethers.formatEther(minStake));

      // Get total staked
      const total = await jurorStaking.totalStaked();
      setTotalStaked(ethers.formatEther(total));

      // Load disputes (simplified - in a real app you'd paginate this)
      // This is just a placeholder
      setDisputes([]);
    } catch (error) {
      console.error('Error loading contract data:', error);
    }
  };

  const connectWallet = async () => {
    try {
      await activate(injected);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    try {
      deactivate();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const approveToken = async () => {
    if (!tokenContract || !stakeAmount) return;

    try {
      const amount = ethers.parseEther(stakeAmount);
      const tx = await tokenContract.approve(JUROR_STAKING_ADDRESS, amount);
      await tx.wait();
      alert('Token approval successful!');
      loadUserData(jurorStakingContract, tokenContract);
    } catch (error) {
      console.error('Error approving tokens:', error);
      alert('Error approving tokens: ' + error.message);
    }
  };

  const stakeTokens = async () => {
    if (!jurorStakingContract || !stakeAmount) return;

    try {
      const amount = ethers.parseEther(stakeAmount);
      const tx = await jurorStakingContract.stake(amount);
      await tx.wait();
      alert('Staking successful!');
      setStakeAmount('');
      loadUserData(jurorStakingContract, tokenContract);
      loadContractData(jurorStakingContract);
    } catch (error) {
      console.error('Error staking tokens:', error);
      alert('Error staking tokens: ' + error.message);
    }
  };

  const unstakeTokens = async () => {
    if (!jurorStakingContract || !unstakeAmount) return;

    try {
      const amount = ethers.parseEther(unstakeAmount);
      const tx = await jurorStakingContract.unstake(amount);
      await tx.wait();
      alert('Unstaking successful!');
      setUnstakeAmount('');
      loadUserData(jurorStakingContract, tokenContract);
      loadContractData(jurorStakingContract);
    } catch (error) {
      console.error('Error unstaking tokens:', error);
      alert('Error unstaking tokens: ' + error.message);
    }
  };

  const createDispute = async () => {
    if (!jurorStakingContract || !defendantAddress || !disputeReward) return;

    try {
      const reward = ethers.parseEther(disputeReward);
      const tx = await jurorStakingContract.createDispute(defendantAddress, reward);
      await tx.wait();
      alert('Dispute created successfully!');
      setDefendantAddress('');
      setDisputeReward('');
      loadContractData(jurorStakingContract);
    } catch (error) {
      console.error('Error creating dispute:', error);
      alert('Error creating dispute: ' + error.message);
    }
  };

  const selectJurors = async () => {
    if (!jurorStakingContract || !disputeId) return;

    try {
      const tx = await jurorStakingContract.selectJurors(disputeId);
      await tx.wait();
      alert('Jurors selected successfully!');
      setDisputeId('');
      loadContractData(jurorStakingContract);
    } catch (error) {
      console.error('Error selecting jurors:', error);
      alert('Error selecting jurors: ' + error.message);
    }
  };

  const castVote = async () => {
    if (!jurorStakingContract || !disputeId) return;

    try {
      const tx = await jurorStakingContract.castVote(disputeId, voteForDisputant);
      await tx.wait();
      alert('Vote cast successfully!');
      setDisputeId('');
      loadContractData(jurorStakingContract);
    } catch (error) {
      console.error('Error casting vote:', error);
      alert('Error casting vote: ' + error.message);
    }
  };

  const resolveDispute = async () => {
    if (!jurorStakingContract || !disputeId) return;

    try {
      const tx = await jurorStakingContract.resolveDispute(disputeId);
      await tx.wait();
      alert('Dispute resolved successfully!');
      setDisputeId('');
      loadContractData(jurorStakingContract);
    } catch (error) {
      console.error('Error resolving dispute:', error);
      alert('Error resolving dispute: ' + error.message);
    }
  };

  const claimRewards = async () => {
    if (!jurorStakingContract) return;

    try {
      const tx = await jurorStakingContract.claimRewards();
      await tx.wait();
      alert('Rewards claimed successfully!');
      loadUserData(jurorStakingContract, tokenContract);
    } catch (error) {
      console.error('Error claiming rewards:', error);
      alert('Error claiming rewards: ' + error.message);
    }
  };

  const checkIfJuror = async () => {
    if (!jurorStakingContract || !disputeId || !account) return;

    try {
      const isJuror = await jurorStakingContract.isJuror(disputeId, account);
      setIsJurorForDispute(isJuror);
    } catch (error) {
      console.error('Error checking juror status:', error);
    }
  };

  return (
    <div className="juror-staking-container">
      <h1>GRULL Juror Staking</h1>
      
      {!active ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected Account: {account}</p>
          <button onClick={disconnectWallet}>Disconnect</button>
          
          <div className="user-info">
            <h2>Your Information</h2>
            <p>Token Balance: {tokenBalance} GRULL</p>
            <p>Staked Amount: {userStake.amount} GRULL</p>
            <p>Available Rewards: {userRewards} GRULL</p>
            <p>Token Allowance: {tokenAllowance} GRULL</p>
          </div>
          
          <div className="staking-section">
            <h2>Stake Tokens</h2>
            <input
              type="text"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="Amount to stake"
            />
            <button onClick={approveToken}>Approve Tokens</button>
            <button onClick={stakeTokens}>Stake Tokens</button>
          </div>
          
          <div className="unstaking-section">
            <h2>Unstake Tokens</h2>
            <input
              type="text"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              placeholder="Amount to unstake"
            />
            <button onClick={unstakeTokens}>Unstake Tokens</button>
          </div>
          
          <div className="dispute-section">
            <h2>Create Dispute</h2>
            <input
              type="text"
              value={defendantAddress}
              onChange={(e) => setDefendantAddress(e.target.value)}
              placeholder="Defendant Address"
            />
            <input
              type="text"
              value={disputeReward}
              onChange={(e) => setDisputeReward(e.target.value)}
              placeholder="Reward Amount"
            />
            <button onClick={createDispute}>Create Dispute</button>
          </div>
          
          <div className="juror-section">
            <h2>Juror Actions</h2>
            <input
              type="text"
              value={disputeId}
              onChange={(e) => setDisputeId(e.target.value)}
              placeholder="Dispute ID"
            />
            <button onClick={checkIfJuror}>Check if Juror</button>
            
            {isJurorForDispute && (
              <div>
                <button onClick={selectJurors}>Select Jurors</button>
                <div>
                  <label>
                    <input
                      type="radio"
                      checked={voteForDisputant}
                      onChange={() => setVoteForDisputant(true)}
                    />
                    Vote for Disputant
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={!voteForDisputant}
                      onChange={() => setVoteForDisputant(false)}
                    />
                    Vote for Defendant
                  </label>
                </div>
                <button onClick={castVote}>Cast Vote</button>
                <button onClick={resolveDispute}>Resolve Dispute</button>
              </div>
            )}
          </div>
          
          <div className="rewards-section">
            <h2>Claim Rewards</h2>
            <button onClick={claimRewards}>Claim Rewards</button>
          </div>
          
          <div className="contract-info">
            <h2>Contract Information</h2>
            <p>Minimum Stake: {minimumStake} GRULL</p>
            <p>Total Staked: {totalStaked} GRULL</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default JurorStaking; 