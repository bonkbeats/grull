const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const GRULL = await hre.ethers.getContractFactory("grull_token");
  const grull = await GRULL.deploy();
  await grull.waitForDeployment();

  const grullAddress = await grull.getAddress();
  console.log("GRULL token deployed to:", grullAddress);
  console.log("Token name:", await grull.name());
  console.log("Token symbol:", await grull.symbol());
  console.log("Total supply:", (await grull.totalSupply()).toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 