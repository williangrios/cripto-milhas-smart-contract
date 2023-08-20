const { ethers, getNamedAccounts } = require("hardhat");
const { expect } = require("chai");
const { time } = require('@openzeppelin/test-helpers');


// DAI
const STABLECOIN = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const WHALE_SELLER = "0xD831B3353Be1449d7131e92c8948539b1F18b86A" //EOA
const WHALE_BUYER = "0x748dE14197922c4Ae258c7939C7739f3ff1db573" //EOA

// USDC
// const STABLECOIN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
// const WHALE_SELLER = "0x171cda359aa49E46Dec45F375ad6c256fdFBD420" //EOA
// const WHALE_BUYER = "0x11bc3b9575125F106946B4E88f13DA5862f4e496" //EOA

// USDT
// const STABLECOIN = "0xdac17f958d2ee523a2206206994597c13d831ec7"
// const WHALE_SELLER = "0x68841a1806fF291314946EebD0cdA8b348E73d6D" //EOA
// const WHALE_BUYER = "0xBDa23B750dD04F792ad365B5F2a6F1d8593796f2" //EOA

// BUSD
// const STABLECOIN = "0x4fabb145d64652a948d72533023f6e7a623c7c53"
// const WHALE_SELLER = "0x60E194900875DdE4492dD26D6FF4a0A2a5BB078d" //EOA
// const WHALE_BUYER = "0x61466641Ab6D45120bA906b1a13D1765D50c9671" //EOA



async function deployCriptoMilhasFixture() {
  const [owner, account2, mediator1, mediator2] = await ethers.getSigners();
  const CM = await ethers.getContractFactory("CriptoMilhas");
  const cmContract = await CM.deploy()
  let stablecoin;
  let impersonateSeller;
  let impersonateBuyer;
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [WHALE_SELLER]
  })
  stablecoin = await ethers.getContractAt("IERC20", STABLECOIN)
  impersonateSeller = await ethers.getSigner(WHALE_SELLER)
  console.log(`Balance stablecoin impersonateSeller ${await stablecoin.balanceOf(impersonateSeller.address)}`)
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [WHALE_BUYER]
  })
  impersonateBuyer = await ethers.getSigner(WHALE_BUYER)
  console.log(`Balance stablecoin impersonateBuyer ${await stablecoin.balanceOf(impersonateBuyer.address)}`)
  return { cmContract, owner, account2, mediator1, mediator2, impersonateSeller, impersonateBuyer, stablecoin }
}

async function skipDaysOnBlockchain(days){
  await hre.network.provider.send("evm_increaseTime", [days * 24 * 60 * 60]);
  await hre.network.provider.send("evm_mine");
}

describe('ADMIN MODULE', () => {

  it.skip('Owner Should be the deployer', async function () {
    const { cmContract, owner } = await deployCriptoMilhasFixture();
    const contractOwner = await cmContract.getContractOwner()
    expect(contractOwner).to.equal(owner.address)
  })

  it.skip('Should not others users set new owner', async function () {
    const { cmContract, account2 } = await deployCriptoMilhasFixture();
    await expect(cmContract.connect(account2).setNewOwner(account2.address)).to.be.revertedWithCustomError(cmContract, 'OnlyOwner');
  })

  it.skip('Should set new owner', async function () {
    const { cmContract, owner, account2 } = await deployCriptoMilhasFixture();
    await cmContract.connect(owner).setNewOwner(account2.address)
    const newContractOwner = await cmContract.getContractOwner()
    expect(newContractOwner).to.equal(account2.address)
  })

  it.skip('Should deny access to not mediators', async function () {
    const { cmContract, account2 } = await deployCriptoMilhasFixture();
    const notMediator = await cmContract.mediators(account2.address);
    expect(notMediator).to.equal(false)
  })

  it.skip('Should allow owner add others mediators', async function () {
    const { cmContract, owner, mediator1, mediator2 } = await deployCriptoMilhasFixture();
    await cmContract.connect(owner).addMediators([mediator1.address, mediator2.address])
    const checkMediator1 = await cmContract.mediators(mediator1.address);
    const checkMediator2 = await cmContract.mediators(mediator2.address);
    expect(checkMediator1).to.equal(true)
    expect(checkMediator2).to.equal(true)
  })

  it.skip('Should not allow non owner add others mediators', async function () {
    const { cmContract, mediator1, mediator2 } = await deployCriptoMilhasFixture();
    await expect(cmContract.connect(mediator1).addMediators([mediator1.address, mediator2.address])).to.be.revertedWithCustomError(cmContract, 'OnlyOwner')
  })

  it.skip('Should not allow mediators set fees', async function () {
    const { cmContract, owner, mediator1 } = await deployCriptoMilhasFixture();
    await expect(cmContract.connect(mediator1).setFeeByCategory(1, 30)).to.be.revertedWithCustomError(cmContract, 'OnlyOwner');
  })

  it.skip('Should not allow users set fees', async function () {
    const { cmContract, account2 } = await deployCriptoMilhasFixture();
    await expect(cmContract.connect(account2).setFeeByCategory(1, 30)).to.be.revertedWithCustomError(cmContract, 'OnlyOwner');
  })

  it.skip('Should allow owner set fee', async function () {
    const { cmContract, owner } = await deployCriptoMilhasFixture()
    await cmContract.connect(owner).setFeeByCategory(1, 30)
    const newFee = await cmContract.getFeeByCategory(1)
    expect(newFee).be.equal(30)
  })

})

