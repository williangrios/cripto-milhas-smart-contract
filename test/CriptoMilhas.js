const { ethers, getNamedAccounts } = require("hardhat");
const { expect } = require("chai");
const { time } = require('@openzeppelin/test-helpers');

const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const DAI_WHALE_SELLER = "0xD831B3353Be1449d7131e92c8948539b1F18b86A" //EOA
const DAI_WHALE_BUYER = "0x748dE14197922c4Ae258c7939C7739f3ff1db573" //EOA

async function deployCriptoMilhasFixture() {
  const [owner, account2, mediator1, mediator2] = await ethers.getSigners();
  const CM = await ethers.getContractFactory("CriptoMilhas");
  const cmContract = await CM.deploy()
  let dai;
  let impersonateSeller;
  let impersonateBuyer;
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [DAI_WHALE_SELLER]
  })
  dai = await ethers.getContractAt("IERC20", DAI)
  impersonateSeller = await ethers.getSigner(DAI_WHALE_SELLER)
  console.log(`Balance DAI impersonateSeller ${await dai.balanceOf(impersonateSeller.address)}`)
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [DAI_WHALE_BUYER]
  })
  impersonateBuyer = await ethers.getSigner(DAI_WHALE_BUYER)
  console.log(`Balance DAI impersonateBuyer ${await dai.balanceOf(impersonateBuyer.address)}`)
  return { cmContract, owner, account2, mediator1, mediator2, impersonateSeller, impersonateBuyer, dai }
}

describe('ADMIN MODULE', () => {

  it('Owner Should be the deployer', async function () {
    const { cmContract, owner } = await deployCriptoMilhasFixture();
    const contractOwner = await cmContract.getContractOwner()
    expect(contractOwner).to.equal(owner.address)
  })

  it('Should not others users set new owner', async function () {
    const { cmContract, owner, account2 } = await deployCriptoMilhasFixture();
    //testing custom errors
    await expect(cmContract.connect(account2).setNewOwner(account2.address)).to.be.revertedWithCustomError(cmContract, 'OnlyOwner');
  })

  it('Should set new owner', async function () {
    const { cmContract, owner, account2 } = await deployCriptoMilhasFixture();
    await cmContract.connect(owner).setNewOwner(account2.address)
    const newContractOwner = await cmContract.getContractOwner()
    expect(newContractOwner).to.equal(account2.address)
  })

  it('Should deny access to not mediators', async function () {
    const { cmContract, owner, account2 } = await deployCriptoMilhasFixture();
    const mediator = await cmContract.mediators(account2.address);
    expect(mediator).to.equal(false)
  })

  it('Should allow owner add others mediators', async function () {
    const { cmContract, owner, mediator1, mediator2 } = await deployCriptoMilhasFixture();
    await cmContract.connect(owner).addMediators([mediator1.address, mediator2.address])
    const checkMediator1 = await cmContract.mediators(mediator1.address);
    const checkMediator2 = await cmContract.mediators(mediator2.address);
    expect(checkMediator1).to.equal(true)
    expect(checkMediator2).to.equal(true)
  })

  it('Should not allow others users add others mediators', async function () {
    const { cmContract, owner, mediator1, mediator2 } = await deployCriptoMilhasFixture();
    await expect(cmContract.connect(mediator1).addMediators([mediator1.address, mediator2.address])).to.be.revertedWithCustomError(cmContract, 'OnlyOwner')
  })

  it('Should not allow mediators set fees', async function () {
    const { cmContract, owner, mediator1 } = await deployCriptoMilhasFixture();
    await expect(cmContract.connect(mediator1).setFeeByCategory(1, 30)).to.be.revertedWithCustomError(cmContract, 'OnlyOwner');
  })

  it('Should not allow users set fees', async function () {
    const { cmContract, owner, account2 } = await deployCriptoMilhasFixture();
    await expect(cmContract.connect(account2).setFeeByCategory(1, 30)).to.be.revertedWithCustomError(cmContract, 'OnlyOwner');
  })

  it('Should allow owner set fee', async function () {
    const { cmContract, owner } = await deployCriptoMilhasFixture()
    await cmContract.connect(owner).setFeeByCategory(1, 30)
    const newFee = await cmContract.getFeeByCategory(1)
    expect(newFee).be.equal(30)
  })

})

