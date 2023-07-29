const { ethers, getNamedAccounts } = require("hardhat");
const { expect } = require("chai");

const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7"
const USDT_WHALE_SELLER = "0x06d3a30cBb00660B85a30988D197B1c282c6dCB6" //EOA
const USDT_WHALE_BUYER = "0x398583B20665DaB16df4233Ffb190c5aE429f896" //EOA

async function deployCriptoMilhasFixture() {
  const [owner, account2, mediator1, mediator2] = await ethers.getSigners();
  const CM = await ethers.getContractFactory("CriptoMilhas");
  const cmContract = await CM.deploy()
  let usdt;
  let impersonateSeller;
  let impersonateBuyer;
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [USDT_WHALE_SELLER]
  })
  usdt = await ethers.getContractAt("IERC20", USDT)
  impersonateSeller = await ethers.getSigner(USDT_WHALE_SELLER)
  console.log(`Balance usdt impersonateSeller ${await usdt.balanceOf(impersonateSeller.address)}`)
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [USDT_WHALE_BUYER]
  })
  impersonateBuyer = await ethers.getSigner(USDT_WHALE_BUYER)
  console.log(`Balance usdt impersonateBuyer ${await usdt.balanceOf(impersonateBuyer.address)}`)
  return { cmContract, owner, account2, mediator1, mediator2, impersonateSeller, impersonateBuyer, usdt }
}

describe('ADMIN MODULE', () => {

  it.skip('Owner Should be the deployer', async function () {
    const { cmContract, owner } = await deployCriptoMilhasFixture();
    const contractOwner = await cmContract.getContractOwner()
    expect(contractOwner).to.equal(owner.address)
  })

  it.skip('Should not others users set new owner', async function () {
    const { cmContract, owner, account2 } = await deployCriptoMilhasFixture();
    //testing custom errors
    await expect(cmContract.connect(account2).setNewOwner(account2.address)).to.be.revertedWithCustomError(cmContract, 'OnlyOwner');
  })

  it.skip('Should set new owner', async function () {
    const { cmContract, owner, account2 } = await deployCriptoMilhasFixture();
    await cmContract.connect(owner).setNewOwner(account2.address)
    const newContractOwner = await cmContract.getContractOwner()
    expect(newContractOwner).to.equal(account2.address)
  })

  it.skip('Should deny access to not mediators', async function () {
    const { cmContract, owner, account2 } = await deployCriptoMilhasFixture();
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
    const { cmContract, owner, mediator1, mediator2 } = await deployCriptoMilhasFixture();
    await expect(cmContract.connect(mediator1).addMediators([mediator1.address, mediator2.address])).to.be.revertedWithCustomError(cmContract, 'OnlyOwner')
  })

  it.skip('Should not allow mediators set fees', async function () {
    const { cmContract, owner, mediator1 } = await deployCriptoMilhasFixture();
    await expect(cmContract.connect(mediator1).setFeeByCategory(1, 30)).to.be.revertedWithCustomError(cmContract, 'OnlyOwner');
  })

  it.skip('Should not allow users set fees', async function () {
    const { cmContract, owner, account2 } = await deployCriptoMilhasFixture();
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
  it('Should create a new purchase by buyer and send money', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, usdt } = await deployCriptoMilhasFixture()
    const currentDate = new Date();
    const dateToReceiveProduct = Math.floor(currentDate.getTime() / 1000) + 10 * 24 * 60 * 60;
    const daysToAdd = 5;
    //autorizando o contrato a gastar tokens do buyer
    await usdt.connect(impersonateBuyer).approve(cmContract.address, 2000);
    console.log("autorizado",  await usdt.allowance(impersonateBuyer.address, cmContract.address));
    //simulando que se passaram 10 dias
    await network.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine");
    const response = await cmContract.connect(impersonateBuyer).purchase(1, USDT,  100 , impersonateSeller.address, 1, dateToReceiveProduct, daysToAdd)
  });
})

it('Seller should confirm', async function () {
    const { cmContract, impersonateSeller, usdt } = await deployCriptoMilhasFixture()
    await cmContract.connect(impersonateSeller).sellerConfim(1);
})

it.skip('Seller Should withdraw after time', async function () {
  const { cmContract, impersonateSeller, usdt } = await deployCriptoMilhasFixture()
  await cmContract.connect(impersonateSeller).sellerWithdraw(1);
})

it.skip('Buyer Should withdraw', async function () {
  const { cmContract, impersonateSeller } = await deployCriptoMilhasFixture()
  await cmContract.connect(impersonateSeller).buyerWithdraw(1);
})
