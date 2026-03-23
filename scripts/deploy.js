const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Token configuration — edit these before deploying
  const TOKEN_NAME = "MyToken";
  const TOKEN_SYMBOL = "MTK";
  const INITIAL_SUPPLY = ethers.parseUnits("100000000", 18); // 100 million tokens

  console.log("\nDeploying MyToken...");
  console.log("  Name:           ", TOKEN_NAME);
  console.log("  Symbol:         ", TOKEN_SYMBOL);
  console.log("  Initial supply: ", ethers.formatUnits(INITIAL_SUPPLY, 18), TOKEN_SYMBOL);

  const MyToken = await ethers.getContractFactory("MyToken");
  const token = await MyToken.deploy(TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY, deployer.address);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("\nMyToken deployed to:", address);
  console.log("\nVerify on Etherscan:");
  console.log(
    `  npx hardhat verify --network <network> ${address} "${TOKEN_NAME}" "${TOKEN_SYMBOL}" "${INITIAL_SUPPLY}" "${deployer.address}"`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
