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
        url: 'https://eth-mainnet.g.alchemy.com/v2/SKEZZEasoBhw2PixrKv9m2r8ZvB1mmnp',
        blockNumber: 17951875,
      },
    },
    // setting mumbai testnet
    mumbai: {
      url: 'https://polygon-mumbai.g.alchemy.com/v2/di4KdLr9SEe1oT-DO1muEFJzSsBWZD5F',
      accounts: ['7487a5f9ae2a5de9ffe962fd6444ebca37ff97ab4952b246ac1665bb6d83efa6']
    }
  },
  etherscan: {
    apiKey: {
      polygonMumbai: 'XS33Y7XEMA2YGDHDSHV5ZYH3FQ372M18TU'
  }
}
}

export default config;
