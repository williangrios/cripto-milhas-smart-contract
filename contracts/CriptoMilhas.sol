// Dev: Willian Gonçalves Rios
// O presente smart contract tem o objetivo de intermediar relações comerciais entre pessoas
// interessadas na compra e venda de passagens aéreas e produtos
// Neste smart-contract, a única autoridade do owner é adicionar e remover mediadores. O owner
// não tem nenhum poder de fazer retiradas de fundos conforme você mesmo pode conferir no código.
// As taxas que a plataforma recebe a título de intermediação são enviadas à wallet do owner todas
// as vezes que o vendedor de passagem/produto faz sua retirada (ou seja, quando uma negociação
// é bem sucedida), isso garante que nosso smart-contract sempre haverá fundos para pagar todos os usuários
// bem como fazer a devolução caso uma compra não se concretize.

// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

contract Owned {
    error OnlyOwner();
    address public owner;

    modifier onlyOwner() {
        if (owner != tx.origin) {
            revert OnlyOwner();
        }
        _;
    }

    function setNewOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function getContractOwner() public view returns (address) {
        return owner;
    }
}

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
contract CriptoMilhas is Owned {
    error OnlyBuyer();
    error OnlySeller();
    error OnlyMediators();

    modifier onlyBuyer(string memory _purchaseId) {
        if (purchases[_purchaseId].buyer != tx.origin) revert OnlyBuyer();
        _;
    }

    modifier onlySeller(string memory _purchaseId) {
        if (purchases[_purchaseId].seller != tx.origin) revert OnlySeller();
        _;
    }

    modifier onlyMediators() {
        if (!mediators[tx.origin]) revert OnlyMediators();
        _;
    }

    enum Category {
        Other,
        AirlineTickets,
        Product,
        Accomodation,
        CarRental,
        ClassUpgrade,
        Event,
        AdditionalFee // utilizada quando se precisa cancelar, remarcar voo etc
    }

    enum Status {
        Purchased, // quando o comprador deposita os tokens
        Confirmed, // quando o vendedor confirma que vai enviar o produto ou emitir a passagem
        WithdrawnBySeller, // quando o vendedor resgatar seus fundos (negociação bem sucedida)
        RefundRequestedByBuyer, // o comprador pediu para travar os fundos por demora na chegada do produto ou dos tickets (entra na mediação)
        BuyerWithdrawalApproved, // o mediador decidiu que o buyer pode resgatar (podera resgatar imediatamente)
        SellerWithdrawalApproved, // o mediador decidiu que o seller pode resgatar (deve esperar o prazo)
        RefundedToBuyer // quando o vendedor nao confirma em 24h e o comprador resgatou seu dinheiro
                        // também pode acontecer quando o vendedor decide devolver o dinheiro para o comprador
                        // também ocorre quando o mediador devolve o dinheiro para o comprador
    }

    struct Purchase {
        address tokenAddress; // endereço do smart-contract da stablecoin
        address buyer;
        address seller;
        Status status; // status atual da compra
        uint value; // quantidade de tokens/dolares
        uint purchaseDate;
        uint confirmationDate; // data em que o seller confirmou que vai vender
        uint withdrawalAllowDate; // data em que o seller poderá fazer o saque
        uint withdrawnDate; // data em que o seller fez o saque
        uint refundRequestedDate; // data em que o buyer solicitou mediação
        uint refundedDate; // data que os valores foram restituidos ao buyer (devolvidos na totalidade, sem taxas)
        uint purchaseFeePercentage;
        bool postponed;
    }

    mapping(Category => uint) feesByCategory;
    mapping(string => Purchase) purchases;
    mapping(address => bool) public mediators;
    address private feeReceiver;

    constructor() {
        owner = tx.origin;
        feeReceiver = tx.origin;
        feesByCategory[Category.Other] = 10;
        feesByCategory[Category.AirlineTickets] = 8;
        feesByCategory[Category.Product] = 8;
        feesByCategory[Category.Accomodation] = 7;
        feesByCategory[Category.CarRental] = 7;
        feesByCategory[Category.ClassUpgrade] = 6;
        feesByCategory[Category.Event] = 6;
        feesByCategory[Category.AdditionalFee] = 8;
    }

    function purchase(
        string memory _purchaseId,
        address _tokenAddress, // endereço do smart contract da stablecoin escolhida
        uint _value, // quantidade de tokens
        address _seller,
        Category _Category, // categoria do produto/serviço
        uint daysToAddOnReceiveProductOrService // dias a ser adicionado para que o buyer possa receber
                                                // seu produto/serviço ou mesmo retornar de viagem
    ) external {
        require(
            _tokenAddress != address(0),
            unicode"Endereço de token inválido"
        );
        require(
            _seller != address(0),
            unicode"Endereço do vendedor inválido"
        );
        require(daysToAddOnReceiveProductOrService > 10, unicode"Data inválida. Mínimo de 10 dias.");
        IERC20 token = IERC20(_tokenAddress);
        uint256 tokenAmount = token.balanceOf(tx.origin);
        require(tokenAmount >= _value, "Saldo insuficiente de tokens");
        bool success = token.transferFrom(tx.origin, address(this), _value);
        require(success == true, unicode"Erro na transferência de tokens");
        purchases[_purchaseId] = Purchase({
            tokenAddress: _tokenAddress,
            buyer: tx.origin,
            seller: _seller,
            status: Status.Purchased,
            value: _value,
            purchaseDate: block.timestamp,
            confirmationDate: 0,
            withdrawalAllowDate: block.timestamp + (daysToAddOnReceiveProductOrService * 1 days),
            withdrawnDate: 0,
            refundRequestedDate: 0,
            refundedDate: 0,
            purchaseFeePercentage: getFeeByCategory(_Category),
            postponed: false
        });
    }

    function sellerConfirm(
        string memory _purchaseId
    ) external onlySeller(_purchaseId) {
        Purchase storage _purchase = purchases[_purchaseId];
        _purchase.status = Status.Confirmed;
        _purchase.confirmationDate = block.timestamp;
    }

    function postponePayment(
        string memory _purchaseId,
        uint _days
    ) external onlyBuyer(_purchaseId) {
        require(_days <31 , unicode'Você pode pedir adiamento do prazo para liberação dos tokens em no máximo 30 dias. Caso você entenda que não seja suficiente, poderá solicitar o bloqueio dos tokens.');
        Purchase storage _purchase = purchases[_purchaseId];
        require(!_purchase.postponed, unicode'Você pode pedir adiamento apenas uma vez. Mas também podera solicitar o bloqueio dos tokens.');
        _purchase.postponed = true;
        _purchase.withdrawalAllowDate = _purchase.withdrawalAllowDate + (_days * 1 days);
    }

    function refundRequest(
        string memory _purchaseId
    ) external onlyBuyer(_purchaseId) {
        //nesta função, o comprador está querendo seu dinheiro de volta
        //mas poderá pedir apenas após 1 dia util (este é o tempo que o vendedor tem para confirmar)
        //se o vendedor não confirmar, o comprador poderá sacar normalmente após 1 dia
        //se o vendedor confirmar, será necessário disputa e o mediador deverá decidir quem irá sacar os tokens
        Purchase storage _purchase = purchases[_purchaseId];
        require((_purchase.purchaseDate + 1 days) < block.timestamp, unicode"Aguarde pelo menos 24hs. Se o vendedor não confirmar a venda, você poderá resgatar todo o valor enviado.");
        require(
            _purchase.status == Status.Confirmed ||
                _purchase.status == Status.Purchased,
            unicode"Com o status atual não é possível solicitar reembolso."
        );
        if (_purchase.status == Status.Purchased) {
            //vendedor não confirmou em 24hs, devolva todo o dinheiro ao comprador
            _purchase.status = Status.RefundedToBuyer;
            _purchase.refundedDate = block.timestamp;
            IERC20 token = IERC20(_purchase.tokenAddress);
            require(token.transfer(tx.origin, _purchase.value), unicode"Falha na transferência dos fundos");
        } else {
            //o vendedor já havia confirmado, vai entrar em disputa
            _purchase.status = Status.RefundRequestedByBuyer;
            _purchase.refundRequestedDate = block.timestamp;
        }
    }

    function sellerWithdraw(string memory _purchaseId) external onlySeller(_purchaseId) {
        Purchase storage _purchase = purchases[_purchaseId];
        require(_purchase.status == Status.Confirmed || _purchase.status == Status.SellerWithdrawalApproved, unicode"Não é permitido fazer a retirada devido ao status atual da compra");
        require(block.timestamp > _purchase.withdrawalAllowDate, unicode"Ainda não é permitido fazer a retirada, aguarde o prazo");
        _purchase.status = Status.WithdrawnBySeller;
        _purchase.withdrawnDate = block.timestamp;
        uint feeValue = (_purchase.value * _purchase.purchaseFeePercentage) / 100;
        // Realizar a transferência dos fundos para o vendedor e também as taxas da plataforma para o owner
        IERC20 token = IERC20(_purchase.tokenAddress);
        require(token.transfer(tx.origin, _purchase.value - feeValue), unicode"Falha na transferência dos fundos");
        require(token.transferFrom(address(this), feeReceiver, feeValue), unicode"Falha na transferência dos fundos (taxas da plataforma)");
    }

    function buyerWithdraw (string memory _purchaseId) external onlyBuyer(_purchaseId) {
        Purchase storage _purchase = purchases[_purchaseId];
        require(_purchase.status == Status.BuyerWithdrawalApproved, unicode"O status atual não permite a retirada");
        _purchase.status = Status.RefundedToBuyer;
        _purchase.refundedDate = block.timestamp;
        IERC20 token = IERC20(_purchase.tokenAddress);
        require(token.transfer(tx.origin, _purchase.value), unicode"Falha na transferência dos fundos");
    }

    function mediatorDecision (string memory _purchaseId,Status _statusToSet) external onlyMediators {
        Purchase storage _purchase = purchases[_purchaseId];
        _purchase.status = _statusToSet;
    }

    function getPurchase(string memory _purchaseId) external view returns (Purchase memory) {
        return purchases[_purchaseId];
    }

    function setFeeByCategory (Category _purchaseCategory,uint256 _fee) external onlyOwner {
        feesByCategory[_purchaseCategory] = _fee;
    }

    function addMediators (address[] memory addresses) external onlyOwner {
        uint i = 0;
        while (i < addresses.length) {
            mediators[addresses[i]] = true;
            i++;
        }
    }

    function removeMediators (address[] memory addresses) external onlyOwner {
        uint i = 0;
        while (i < addresses.length) {
            delete mediators[addresses[i]];
            i++;
        }
    }

    function setNewFeeReceiver (address _feeReceiver) external onlyOwner {
      feeReceiver = _feeReceiver;
    }

    function getFeeReceiver() public view returns (address) {
        return feeReceiver;
    }

    function getFeeByCategory (Category _purchaseCategory) public view returns (uint256) {
        return feesByCategory[_purchaseCategory];
    }
}
