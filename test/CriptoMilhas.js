const { ethers, getNamedAccounts } = require("hardhat")
const { expect } = require("chai")

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
  const [owner, account2, mediator1, mediator2, simpleSeller] = await ethers.getSigners()
  const CM = await ethers.getContractFactory("CriptoMilhas")
  const cmContract = await CM.deploy()
  let stablecoin
  // const purchaseId =  [0x1e, 34, 56, 78, 90, 12, 34, 56, 78, 90, 12, 34]
  const purchaseId =  '6239898d23u9d329'
  let impersonateSeller
  let impersonateBuyer
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [WHALE_SELLER]
  })
  stablecoin = await ethers.getContractAt("IERC20", STABLECOIN)
  impersonateSeller = await ethers.getSigner(WHALE_SELLER)
  // console.log(`Balance stablecoin impersonateSeller ${await stablecoin.balanceOf(impersonateSeller.address)}`)
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [WHALE_BUYER]
  })
  impersonateBuyer = await ethers.getSigner(WHALE_BUYER)
  // console.log(`Balance stablecoin impersonateBuyer ${await stablecoin.balanceOf(impersonateBuyer.address)}`)
  return { cmContract, owner, account2, mediator1, mediator2, impersonateSeller, impersonateBuyer, stablecoin , simpleSeller, purchaseId}
}

function randomNumber(min, max){
  return Math.floor(Math.random() * (max - min +1)) + min
}

async function skipDaysOnBlockchain(days){
  await hre.network.provider.send("evm_increaseTime", [days * 24 * 60 * 60])
  await hre.network.provider.send("evm_mine")
}

