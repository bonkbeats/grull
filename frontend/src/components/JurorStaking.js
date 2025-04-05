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
  supportedChainIds: [1, 3, 4, 5, 42, 1337], 
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
      // Initialize contracts with the provider
      const jurorStaking = new ethers.Contract(
        JUROR_STAKING_ADDRESS,
        JUROR_STAKING_ABI,
        library
      );
      setJurorStakingContract(jurorStaking);

      const token = new ethers.Contract(
        TOKEN_ADDRESS,
        TOKEN_ABI,
        library
      );
      setTokenContract(token);

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

      // Get minimum stake
      const minStake = await jurorStaking.minimumStake();
      setMinimumStake(ethers.formatEther(minStake));

      // Get total staked
      const total = await jurorStaking.totalStaked();
      setTotalStaked(ethers.formatEther(total));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadContractData = async (jurorStaking) => {
    try {
      // Load disputes (this is a simplified version)
      // In a real implementation, you would need to track dispute IDs
      const disputeCount = 5; // Example: load first 5 disputes
      const loadedDisputes = [];
      
      for (let i = 0; i < disputeCount; i++) {
        try {
          const dispute = await jurorStaking.disputes(i);
          if (dispute && dispute.id !== undefined) {
            loadedDisputes.push({
              id: dispute.id.toString(),
              disputant: dispute.disputant,
              defendant: dispute.defendant,
              reward: ethers.formatEther(dispute.reward),
              deadline: new Date(dispute.deadline * 1000).toLocaleString(),
              resolved: dispute.resolved
            });
          }
        } catch (error) {
          // Dispute might not exist, continue to next
          console.log(`Dispute ${i} not found`);
        }
      }
      
      setDisputes(loadedDisputes);
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

  const disconnectWallet = async () => {
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
      // Get the signer from the library
      const signer = await library.getSigner();
      // Connect the contract to the signer
      const tokenWithSigner = tokenContract.connect(signer);
      const tx = await tokenWithSigner.approve(JUROR_STAKING_ADDRESS, amount);
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
      // Get the signer from the library
      const signer = await library.getSigner();
      // Connect the contract to the signer
      const jurorStakingWithSigner = jurorStakingContract.connect(signer);
      const tx = await jurorStakingWithSigner.stake(amount);
      await tx.wait();
      alert('Staking successful!');
      setStakeAmount('');
      loadUserData(jurorStakingContract, tokenContract);
    } catch (error) {
      console.error('Error staking tokens:', error);
      alert('Error staking tokens: ' + error.message);
    }
  };

  const unstakeTokens = async () => {
    if (!jurorStakingContract || !unstakeAmount) return;

    try {
      const amount = ethers.parseEther(unstakeAmount);
      // Get the signer from the library
      const signer = await library.getSigner();
      // Connect the contract to the signer
      const jurorStakingWithSigner = jurorStakingContract.connect(signer);
      const tx = await jurorStakingWithSigner.unstake(amount);
      await tx.wait();
      alert('Unstaking successful!');
      setUnstakeAmount('');
      loadUserData(jurorStakingContract, tokenContract);
    } catch (error) {
      console.error('Error unstaking tokens:', error);
      alert('Error unstaking tokens: ' + error.message);
    }
  };

  const createDispute = async () => {
    if (!jurorStakingContract || !defendantAddress || !disputeReward) return;

    try {
      const reward = ethers.parseEther(disputeReward);
      // Get the signer from the library
      const signer = await library.getSigner();
      // Connect the contract to the signer
      const jurorStakingWithSigner = jurorStakingContract.connect(signer);
      const tx = await jurorStakingWithSigner.createDispute(defendantAddress, reward);
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

  const selectJurorsForDispute = async () => {
    if (!jurorStakingContract || !disputeId) return;

    try {
      // Get the signer from the library
      const signer = await library.getSigner();
      // Connect the contract to the signer
      const jurorStakingWithSigner = jurorStakingContract.connect(signer);
      const tx = await jurorStakingWithSigner.selectJurors(disputeId);
      await tx.wait();
      alert('Jurors selected successfully!');
      setDisputeId('');
      loadContractData(jurorStakingContract);
    } catch (error) {
      console.error('Error selecting jurors:', error);
      alert('Error selecting jurors: ' + error.message);
    }
  };

  const castVoteForDispute = async () => {
    if (!jurorStakingContract || !disputeId) return;

    try {
      // Get the signer from the library
      const signer = await library.getSigner();
      // Connect the contract to the signer
      const jurorStakingWithSigner = jurorStakingContract.connect(signer);
      const tx = await jurorStakingWithSigner.castVote(disputeId, voteForDisputant);
      await tx.wait();
      alert('Vote cast successfully!');
      setDisputeId('');
      setVoteForDisputant(true);
      loadContractData(jurorStakingContract);
    } catch (error) {
      console.error('Error casting vote:', error);
      alert('Error casting vote: ' + error.message);
    }
  };

  const resolveDisputeById = async () => {
    if (!jurorStakingContract || !disputeId) return;

    try {
      // Get the signer from the library
      const signer = await library.getSigner();
      // Connect the contract to the signer
      const jurorStakingWithSigner = jurorStakingContract.connect(signer);
      const tx = await jurorStakingWithSigner.resolveDispute(disputeId);
      await tx.wait();
      alert('Dispute resolved successfully!');
      setDisputeId('');
      loadContractData(jurorStakingContract);
    } catch (error) {
      console.error('Error resolving dispute:', error);
      alert('Error resolving dispute: ' + error.message);
    }
  };

  const claimJurorRewards = async () => {
    if (!jurorStakingContract) return;

    try {
      // Get the signer from the library
      const signer = await library.getSigner();
      // Connect the contract to the signer
      const jurorStakingWithSigner = jurorStakingContract.connect(signer);
      const tx = await jurorStakingWithSigner.claimRewards();
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
      console.error('Error checking if juror:', error);
    }
  };

  useEffect(() => {
    if (disputeId && account) {
      checkIfJuror();
    }
  }, [disputeId, account]);

  return (
    <div className="juror-staking">
      <div className="wallet-section">
        <h2>Wallet Connection</h2>
        {active ? (
          <div>
            <p>Connected Account: {account}</p>
            <button onClick={disconnectWallet}>Disconnect Wallet</button>
          </div>
        ) : (
          <button onClick={connectWallet}>Connect Wallet</button>
        )}
      </div>

      {active && (
        <>
          <div className="staking-section">
            <h2>Stake Tokens</h2>
            <div>
              <label>
                Amount to Stake:
                <input
                  type="text"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </label>
            </div>
            <button onClick={approveToken}>Approve Tokens</button>
            <button onClick={stakeTokens}>Stake Tokens</button>
            <p>Your current stake: {userStake.amount} GRULL</p>
            <p>Token balance: {tokenBalance} GRULL</p>
            <p>Token allowance: {tokenAllowance} GRULL</p>
          </div>

          <div className="unstaking-section">
            <h2>Unstake Tokens</h2>
            <div>
              <label>
                Amount to Unstake:
                <input
                  type="text"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </label>
            </div>
            <button onClick={unstakeTokens}>Unstake Tokens</button>
          </div>

          <div className="dispute-section">
            <h2>Create Dispute</h2>
            <div>
              <label>
                Defendant Address:
                <input
                  type="text"
                  value={defendantAddress}
                  onChange={(e) => setDefendantAddress(e.target.value)}
                  placeholder="Enter address"
                />
              </label>
            </div>
            <div>
              <label>
                Reward Amount:
                <input
                  type="text"
                  value={disputeReward}
                  onChange={(e) => setDisputeReward(e.target.value)}
                  placeholder="Enter amount"
                />
              </label>
            </div>
            <button onClick={createDispute}>Create Dispute</button>
          </div>

          <div className="disputes-section">
            <h2>Disputes</h2>
            <div>
              <label>
                Dispute ID:
                <input
                  type="text"
                  value={disputeId}
                  onChange={(e) => setDisputeId(e.target.value)}
                  placeholder="Enter dispute ID"
                />
              </label>
            </div>
            {isJurorForDispute && (
              <div>
                <button onClick={selectJurorsForDispute}>Select Jurors</button>
                <div>
                  <label>
                    Vote for Disputant:
                    <input
                      type="checkbox"
                      checked={voteForDisputant}
                      onChange={(e) => setVoteForDisputant(e.target.checked)}
                    />
                  </label>
                </div>
                <button onClick={castVoteForDispute}>Cast Vote</button>
                <button onClick={resolveDisputeById}>Resolve Dispute</button>
              </div>
            )}
            <div className="disputes-list">
              <h3>Recent Disputes</h3>
              {disputes.map((dispute) => (
                <div key={dispute.id} className="dispute-item">
                  <p>ID: {dispute.id}</p>
                  <p>Disputant: {dispute.disputant}</p>
                  <p>Defendant: {dispute.defendant}</p>
                  <p>Reward: {dispute.reward} GRULL</p>
                  <p>Deadline: {dispute.deadline}</p>
                  <p>Resolved: {dispute.resolved ? 'Yes' : 'No'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rewards-section">
            <h2>Claim Rewards</h2>
            <p>Your rewards: {userRewards} GRULL</p>
            <button onClick={claimJurorRewards}>Claim Rewards</button>
          </div>
          
          <div className="info-section">
            <h2>Contract Information</h2>
            <p>Minimum stake: {minimumStake} GRULL</p>
            <p>Total staked: {totalStaked} GRULL</p>
          </div>
        </>
      )}
    </div>
  );
};

export default JurorStaking; 