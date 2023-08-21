import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer:{
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "hardhat",
  networks: {
    //setting forking data
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC_URL,
        blockNumber: 17951875,
      },
    },
    //setting mumbai testnet
    mumbai: {
      url: process.env.MUMBAI_RPC_URL,
      accounts: [process.env.MAIN_ACCOUNT]
    }
  },
  etherscan: {
    apiKey: {
      polygonMumbai: process.env.POLYGONSCAN_API_KEY
  }
}
}

export default config;
