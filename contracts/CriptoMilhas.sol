// SPDX-License-Identifier: None
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Owned {
    error OnlyOwner();
    address public owner;

    modifier onlyOwner() {
        if (owner != msg.sender) {
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

contract CriptoMilhas is Owned {
    error OnlyBuyer();
    error OnlySeller();
    error OnlyMediators();

    modifier onlyBuyer(uint256 _purchaseId) {
        Purchase memory _purchase = purchases[_purchaseId];
        if (_purchase.buyer != msg.sender) {
            revert OnlyBuyer();
        }
        _;
    }

    modifier onlySeller(uint256 _purchaseId) {
        Purchase memory _purchase = purchases[_purchaseId];
        if (_purchase.seller != msg.sender) {
            revert OnlySeller();
        }
        _;
    }

    modifier onlyMediators() {
        if (!mediators[msg.sender]) {
            revert OnlyMediators();
        }
        _;
    }

    enum Category {
        Product,
        Service
    }

    enum Status {
        Purchased,
        Confirmed,
        WithdrawnBySeller,
        RefundRequestedByBuyer,
        BuyerWithdrawalApproved,
        SellerWithdrawalApproved,
        RefundedToBuyer
    }

    struct Purchase {
        address tokenAddress;
        address buyer;
        address seller;
        address cancellationConfirmedBy;
        Status status;
        uint value;
        uint purchaseDate;
        uint confirmationDate;
        uint withdrawalDate;
        uint withdrawnDate;
        uint refundRequestedDate;
        uint refundedDate;
        uint purchaseFeePercentage;
    }

    mapping(Category => uint) feesByCategory;
    mapping(uint256 => Purchase) purchases;
    mapping(address => bool) public mediators;

    constructor() {
        owner = msg.sender;
        feesByCategory[Category.Service] = 15;
        feesByCategory[Category.Product] = 12;
    }

    function purchase(
        uint256 _purchaseId,
        address _tokenAddress,
        uint _value,
        address _seller,
        Category _Category,
        uint daysToAddOnReceiveProduct
    ) external {
        require(
            _tokenAddress != address(0),
            unicode"Endereço do token inválido"
        );
        require(daysToAddOnReceiveProduct > 7, unicode"Data inválida");
        IERC20 token = IERC20(_tokenAddress);
        uint256 tokenAmount = token.balanceOf(msg.sender);
        require(tokenAmount >= _value, "Saldo insuficiente de tokens");
        bool success = token.transferFrom(msg.sender, address(this), _value);
        require(success == true, unicode"Erro na transferência de tokens");
        purchases[_purchaseId] = Purchase({
            tokenAddress: _tokenAddress,
            buyer: msg.sender,
            seller: _seller,
            cancellationConfirmedBy: address(0),
            status: Status.Purchased,
            value: _value,
            purchaseDate: block.timestamp,
            confirmationDate: 0,
            withdrawalDate: daysToAddOnReceiveProduct * 1 days,
            withdrawnDate: 0,
            refundRequestedDate: 0,
            refundedDate: 0,
            purchaseFeePercentage: getFeeByCategory(_Category)
        });
    }

    function sellerConfirm(
        uint256 _purchaseId
    ) external onlySeller(_purchaseId) {
        Purchase storage _purchase = purchases[_purchaseId];
        _purchase.status = Status.Confirmed;
    }

    function refundRequest(
        uint256 _purchaseId
    ) external onlyBuyer(_purchaseId) {
        //nesta função, o comprador está querendo seu dinheiro de volta
        //mas poderá pedir apenas após 1 dia util (este é o tempo que o vendedor tem para confirmar)
        //se o vendedor não confirmar, o comprador poderá sacar normalmente após 1 dia
        //se o vendedor confirmar, será necessário disputa e o mediador deverá decidir quem irá sacar o dinheiro
        Purchase storage _purchase = purchases[_purchaseId];
        if (
            //_purchase.status == Status.Purchased &&
            block.timestamp < _purchase.purchaseDate + 1 days
        ) {
            revert(
                unicode"Aguarde pelo menos 24hs. Se o vendedor não confirmar a venda, você poderá resgatar todo o valor enviado."
            );
        }
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
            require(
                token.transfer(msg.sender, _purchase.value),
                unicode"Falha na transferência dos fundos"
            );
        } else {
            //o vendedor já havia confirmado, vai entrar em disputa
            _purchase.status = Status.RefundRequestedByBuyer;
            _purchase.refundRequestedDate = block.timestamp;
        }
    }

    function sellerWithdraw(
        uint256 _purchaseId
    ) external onlySeller(_purchaseId) {
        Purchase storage _purchase = purchases[_purchaseId];
        require(
            _purchase.status == Status.Confirmed ||
                _purchase.status == Status.SellerWithdrawalApproved,
            unicode"Não é permitido fazer a retirada devido ao status atual da compra"
        );
        require(
            block.timestamp > _purchase.withdrawalDate,
            unicode"Ainda não é permitido fazer a retirada, aguarde o prazo"
        );
        _purchase.status = Status.WithdrawnBySeller;
        _purchase.withdrawnDate = block.timestamp;
        uint feeValue = (_purchase.value * _purchase.purchaseFeePercentage) /
            100;
        // Realizar a transferência dos fundos para o vendedor
        IERC20 token = IERC20(_purchase.tokenAddress);
        require(
            token.transfer(msg.sender, _purchase.value - feeValue),
            unicode"Falha na transferência dos fundos"
        );
        require(
            token.transferFrom(address(this), owner, feeValue),
            unicode"Falha na transferência dos fundos (taxas da plataforma)"
        );
    }

    function buyerWithdraw(
        uint256 _purchaseId
    ) external onlyBuyer(_purchaseId) {
        Purchase storage _purchase = purchases[_purchaseId];
        require(
            _purchase.status == Status.BuyerWithdrawalApproved,
            unicode"O status atual não permite a retirada"
        );
        _purchase.status = Status.RefundedToBuyer;
        _purchase.refundedDate = block.timestamp;
        IERC20 token = IERC20(_purchase.tokenAddress);
        require(
            token.transfer(msg.sender, _purchase.value),
            unicode"Falha na transferência dos fundos"
        );
    }

    function mediatorDecision(
        uint256 _purchaseId,
        Status _statusToSet
    ) external onlyMediators {
        Purchase storage _purchase = purchases[_purchaseId];
        _purchase.status = _statusToSet;
    }

    function getPurchase(
        uint256 _purchaseId
    ) external view returns (Purchase memory) {
        return purchases[_purchaseId];
    }

    function setFeeByCategory(
        Category _purchaseCategory,
        uint256 _fee
    ) external onlyOwner {
        feesByCategory[_purchaseCategory] = _fee;
    }

    function addMediators(address[] memory addresses) external onlyOwner {
        uint i = 0;
        while (i < addresses.length) {
            mediators[addresses[i]] = true;
            i++;
        }
    }

    function removeMediators(address[] memory addresses) external onlyOwner {
        uint i = 0;
        while (i < addresses.length) {
            delete mediators[addresses[i]];
            i++;
        }
    }

    function getFeeByCategory(
        Category _purchaseCategory
    ) public view returns (uint256) {
        return feesByCategory[_purchaseCategory];
    }
}
