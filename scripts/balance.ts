const { ethers } = require("hardhat")

async function main() {
  const balance = await ethers.provider.getBalance("0xEA6cC024ee1E46d37bb4f1AC8129A0EFeAd6e654")
  console.log(`Balance is ${balance}`);

}

main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