describe('ADMIN MODULE', () => {

  it('Owner Should be the deployer', async function () {
    const { cmContract, owner } = await deployCriptoMilhasFixture()
    const contractOwner = await cmContract.getContractOwner()
    expect(contractOwner).to.equal(owner.address)
  })

  it('Should not others users set new owner', async function () {
    const { cmContract, account2 } = await deployCriptoMilhasFixture()
    await expect(cmContract.connect(account2).setNewOwner(account2.address)).to.be.revertedWithCustomError(cmContract, 'OnlyOwner')
  })

  it('Should set new owner', async function () {
    const { cmContract, owner, account2 } = await deployCriptoMilhasFixture()
    await cmContract.connect(owner).setNewOwner(account2.address)
    const newContractOwner = await cmContract.getContractOwner()
    expect(newContractOwner).to.equal(account2.address)
  })

  it('Should not allow others users set new fee Receiver', async function () {
    const { cmContract, account2, owner } = await deployCriptoMilhasFixture()
    await expect(cmContract.connect(account2).setNewFeeReceiver(account2.address)).to.be.revertedWithCustomError(cmContract, 'OnlyOwner')
  })

  it('Should set new fee receiver', async function () {
    const { cmContract, owner, account2 } = await deployCriptoMilhasFixture()
    await cmContract.connect(owner).setNewFeeReceiver(account2.address)
    const newFeeReceiver = await cmContract.getFeeReceiver()
    expect(newFeeReceiver).to.equal(account2.address)
  })

  it('Should deny access to not mediators', async function () {
    const { cmContract, account2 } = await deployCriptoMilhasFixture()
    const notMediator = await cmContract.mediators(account2.address)
    expect(notMediator).to.equal(false)
  })

  it('Should allow owner add others mediators', async function () {
    const { cmContract, owner, mediator1, mediator2 } = await deployCriptoMilhasFixture()
    await cmContract.connect(owner).addMediators([mediator1.address, mediator2.address])
    const checkMediator1 = await cmContract.mediators(mediator1.address)
    const checkMediator2 = await cmContract.mediators(mediator2.address)
    expect(checkMediator1).to.equal(true)
    expect(checkMediator2).to.equal(true)
  })

  it('Should not allow non owner add others mediators', async function () {
    const { cmContract, mediator1, mediator2 } = await deployCriptoMilhasFixture()
    await expect(cmContract.connect(mediator1).addMediators([mediator1.address, mediator2.address])).to.be.revertedWithCustomError(cmContract, 'OnlyOwner')
  })

  it('Should not allow mediators set fees', async function () {
    const { cmContract, owner, mediator1 } = await deployCriptoMilhasFixture()
    await expect(cmContract.connect(mediator1).setFeeByCategory(1, 30)).to.be.revertedWithCustomError(cmContract, 'OnlyOwner')
  })

  it('Should not allow users set fees', async function () {
    const { cmContract, account2 } = await deployCriptoMilhasFixture()
    await expect(cmContract.connect(account2).setFeeByCategory(1, 30)).to.be.revertedWithCustomError(cmContract, 'OnlyOwner')
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
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    console.log("allowed to spend",  await stablecoin.allowance(impersonateBuyer.address, cmContract.address))
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    const contractAmount = await stablecoin.balanceOf(cmContract.address)
    console.log("contract balance", contractAmount)
    expect(contractAmount).be.equal(200000000)
  })

  it('Should create a new purchase by buyer and send money and BUYER ASK TO POSTPONE', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    const prevPurchase = await cmContract.getPurchase(purchaseId)
    const daysToPostpone = 20
    await cmContract.connect(impersonateBuyer).postponePayment(purchaseId, daysToPostpone)
    const postponedPurchase = await cmContract.getPurchase(purchaseId)
    expect(parseInt(prevPurchase.withdrawalAllowDate) + parseInt(daysToPostpone * 24 * 60 * 60)).be.equal(postponedPurchase.withdrawalAllowDate)
  })

  it('Should not allow SELLER TO POSTPONE', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    const prevPurchase = await cmContract.getPurchase(purchaseId)
    const daysToPostpone = 20
    await expect(cmContract.connect(impersonateSeller).postponePayment(purchaseId, daysToPostpone)).to.be.revertedWithCustomError(cmContract, 'OnlyBuyer')
  })

  it('Should not allow BUYER TO POSTPONE MORE THAN 31 DAYS', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    const prevPurchase = await cmContract.getPurchase(purchaseId)
    const daysToPostpone = 31
    try {
      await cmContract.connect(impersonateBuyer).postponePayment(purchaseId, daysToPostpone)
    } catch (error) {
      expect(error.message).to.contain("Você pode pedir adiamento do prazo para liberação dos tokens em no máximo 30 dias.")
    }
  })

  it('Should not allow BUYER TO POSTPONE TWICE', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    const prevPurchase = await cmContract.getPurchase(purchaseId)
    const daysToPostpone = 20
    await cmContract.connect(impersonateBuyer).postponePayment(purchaseId, daysToPostpone)
    try {
      await cmContract.connect(impersonateBuyer).postponePayment(purchaseId, daysToPostpone)
    } catch (error) {
      expect(error.message).to.contain("Você pode pedir adiamento apenas uma vez. Mas também podera solicitar o bloqueio dos tokens.")
    }
  })

  it('Should deny to create a new purchase with < 10 days', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    console.log("allowed to spend",  await stablecoin.allowance(impersonateBuyer.address, cmContract.address))
    const daysToAddOnReceiveProduct = 5
    try {
      await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    } catch (error) {
      expect(error.message).to.contain("Data inválida. Mínimo de 10 dias")
    }
  })

  it('Should be locked the money for 24hours while seller not confirm, function must revert', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    console.log("allowed to spend",  await stablecoin.allowance(impersonateBuyer.address, cmContract.address))
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    try {
      await cmContract.connect(impersonateBuyer).refundRequest(purchaseId)
    } catch (error) {
      expect(error.message).to.contain("Aguarde pelo menos 24hs.")
    }
  })

  it('Seller should confirm', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    const purchaseBefore = await cmContract.getPurchase(purchaseId)
    expect(purchaseBefore.status).to.equal(0)
    await cmContract.connect(impersonateSeller).sellerConfirm(purchaseId)
    const purchaseAfter = await cmContract.getPurchase(purchaseId)
    expect(purchaseAfter.status).to.equal(1)
  })

  it('Should refundRequest after 24 hours if seller does not confirm', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await skipDaysOnBlockchain(1)
    await cmContract.connect(impersonateBuyer).refundRequest(purchaseId)
    const purchaseAfterRefunded = await cmContract.getPurchase(purchaseId)
    expect(purchaseAfterRefunded.status).to.equal(6) // 6 = refundedToBuyer
  })

  it('Should open dispute if seller had confirmed', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(purchaseId)
    const _purchaseConfirmedBySeller = await cmContract.getPurchase(purchaseId)
    expect(_purchaseConfirmedBySeller.status).to.equal(1) // 1 = confirmed
    // //simulating past 24 hours on evm
    await skipDaysOnBlockchain(1)
    await cmContract.connect(impersonateBuyer).refundRequest(purchaseId)
    const _purchase = await cmContract.getPurchase(purchaseId)
    expect(_purchase.status).to.equal(3) // 3 = RefundRequestedByBuyer
  })

  it('Seller Should not withdraw before time', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(purchaseId)
    // //simulating past 5 days on evm
    await skipDaysOnBlockchain(25)
    try {
      await cmContract.connect(impersonateSeller).sellerWithdraw(purchaseId)
    } catch (error) {
      const _purchase = await cmContract.getPurchase(purchaseId)
      expect(error.message).to.contain("Ainda não é permitido fazer a retirada, aguarde o prazo")
    }
  })

  it('Seller Should withdraw after time', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(purchaseId)
    // //simulating past 5 days on evm
    await skipDaysOnBlockchain(daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerWithdraw(purchaseId)
    const _purchase = await cmContract.getPurchase(purchaseId)
    expect(_purchase.status).to.equal(2) // 2 = resgate bem sucedido
  })

  it('Mediator Should set decision to buyer and buyer should withdraw', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, mediator1, owner, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(purchaseId)
    await cmContract.connect(owner).addMediators([mediator1.address])
    await cmContract.connect(mediator1).mediatorDecision(purchaseId, 4)
    const _purchaseBefore = await cmContract.getPurchase(purchaseId)
    expect(_purchaseBefore.status).to.equal(4) // 4 = status 4 decisao favoravel ao comprador
    await cmContract.connect(impersonateBuyer).buyerWithdraw(purchaseId)
    const _purchaseAfter = await cmContract.getPurchase(purchaseId)
    expect(_purchaseAfter.status).to.equal(6) // 6 = status 6 comprador resgatou
  })

  it('Mediator Should set decision to seller and seller should withdraw', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, mediator1, owner, purchaseId } = await deployCriptoMilhasFixture()
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, 200000000)
    const daysToAddOnReceiveProduct = 30
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, 200000000, impersonateSeller.address, 1, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(purchaseId)
    // //simulating past 5 days on evm
    await skipDaysOnBlockchain(daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateBuyer).refundRequest(purchaseId)
    await cmContract.connect(owner).addMediators([mediator1.address])
    await cmContract.connect(mediator1).mediatorDecision(purchaseId, 5)
    const _purchaseBefore = await cmContract.getPurchase(purchaseId)
    expect(_purchaseBefore.status).to.equal(5) // 5 = status 5 decisao favoravel ao vendedor
    await cmContract.connect(impersonateSeller).sellerWithdraw(purchaseId)
    const _purchaseAfter = await cmContract.getPurchase(purchaseId)
    // console.log(_purchaseAfter)
    expect(_purchaseAfter.status).to.equal(2) // 2 = status 2 seller retirou
  })
})

