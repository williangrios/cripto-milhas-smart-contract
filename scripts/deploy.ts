import hre from "hardhat";

async function main() {
  const CM = await hre.ethers.getContractFactory("CriptoMilhas");
  const cm = await CM.deploy();
  await cm.deployed()
  const blockNumber = cm.deployTransaction.blockNumber;
  console.log(`CriptoMilhas deployed to ${cm.address}`);
  console.log(`Deployment block number: ${blockNumber}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