describe('COMMERCIAL MODULE', () => {
  it.skip('Should create a new purchase by buyer and send money', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    console.log("allowed to spend",  await stablecoin.allowance(impersonateBuyer.address, cmContract.address));
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    const contractAmount = await stablecoin.balanceOf(cmContract.address);
    console.log("contract balance", contractAmount);
    expect(contractAmount).be.equal(200000000)
  });

  it.skip('Should deny to create a new purchase with < 10 days', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    console.log("allowed to spend",  await stablecoin.allowance(impersonateBuyer.address, cmContract.address));
    const daysToAddOnReceiveProduct = 5;
    try {
      await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct);
    } catch (error) {
      expect(error.message).to.contain("Data inválida. Mínimo de 10 dias");
    }
  });

  it.skip('Should be locked the money for 24hours while seller not confirm, function must revert', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    console.log("allowed to spend",  await stablecoin.allowance(impersonateBuyer.address, cmContract.address));
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    try {
      await cmContract.connect(impersonateBuyer).refundRequest(1);
    } catch (error) {
      expect(error.message).to.contain("Aguarde pelo menos 24hs.");
    }
  })

  it.skip('Seller should confirm', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    const purchaseBefore = await cmContract.getPurchase(1)
    expect(purchaseBefore.status).to.equal(0)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
    const purchaseAfter = await cmContract.getPurchase(1)
    expect(purchaseAfter.status).to.equal(1)
  })

  it.skip('Should refundRequest after 24 hours if seller does not confirm', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await skipDaysOnBlockchain(1)
    await cmContract.connect(impersonateBuyer).refundRequest(1);
    const purchaseAfterRefunded = await cmContract.getPurchase(1)
    expect(purchaseAfterRefunded.status).to.equal(6) // 6 = refundedToBuyer
  })

  it.skip('Should open dispute if seller had confirmed', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(123, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(123)
    const _purchaseConfirmedBySeller = await cmContract.getPurchase(123);
    expect(_purchaseConfirmedBySeller.status).to.equal(1) // 1 = confirmed
    // //simulating past 24 hours on evm
    await skipDaysOnBlockchain(1)
    await cmContract.connect(impersonateBuyer).refundRequest(123);
    const _purchase = await cmContract.getPurchase(123);
    expect(_purchase.status).to.equal(3) // 3 = RefundRequestedByBuyer
  })

  it.skip('Seller Should not withdraw before time', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(123, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(123)
    // //simulating past 5 days on evm
    await skipDaysOnBlockchain(25)
    try {
      await cmContract.connect(impersonateSeller).sellerWithdraw(123)
    } catch (error) {
      const _purchase = await cmContract.getPurchase(123);
      console.log('deu erro-----', _purchase);
      expect(error.message).to.contain("Ainda não é permitido fazer a retirada, aguarde o prazo");
    }
  })

  it.skip('Seller Should withdraw after time', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(123, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(123)
    // //simulating past 5 days on evm
    await skipDaysOnBlockchain(daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerWithdraw(123)
    const _purchase = await cmContract.getPurchase(123);
    expect(_purchase.status).to.equal(2) // 2 = resgate bem sucedido
  })

  it.skip('Mediator Should set decision to buyer and buyer should withdraw', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, mediator1, owner } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(123, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(123)
    await cmContract.connect(owner).addMediators([mediator1.address])
    await cmContract.connect(mediator1).mediatorDecision(123, 4)
    const _purchaseBefore = await cmContract.getPurchase(123);
    expect(_purchaseBefore.status).to.equal(4) // 4 = status 4 decisao favoravel ao comprador
    await cmContract.connect(impersonateBuyer).buyerWithdraw(123)
    const _purchaseAfter = await cmContract.getPurchase(123);
    expect(_purchaseAfter.status).to.equal(6) // 6 = status 6 comprador resgatou
  })

  it('Mediator Should set decision to seller and seller should withdraw', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, mediator1, owner } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(123, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(123)
    // //simulating past 5 days on evm
    await skipDaysOnBlockchain(daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateBuyer).refundRequest(123)
    await cmContract.connect(owner).addMediators([mediator1.address])
    await cmContract.connect(mediator1).mediatorDecision(123, 5)
    const _purchaseBefore = await cmContract.getPurchase(123);
    expect(_purchaseBefore.status).to.equal(5) // 5 = status 5 decisao favoravel ao vendedor
    await cmContract.connect(impersonateSeller).sellerWithdraw(123)
    const _purchaseAfter = await cmContract.getPurchase(123);
    console.log(_purchaseAfter);
    expect(_purchaseAfter.status).to.equal(2) // 2 = status 2 seller retirou
  })
})