describe('COMMERCIAL MODULE', () => {

  it('Should create a new purchase by buyer and send money', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, dai } = await deployCriptoMilhasFixture()
    await dai.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    console.log("allowed to spend",  await dai.allowance(impersonateBuyer.address, cmContract.address));
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, dai.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    const contractAmount = await dai.balanceOf(cmContract.address);
    console.log("contract balance", contractAmount);
    expect(contractAmount).be.equal(200000000)
  });

  it('Should be locked the money for 24hours while seller not confirm, function must revert', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, dai } = await deployCriptoMilhasFixture()
    await dai.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    console.log("allowed to spend",  await dai.allowance(impersonateBuyer.address, cmContract.address));
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, dai.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    try {
      await cmContract.connect(impersonateBuyer).refundRequest(1);
      expect.fail("Expected an error to be thrown");
    } catch (error) {
      expect(error.message).to.contain("revert");
    }
  })

  it('Seller should confirm', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, dai } = await deployCriptoMilhasFixture()
    await dai.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, dai.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
  })

  it('Should refundRequest after 24 hours if seller does not confirm', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, dai } = await deployCriptoMilhasFixture()
    await dai.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, dai.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    //simulating past 24 hours on evm
    await hre.network.provider.send("evm_increaseTime", [1 * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine");
    await cmContract.connect(impersonateBuyer).refundRequest(1);
  })

  it('Should open dispute if seller has confirmed', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, dai } = await deployCriptoMilhasFixture()
    await dai.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, dai.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
    // //simulating past 24 hours on evm
    await hre.network.provider.send("evm_increaseTime", [1 * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine");
    await cmContract.connect(impersonateBuyer).refundRequest(1);
  })

  it('Seller Should not withdraw before time', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, dai } = await deployCriptoMilhasFixture()
    await dai.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, dai.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
    // //simulating past 5 days on evm
    await hre.network.provider.send("evm_increaseTime", [5 * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine");
    await cmContract.connect(impersonateSeller).sellerWithdraw(1)
  })

  it('Seller Should withdraw after time', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, dai } = await deployCriptoMilhasFixture()
    await dai.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, dai.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
    // //simulating past 5 days on evm
    await hre.network.provider.send("evm_increaseTime", [daysToAddOnReceiveProduct * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine");
    await cmContract.connect(impersonateSeller).sellerWithdraw(1)
  })

  it('Mediator Should set decision to buyer and buyer should withdraw', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, dai, mediator1, owner } = await deployCriptoMilhasFixture()
    await dai.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, dai.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
    // //simulating past 5 days on evm
    await hre.network.provider.send("evm_increaseTime", [daysToAddOnReceiveProduct * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine");
    await cmContract.connect(impersonateBuyer).refundRequest(1)
    console.log(mediator1.address);
    await cmContract.connect(owner).addMediators([mediator1.address])
    await cmContract.connect(mediator1).mediatorDecision(1, 4)
    await cmContract.connect(impersonateBuyer).buyerWithdraw(1)
  })

  it('Mediator Should set decision to seller and seller should withdraw', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, dai, mediator1, owner } = await deployCriptoMilhasFixture()
    await dai.connect(impersonateBuyer).approve(cmContract.address, 200000000);
    const daysToAddOnReceiveProduct = 30;
    await cmContract.connect(impersonateBuyer).purchase(1, dai.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(1)
    // //simulating past 5 days on evm
    await hre.network.provider.send("evm_increaseTime", [daysToAddOnReceiveProduct * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine");
    await cmContract.connect(impersonateBuyer).refundRequest(1)
    console.log(mediator1.address);
    await cmContract.connect(owner).addMediators([mediator1.address])
    await cmContract.connect(mediator1).mediatorDecision(1, 5)
    await cmContract.connect(impersonateSeller).sellerWithdraw(1)
  })
})
