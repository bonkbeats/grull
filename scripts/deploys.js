const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy GRULL Token
  const Token = await hre.ethers.getContractFactory("GRULLToken");
  const token = await Token.deploy();
  await token.deployed();
  console.log("GRULL Token deployed to:", token.address);

  // Get all test accounts
  const testAccounts = await hre.ethers.getSigners();
  console.log("Distributing tokens to test accounts...");

  // Distribute tokens to all test accounts
  for (let i = 0; i < testAccounts.length; i++) {
    const account = testAccounts[i];
    if (account.address !== deployer.address) {  // Skip deployer as they already have tokens
      const tx = await token.transfer(account.address, hre.ethers.utils.parseEther("1000"));
      await tx.wait();
      console.log(`Transferred 1000 GRULL to ${account.address}`);
    }
  }

  // Deploy JurorStaking with token address
  const JurorStaking = await hre.ethers.getContractFactory("JurorStaking");
  const jurorStaking = await JurorStaking.deploy(token.address);
  await jurorStaking.deployed();
  console.log("JurorStaking deployed to:", jurorStaking.address);

  // Approve JurorStaking to spend tokens for all accounts
  for (let i = 0; i < testAccounts.length; i++) {
    const account = testAccounts[i];
    const tokenWithSigner = token.connect(account);
    const tx = await tokenWithSigner.approve(jurorStaking.address, hre.ethers.constants.MaxUint256);
    await tx.wait();
    console.log(`Approved JurorStaking for ${account.address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 