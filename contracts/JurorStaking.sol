// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

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
    uint256 public constant POOL_SIZE = 5; // how many should we keep ?
    uint256 public constant MAX_WEIGHT = 2; // Maximum weight for a single juror 
    // this value should be dynamic
    
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
        string disputeReason;
        string commitment;
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
    
    // Array to track staker addresses
    address[] private _stakerAddresses;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event DisputeCreated(
        uint256 indexed disputeId, 
        address disputant, 
        address defendant, 
        uint256 reward,
        string disputeReason,
        string commitment
    );
    event DisputeResolved(uint256 indexed disputeId, bool disputantWon);
    event JurorSelected(uint256 indexed disputeId, address juror, uint256 weight);
    event VoteCast(uint256 indexed disputeId, address juror, bool forDisputant);
    event RewardClaimed(address juror, uint256 amount);
    
    // Constructor
    constructor(address _grullToken) {
        require(_grullToken != address(0), "Invalid token address");
        grullToken = IERC20(_grullToken);
        minimumStake = 100 * 10**18; // 100 GRULL tokens minimum stake
    }
    
 
    function stake(uint256 _amount) external nonReentrant {
        require(_amount >= minimumStake, "Stake below minimum");
        require(grullToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        
        Stake storage userStake = stakes[msg.sender];
        userStake.amount += _amount;
        userStake.lastActive = block.timestamp;
        userStake.isActive = true;
        
        // Add to staker addresses if not already there
        if (userStake.amount == _amount) { // This is a new staker
            _stakerAddresses.push(msg.sender);
        }
        
        totalStaked += _amount;
        
        emit Staked(msg.sender, _amount);
    }
    
  
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
    
    function createDispute(
        address _defendant, 
        uint256 _reward,
        string memory _disputeReason,
        string memory _commitment
    ) external nonReentrant {
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
        dispute.disputeReason = _disputeReason;
        dispute.commitment = _commitment;
        
        emit DisputeCreated(
            disputeId, 
            msg.sender, 
            _defendant, 
            _reward,
            _disputeReason,
            _commitment
        );
    }
   
    function selectJurors(uint256 _disputeId) external {
        Dispute storage dispute = disputes[_disputeId];
        require(!dispute.resolved, "Dispute already resolved");
        require(dispute.jurors.length == 0, "Jurors already selected");
        
        // This is a simplified version. In a real implementation, you would use a more
        // sophisticated random selection mechanism, possibly with Chainlink VRF
        address[] memory potentialJurors = getActiveJurors();
        
        // If there are fewer jurors than POOL_SIZE, use all available jurors
        uint256 numJurorsToSelect = potentialJurors.length < POOL_SIZE ? potentialJurors.length : POOL_SIZE;
        require(numJurorsToSelect > 0, "Not enough jurors");
        
        // Simple random selection (not secure, just for demonstration)
        for (uint256 i = 0; i < numJurorsToSelect; i++) {
            uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, i))) % potentialJurors.length;
            address selectedJuror = potentialJurors[randomIndex];
            
            // Calculate weight based on stake (with diminishing returns)
            uint256 weight = calculateWeight(stakes[selectedJuror].amount);
            
            dispute.jurors.push(selectedJuror);
            emit JurorSelected(_disputeId, selectedJuror, weight);
        }
    }
    
    
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
    
   
    function claimRewards() external nonReentrant {
        uint256 reward = jurorRewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        
        jurorRewards[msg.sender] = 0;
        require(grullToken.transfer(msg.sender, reward), "Transfer failed");
        
        emit RewardClaimed(msg.sender, reward);
    }
    
  
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
     * @dev Returns a list of active jurors
     * @return Array of active juror addresses
     */
    function getActiveJurors() public view returns (address[] memory) {
        // Count the number of active stakers
        uint256 activeCount = 0;
        for (uint256 i = 0; i < _stakerAddresses.length; i++) {
            if (stakes[_stakerAddresses[i]].isActive) {
                activeCount++;
            }
        }
        
        // If no active stakers, return the owner as a fallback
        if (activeCount == 0) {
            address[] memory activeJurors = new address[](1);
            activeJurors[0] = owner();
            return activeJurors;
        }
        
        // Create an array of the right size
        address[] memory activeJurors = new address[](activeCount);
        
        // Fill the array with active staker addresses
        uint256 index = 0;
        for (uint256 i = 0; i < _stakerAddresses.length; i++) {
            if (stakes[_stakerAddresses[i]].isActive) {
                activeJurors[index] = _stakerAddresses[i];
                index++;
            }
        }
        
        return activeJurors;
    }
    
  
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
     * @dev Returns the current dispute count
     */
    function getDisputeCount() public view returns (uint256) {
        return _disputeIds.current();
    }
    
    /**
     * @dev Returns the jurors for a dispute
     * @param _disputeId ID of the dispute
     * @return Array of juror addresses
     */
    function getJurors(uint256 _disputeId) public view returns (address[] memory) {
        Dispute storage dispute = disputes[_disputeId];
        return dispute.jurors;
    }
    
    /**
     * @dev Returns a specific juror for a dispute
     * @param _disputeId ID of the dispute
     * @param _index Index of the juror in the array
     * @return Address of the juror
     */
    function getJuror(uint256 _disputeId, uint256 _index) public view returns (address) {
        Dispute storage dispute = disputes[_disputeId];
        if (_index >= dispute.jurors.length) {
            return address(0);
        }
        return dispute.jurors[_index];
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