# Criptomilhas Hardhat Project

# Marketplace to buy and sell airline tickets

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
npx hardhat clean (erase artifacts)
``

FAZENDO DEPLOY DE UM CONTRATO
-configuro o hardhat.config.ts com a chave privada e url
-configuro o arquivo scripts/deploy.ts
-rodo o comando npx hardhat run --network mumbai scripts/deploy.ts

VERIFICANDO UM CONTRATO
-para verificar o contrato preciso de uma apikey que consigo no etherscan(e a mesma pra sepolia e goerli tb) ou polygonscan(e a mesma pra mumbai tb)
-entao configuro o hardhat.config.ts
-depois rodo o comando npx hardhat verify --network mumbai 0xenderecodocontrato