describe('COMMERCIAL MODULE CHECKING BALANCES', () => {
  it('Testing balances in a sucessful transaction', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, mediator1, owner, simpleSeller, purchaseId } = await deployCriptoMilhasFixture()
    const transactionValue = randomNumber(100, 100)
    // const transactionValue = randomNumber(1, 80000000000)
    const setFee = randomNumber(0, 7)
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, transactionValue)
    const daysToAddOnReceiveProduct = 30
    const buyerBefore = await stablecoin.balanceOf(impersonateBuyer.address)
    const contractBefore = await stablecoin.balanceOf(cmContract.address)
    const sellerBefore = await stablecoin.balanceOf(simpleSeller.address)
    const ownerBefore = await stablecoin.balanceOf(owner.address)
    const fee = await cmContract.getFeeByCategory(setFee)
    console.log('---------FIRST DATA------------')
    console.log(`Transaction value ${transactionValue}`)
    console.log(`Balance stablecoin impersonateBuyer BEFORE ${buyerBefore}`)
    console.log(`Balance stablecoin seller BEFORE ${sellerBefore}`)
    console.log(`Balance stablecoin CRIPTOMILHAS BEFORE ${contractBefore}`)
    console.log(`Balance stablecoin owner BEFORE ${ownerBefore}`)
    console.log(`FEE category ${setFee} of ${fee}%`)
    // DEPOSITO
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, transactionValue, simpleSeller.address, setFee, daysToAddOnReceiveProduct)
    const buyerAfterDeposit = await stablecoin.balanceOf(impersonateBuyer.address)
    const sellerAfterDeposit = await stablecoin.balanceOf(simpleSeller.address)
    const contractAfterDeposit = await stablecoin.balanceOf(cmContract.address)
    const ownerAfterDeposit = await stablecoin.balanceOf(owner.address)
    console.log('---------AFTER DEPOSIT------------')
    console.log(`Balance stablecoin impersonateBuyer AFTER deposit ${buyerAfterDeposit}`)
    console.log(`Balance stablecoin seller AFTER deposit ${sellerAfterDeposit}`)
    console.log(`Balance stablecoin contract AFTER deposit ${contractAfterDeposit}`)
    console.log(`Balance stablecoin OWNER AFTER deposit ${ownerAfterDeposit}`)
    console.log(`Spent by buyer ${BigInt(buyerBefore) - BigInt(buyerAfterDeposit)}`)
    expect( BigInt( buyerAfterDeposit) + BigInt(contractAfterDeposit) ).to.equal( BigInt(buyerBefore) )

    // CONFIRMANDO E RETIRANDO
    await cmContract.connect(simpleSeller).sellerConfirm(purchaseId)
    skipDaysOnBlockchain(40)
    await cmContract.connect(simpleSeller).sellerWithdraw(purchaseId)
    const buyerAfterWithdraw = await stablecoin.balanceOf(impersonateBuyer.address)
    const sellerAfterWithdraw = await stablecoin.balanceOf(simpleSeller.address)
    const contractAfterWithdraw = await stablecoin.balanceOf(cmContract.address)
    const feeReceiver = await cmContract.getFeeReceiver()
    const feeReceiverAfterWithdraw = await stablecoin.balanceOf(feeReceiver)
    console.log('---------AFTER WITHDRAW------------')
    console.log(`+Balance stablecoin FEERECEIVER AFTER withdraw -----${feeReceiverAfterWithdraw}`)
    console.log(`+Balance stablecoin seller AFTER withdraw ----------${sellerAfterWithdraw}`)
    console.log(`+Balance stablecoin impersonateBuyer AFTER withdraw ${buyerAfterWithdraw}`)
    console.log(`=Balance stablecoin impersonateBuyer BEFORE --------${buyerBefore}`)
    console.log(`Balance stablecoin contract AFTER withdraw ${contractAfterWithdraw}`)
    expect( BigInt( feeReceiverAfterWithdraw ) + BigInt(sellerAfterWithdraw) + BigInt(buyerAfterWithdraw) ).to.equal( BigInt(buyerBefore) )
  })

  it('testing balances ---- Mediator Should set decision to buyer and buyer should withdraw', async function () {
    const { cmContract, impersonateBuyer, impersonateSeller, stablecoin, mediator1, owner, simpleSeller, purchaseId } = await deployCriptoMilhasFixture()
    const transactionValue = randomNumber(10000000, 1000000002)
    const setFee = randomNumber(0, 7)
    await stablecoin.connect(impersonateBuyer).approve(cmContract.address, transactionValue)
    const daysToAddOnReceiveProduct = 30
    const buyerBefore = await stablecoin.balanceOf(impersonateBuyer.address)
    await cmContract.connect(impersonateBuyer).purchase(purchaseId, stablecoin.address, transactionValue, impersonateSeller.address, setFee, daysToAddOnReceiveProduct)
    await cmContract.connect(impersonateSeller).sellerConfirm(purchaseId)
    await cmContract.connect(owner).addMediators([mediator1.address])
    await cmContract.connect(mediator1).mediatorDecision(purchaseId, 4)
    const _purchaseBefore = await cmContract.getPurchase(purchaseId)
    expect(_purchaseBefore.status).to.equal(4) // 4 = status 4 decisao favoravel ao comprador
    await cmContract.connect(impersonateBuyer).buyerWithdraw(purchaseId)
    const _purchaseAfter = await cmContract.getPurchase(purchaseId)
    expect(_purchaseAfter.status).to.equal(6) // 6 = status 6 comprador resgatou
    const buyerAfter = await stablecoin.balanceOf(impersonateBuyer.address)
    expect(buyerBefore).to.equal(buyerAfter)
  })
})
