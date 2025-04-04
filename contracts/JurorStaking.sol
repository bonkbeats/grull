// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import { BrowserProvider } from 'ethers';

/**
 * @title JurorStaking
 * @dev Manages token staking for juror selection in the GRULL arbitration system
 */
contract JurorStaking is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // Token contract
    IERC20 public grullToken;
    
    // Staking parameters
    uint256 public minimumStake;
    uint256 public totalStaked;
    
    // Juror pools
    uint256 public constant POOL_SIZE = 5;
    uint256 public constant MAX_WEIGHT = 2; // Maximum weight for a single juror
    
    // Dispute tracking
    Counters.Counter private _disputeIds;
    
    // Staking data
    struct Stake {
        uint256 amount;
        uint256 lastActive;
        bool isActive;
    }
    
    // Dispute data
    struct Dispute {
        uint256 id;
        address disputant;
        address defendant;
        uint256 reward;
        uint256 deadline;
        bool resolved;
        mapping(address => bool) hasVoted;
        mapping(address => bool) votedForDisputant;
        uint256 disputantVotes;
        uint256 defendantVotes;
        address[] jurors;
    }
    
    // Mappings
    mapping(address => Stake) public stakes;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256) public jurorRewards;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event DisputeCreated(uint256 indexed disputeId, address disputant, address defendant, uint256 reward);
    event DisputeResolved(uint256 indexed disputeId, bool disputantWon);
    event JurorSelected(uint256 indexed disputeId, address juror, uint256 weight);
    event VoteCast(uint256 indexed disputeId, address juror, bool forDisputant);
    event RewardClaimed(address juror, uint256 amount);
    
    constructor(address _grullToken, uint256 _minimumStake) {
        grullToken = IERC20(_grullToken);
        minimumStake = _minimumStake;
    }
    
    /**
     * @dev Stake tokens to become a juror
     * @param _amount Amount of tokens to stake
     */
    function stake(uint256 _amount) external nonReentrant {
        require(_amount >= minimumStake, "Stake below minimum");
        require(grullToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        
        Stake storage userStake = stakes[msg.sender];
        userStake.amount += _amount;
        userStake.lastActive = block.timestamp;
        userStake.isActive = true;
        
        totalStaked += _amount;
        
        emit Staked(msg.sender, _amount);
    }
    
    /**
     * @dev Unstake tokens
     * @param _amount Amount of tokens to unstake
     */
    function unstake(uint256 _amount) external nonReentrant {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.amount >= _amount, "Insufficient stake");
        
        userStake.amount -= _amount;
        if (userStake.amount == 0) {
            userStake.isActive = false;
        }
        
        totalStaked -= _amount;
        
        require(grullToken.transfer(msg.sender, _amount), "Transfer failed");
        
        emit Unstaked(msg.sender, _amount);
    }
    
    /**
     * @dev Create a new dispute
     * @param _defendant Address of the defendant
     * @param _reward Amount of tokens to be distributed to jurors
     */
    function createDispute(address _defendant, uint256 _reward) external nonReentrant {
        require(_defendant != msg.sender, "Cannot dispute yourself");
        require(grullToken.transferFrom(msg.sender, address(this), _reward), "Transfer failed");
        
        uint256 disputeId = _disputeIds.current();
        _disputeIds.increment();
        
        Dispute storage dispute = disputes[disputeId];
        dispute.id = disputeId;
        dispute.disputant = msg.sender;
        dispute.defendant = _defendant;
        dispute.reward = _reward;
        dispute.deadline = block.timestamp + 7 days;
        dispute.resolved = false;
        
        emit DisputeCreated(disputeId, msg.sender, _defendant, _reward);
    }
    
    /**
     * @dev Select jurors for a dispute using weighted random selection
     * @param _disputeId ID of the dispute
     */
    function selectJurors(uint256 _disputeId) external {
        Dispute storage dispute = disputes[_disputeId];
        require(!dispute.resolved, "Dispute already resolved");
        require(dispute.jurors.length == 0, "Jurors already selected");
        
        // This is a simplified version. In a real implementation, you would use a more
        // sophisticated random selection mechanism, possibly with Chainlink VRF
        address[] memory potentialJurors = getActiveJurors();
        require(potentialJurors.length >= POOL_SIZE, "Not enough jurors");
        
        // Simple random selection (not secure, just for demonstration)
        for (uint256 i = 0; i < POOL_SIZE; i++) {
            uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, i))) % potentialJurors.length;
            address selectedJuror = potentialJurors[randomIndex];
            
            // Calculate weight based on stake (with diminishing returns)
            uint256 weight = calculateWeight(stakes[selectedJuror].amount);
            
            dispute.jurors.push(selectedJuror);
            emit JurorSelected(_disputeId, selectedJuror, weight);
        }
    }
    
    /**
     * @dev Cast a vote in a dispute
     * @param _disputeId ID of the dispute
     * @param _forDisputant True if voting for disputant, false if voting for defendant
     */
    function castVote(uint256 _disputeId, bool _forDisputant) external {
        Dispute storage dispute = disputes[_disputeId];
        require(!dispute.resolved, "Dispute already resolved");
        require(block.timestamp <= dispute.deadline, "Voting period ended");
        require(isJuror(_disputeId, msg.sender), "Not a juror for this dispute");
        require(!dispute.hasVoted[msg.sender], "Already voted");
        
        Stake storage jurorStake = stakes[msg.sender];
        uint256 weight = calculateWeight(jurorStake.amount);
        
        dispute.hasVoted[msg.sender] = true;
        dispute.votedForDisputant[msg.sender] = _forDisputant;
        
        if (_forDisputant) {
            dispute.disputantVotes += weight;
        } else {
            dispute.defendantVotes += weight;
        }
        
        emit VoteCast(_disputeId, msg.sender, _forDisputant);
    }
    
    /**
     * @dev Resolve a dispute and distribute rewards/penalties
     * @param _disputeId ID of the dispute
     */
    function resolveDispute(uint256 _disputeId) external {
        Dispute storage dispute = disputes[_disputeId];
        require(!dispute.resolved, "Dispute already resolved");
        require(block.timestamp > dispute.deadline, "Voting period not ended");
        
        bool disputantWon = dispute.disputantVotes > dispute.defendantVotes;
        dispute.resolved = true;
        
        // Distribute rewards and penalties
        distributeRewardsAndPenalties(_disputeId, disputantWon);
        
        emit DisputeResolved(_disputeId, disputantWon);
    }
    
    /**
     * @dev Claim rewards from resolved disputes
     */
    function claimRewards() external nonReentrant {
        uint256 reward = jurorRewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        
        jurorRewards[msg.sender] = 0;
        require(grullToken.transfer(msg.sender, reward), "Transfer failed");
        
        emit RewardClaimed(msg.sender, reward);
    }
    
    /**
     * @dev Calculate the weight of a juror based on their stake
     * @param _stakeAmount Amount of tokens staked
     * @return Weight of the juror (1-2)
     */
    function calculateWeight(uint256 _stakeAmount) public view returns (uint256) {
        if (_stakeAmount < minimumStake * 2) {
            return 1;
        } else if (_stakeAmount < minimumStake * 5) {
            return 2;
        } else {
            // Cap at 2 to prevent large token holders from dominating
            return 2;
        }
    }
    
    /**
     * @dev Get all active jurors
     * @return Array of active juror addresses
     */
    function getActiveJurors() public view returns (address[] memory) {
        // This is a simplified version. In a real implementation, you would
        // maintain a list of active jurors or use a more efficient data structure
        address[] memory activeJurors = new address[](100); // Arbitrary size
        uint256 count = 0;
        
        // This is just a placeholder. In a real implementation, you would
        // iterate through all stakers and collect active ones
        return activeJurors;
    }
    
    /**
     * @dev Check if an address is a juror for a specific dispute
     * @param _disputeId ID of the dispute
     * @param _juror Address to check
     * @return True if the address is a juror for the dispute
     */
    function isJuror(uint256 _disputeId, address _juror) public view returns (bool) {
        Dispute storage dispute = disputes[_disputeId];
        for (uint256 i = 0; i < dispute.jurors.length; i++) {
            if (dispute.jurors[i] == _juror) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Distribute rewards and penalties for a resolved dispute
     * @param _disputeId ID of the dispute
     * @param _disputantWon True if the disputant won
     */
    function distributeRewardsAndPenalties(uint256 _disputeId, bool _disputantWon) internal {
        Dispute storage dispute = disputes[_disputeId];
        uint256 totalReward = dispute.reward;
        
        // Calculate total weight of jurors who voted correctly
        uint256 correctWeight = 0;
        uint256 incorrectWeight = 0;
        
        for (uint256 i = 0; i < dispute.jurors.length; i++) {
            address juror = dispute.jurors[i];
            uint256 weight = calculateWeight(stakes[juror].amount);
            
            bool votedCorrectly = (dispute.votedForDisputant[juror] == _disputantWon);
            
            if (votedCorrectly) {
                correctWeight += weight;
            } else {
                incorrectWeight += weight;
            }
        }
        
        // Distribute rewards to correct jurors
        if (correctWeight > 0) {
            for (uint256 i = 0; i < dispute.jurors.length; i++) {
                address juror = dispute.jurors[i];
                bool votedCorrectly = (dispute.votedForDisputant[juror] == _disputantWon);
                
                if (votedCorrectly) {
                    uint256 weight = calculateWeight(stakes[juror].amount);
                    uint256 reward = (totalReward * weight) / correctWeight;
                    jurorRewards[juror] += reward;
                }
            }
        }
        
        // Apply penalties to incorrect jurors
        if (incorrectWeight > 0) {
            for (uint256 i = 0; i < dispute.jurors.length; i++) {
                address juror = dispute.jurors[i];
                bool votedCorrectly = (dispute.votedForDisputant[juror] == _disputantWon);
                
                if (!votedCorrectly) {
                    uint256 weight = calculateWeight(stakes[juror].amount);
                    uint256 penalty = (stakes[juror].amount * 10) / 100; // 10% penalty
                    
                    // Reduce stake
                    stakes[juror].amount -= penalty;
                    totalStaked -= penalty;
                    
                    // Add penalty to total reward
                    totalReward += penalty;
                }
            }
            
            // Redistribute penalties to correct jurors
            if (correctWeight > 0) {
                for (uint256 i = 0; i < dispute.jurors.length; i++) {
                    address juror = dispute.jurors[i];
                    bool votedCorrectly = (dispute.votedForDisputant[juror] == _disputantWon);
                    
                    if (votedCorrectly) {
                        uint256 weight = calculateWeight(stakes[juror].amount);
                        uint256 reward = (totalReward * weight) / correctWeight;
                        jurorRewards[juror] += reward;
                    }
                }
            }
        }
    }
} 