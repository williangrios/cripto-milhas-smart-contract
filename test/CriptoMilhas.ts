import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

async function deployCriptoMilhasFixture() {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  // Contracts are deployed using the first signer/account by default
  const [owner, account2, buyer, seller, mediator1, mediator2] = await ethers.getSigners();
  const CM = await ethers.getContractFactory("CriptoMilhas");
  const cmContract = await CM.deploy()
  return { cmContract, owner, account2, buyer, seller, mediator1, mediator2 }
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
    await expect( cmContract.connect(mediator1).addMediators([mediator1.address, mediator2.address])).to.be.revertedWithCustomError(cmContract, 'OnlyOwner')
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

  })

  it('Should be locked the money for 24hours while seller not confirm', async function () {

  })

  it('Seller should confirm', async function () {

  })

  it('Should not refundRequest before 24 hours', async function () {

  })

  it('Should refundRequest after 24 hours if seller does not confirm', async function () {

  })

  it('Should open dispute if seller has confirmed', async function () {

  })

  it('Seller Should not withdraw before time', async function () {

  })

  it('Seller Should withdraw after time', async function () {

  })

  it('Buyer Should withdraw', async function () {

  })

  it('Mediator Should set decision to buyer', async function () {

  })

  it('Mediator Should set decision to seller', async function () {

  })

})

describe('GETTING', () => {

})
