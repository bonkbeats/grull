const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Get the contract factories
  const GRULLToken = await hre.ethers.getContractFactory("grull_token");
  const JurorStaking = await hre.ethers.getContractFactory("JurorStaking");

  // Deploy GRULL Token
  console.log("Deploying GRULL Token...");
  const grullToken = await GRULLToken.deploy();
  await grullToken.waitForDeployment();
  const grullTokenAddress = await grullToken.getAddress();
  console.log("GRULL Token deployed to:", grullTokenAddress);

  // Deploy JurorStaking with the token address
  console.log("Deploying JurorStaking...");
  const jurorStaking = await JurorStaking.deploy(grullTokenAddress);
  await jurorStaking.waitForDeployment();
  const jurorStakingAddress = await jurorStaking.getAddress();
  console.log("JurorStaking deployed to:", jurorStakingAddress);

  // Log the addresses for easy copying
  console.log("\nDeployment complete! Contract addresses:");
  console.log("GRULL Token:", grullTokenAddress);
  console.log("JurorStaking:", jurorStakingAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 