# GRULL Arbitration System Frontend

This is the frontend for the GRULL Arbitration System, a decentralized dispute resolution platform.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- MetaMask or another Web3 wallet

## Installation

1. Clone the repository
2. Navigate to the frontend directory:
   ```
   cd grull/frontend
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Fixing Common Issues

### 1. npm ENOENT Error

If you encounter the following error when running `npx hardhat node`:
```
npm error code ENOENT
npm error syscall lstat
npm error path C:\Users\BIT\AppData\Roaming\npm
npm error errno -4058
npm error enoent ENOENT: no such file or directory, lstat 'C:\Users\BIT\AppData\Roaming\npm'
```

Run the fix script:
```
node fix-npm-error.js
```

This will create the missing directory.

### 2. ethers.js v6 Compatibility Issues

If you encounter errors like:
```
Error creating dispute: contract runner does not support sending transactions (operation="sendTransaction", code=UNSUPPORTED_OPERATION, version=6.13.5)
```

The code has been updated to be compatible with ethers.js v6.13.5. If you still encounter issues, you can try downgrading to ethers.js v5:

```
npm uninstall ethers
npm install ethers@5.7.2
```

## Running the Application

1. Start the development server:
   ```
   npm start
   ```
2. Open your browser and navigate to `http://localhost:3000`
3. Connect your wallet using MetaMask or another Web3 wallet

## Features

- Connect/disconnect wallet
- Stake/unstake GRULL tokens
- Create disputes
- Participate as a juror
- Cast votes on disputes
- Claim rewards

## Contract Addresses

The application uses the following contract addresses (configured in `src/config.js`):

- JurorStaking: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- GRULL Token: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

Make sure these addresses match your deployed contracts.
