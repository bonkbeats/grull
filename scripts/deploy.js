const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Step 1: Deploy the GRULL token
  console.log("\n--- Deploying GRULL Token ---");
  const GRULL = await hre.ethers.getContractFactory("grull_token");
  const grull = await GRULL.deploy();
  await grull.waitForDeployment();

  const grullAddress = await grull.getAddress();
  console.log("GRULL token deployed to:", grullAddress);
  console.log("Token name:", await grull.name());
  console.log("Token symbol:", await grull.symbol());
  console.log("Total supply:", (await grull.totalSupply()).toString());

  // Step 2: Deploy the JurorStaking contract
  console.log("\n--- Deploying JurorStaking Contract ---");
  const minimumStake = hre.ethers.parseEther("100");
  
  const JurorStaking = await hre.ethers.getContractFactory("JurorStaking");
  const jurorStaking = await JurorStaking.deploy(grullAddress, minimumStake);
  await jurorStaking.waitForDeployment();

  const jurorStakingAddress = await jurorStaking.getAddress();
  console.log("JurorStaking deployed to:", jurorStakingAddress);
  console.log("Minimum stake:", hre.ethers.formatEther(minimumStake), "GRULL");
  
  // Save the addresses to a file for the frontend to use
  const fs = require('fs');
  const path = require('path');
  
  const configPath = path.join(__dirname, '..', 'frontend', 'src', 'config.js');
  const configContent = `
// Contract addresses - DO NOT EDIT THIS FILE MANUALLY
// This file is automatically generated during deployment

export const JUROR_STAKING_ADDRESS = '${jurorStakingAddress}';
export const TOKEN_ADDRESS = '${grullAddress}';
`;
  
  fs.writeFileSync(configPath, configContent);
  console.log(`\nContract addresses saved to ${configPath}`);
  
  console.log("\n--- Deployment Complete ---");
  console.log("GRULL Token:", grullAddress);
  console.log("JurorStaking:", jurorStakingAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 