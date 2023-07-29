import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";


const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
  },
  defaultNetwork: "hardhat",
  networks: {
    //setting forking data
    hardhat: {
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/SKEZZEasoBhw2PixrKv9m2r8ZvB1mmnp",
        blockNumber: 17801589
      }
    },
    //setting mumbai testnet
    // mumbai: {
    //   url: process.env.MUMBAI_RPC_URL as string,
    //   accounts: [process.env.MAIN_ACCOUNT as string]
    // }
  }
};

export default config;
