# GRULL Arbitration System

This project implements a decentralized arbitration system using the GRULL token. Jurors stake GRULL tokens to participate in dispute resolution and earn rewards for their participation.

## Project Structure

- `contracts/`: Smart contracts for the GRULL token and JurorStaking system
- `scripts/`: Deployment scripts for the contracts
- `frontend/`: React frontend for interacting with the contracts

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MetaMask or another Web3 wallet

## Installation

1. Clone the repository
2. Install dependencies:

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Deployment

1. Start a local Hardhat node:

```bash
npx hardhat node
```

2. In a new terminal, deploy the GRULL token:

```bash
npx hardhat run scripts/deploy-grull-token.js --network localhost
```

3. Deploy the JurorStaking contract:

```bash
# Set the GRULL token address as an environment variable
export GRULL_TOKEN_ADDRESS=<GRULL_TOKEN_ADDRESS>
npx hardhat run scripts/deploy-juror-staking.js --network localhost
```

The deployment scripts will automatically update the frontend configuration with the deployed contract addresses.

## Running the Frontend

1. Start the frontend development server:

```bash
cd frontend
npm start
```

2. Open your browser and navigate to `http://localhost:3000`
3. Connect your MetaMask wallet to the local Hardhat network
4. Import the test accounts from Hardhat into MetaMask using the private keys

## Using the System

1. **Staking Tokens**:
   - Approve the JurorStaking contract to spend your GRULL tokens
   - Stake tokens to become eligible for juror selection

2. **Creating Disputes**:
   - Enter the defendant's address and the reward amount
   - Create a dispute to initiate the arbitration process

3. **Participating as a Juror**:
   - Check if you've been selected as a juror for a dispute
   - Cast your vote on the dispute
   - Resolve the dispute after all jurors have voted

4. **Claiming Rewards**:
   - Claim your rewards for participating in dispute resolution

## Testing

Run the test suite:

```bash
npx hardhat test
```

## License

MIT
