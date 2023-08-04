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
    const { cmContract, owner, account2 } = await deployCriptoMilhasFixture();
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
    const mediator = await cmContract.mediators(account2.address);
    expect(mediator).to.equal(false)
  })

  it.skip('Should allow owner add others mediators', async function () {
    const { cmContract, owner, mediator1, mediator2 } = await deployCriptoMilhasFixture();
    await cmContract.connect(owner).addMediators([mediator1.address, mediator2.address])
    const checkMediator1 = await cmContract.mediators(mediator1.address);
    const checkMediator2 = await cmContract.mediators(mediator2.address);
    expect(checkMediator1).to.equal(true)
    expect(checkMediator2).to.equal(true)
  })

  it.skip('Should not allow others users add others mediators', async function () {
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

  it.skip('Should deny to create a new purchase with < 7 days', async function () {

  });

  it.skip('Should be locked the money for 24hours while seller not confirm, function must revert', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    console.log("allowed to spend",  await stablecoin.allowance(impersonateBuyer.address, cmContract.address));
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    try {
      await cmContract.connect(impersonateBuyer).refundRequest(1);
      expect.fail("Expected an error to be thrown");
    } catch (error) {
      expect(error.message).to.contain("revert");
    }
  })

  it.skip('Seller should confirm', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
  })

  it.skip('Should refundRequest after 24 hours if seller does not confirm', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await skipDaysOnBlockchain(1)
    await cmContract.connect(impersonateBuyer).refundRequest(1);
  })

  it('Should open dispute if seller has confirmed', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
    // //simulating past 24 hours on evm
    await skipDaysOnBlockchain(1)
    await cmContract.connect(impersonateBuyer).refundRequest(1);
    const _purchase = await cmContract.getPurchase(1);
    expect(_purchase.status).to.equal(3) // 3 = RefundRequestedByBuyer
  })

  it.skip('Seller Should not withdraw before time', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
    // //simulating past 5 days on evm
    await skipDaysOnBlockchain(5)
    await cmContract.connect(impersonateSeller).sellerWithdraw(1)
  })

  it.skip('Seller Should withdraw after time', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
    // //simulating past 5 days on evm
    await skipDaysOnBlockchain(daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerWithdraw(1)
  })

  it.skip('Mediator Should set decision to buyer and buyer should withdraw', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, mediator1, owner } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
    // //simulating past 5 days on evm
    // await skipDaysOnBlockchain(5)
    // await cmContract.connect(impersonateBuyer).refundRequest(1)
    // console.log(mediator1.address);
    await cmContract.connect(owner).addMediators([mediator1.address])
    await cmContract.connect(mediator1).mediatorDecision(1, 4)
    await cmContract.connect(impersonateBuyer).buyerWithdraw(1)
  })

  it.skip('Mediator Should set decision to seller and seller should withdraw', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, mediator1, owner } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
    // //simulating past 5 days on evm
    await skipDaysOnBlockchain(daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateBuyer).refundRequest(1)
    console.log(mediator1.address);
    await cmContract.connect(owner).addMediators([mediator1.address])
    await cmContract.connect(mediator1).mediatorDecision(1, 5)
    await cmContract.connect(impersonateSeller).sellerWithdraw(1)
  })
})
