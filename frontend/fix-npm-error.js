const fs = require('fs');
const path = require('path');
const os = require('os');

// Create the npm directory if it doesn't exist
const npmDir = path.join(os.homedir(), 'AppData', 'Roaming', 'npm');

try {
  if (!fs.existsSync(npmDir)) {
    fs.mkdirSync(npmDir, { recursive: true });
    console.log(`Created directory: ${npmDir}`);
  } else {
    console.log(`Directory already exists: ${npmDir}`);
  }
} catch (error) {
  console.error('Error creating directory:', error);
}

console.log('You can now run "npx hardhat node" without the ENOENT error.'); 