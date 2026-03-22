using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Vyne.ERP.Controllers;
using Vyne.ERP.Domain.Inventory;
using Vyne.ERP.Domain.Orders;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Tests;

public class OrdersControllerTests : IDisposable
{
    private readonly ERPDbContext _db;
    private readonly Mock<ITenantContext> _tenantMock;
    private readonly Mock<ILogger<OrdersController>> _loggerMock;
    private readonly OrdersController _controller;
    private readonly Guid _orgId = Guid.NewGuid();

    public OrdersControllerTests()
    {
        _tenantMock = new Mock<ITenantContext>();
        _tenantMock.Setup(t => t.OrgId).Returns(_orgId);
        _tenantMock.Setup(t => t.IsAuthenticated).Returns(true);

        _loggerMock = new Mock<ILogger<OrdersController>>();

        var options = new DbContextOptionsBuilder<ERPDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _db = new ERPDbContext(options, _tenantMock.Object);
        _controller = new OrdersController(_db, _tenantMock.Object, _loggerMock.Object);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Product SeedProduct(string sku = "PROD-001", string name = "Test Product")
    {
        var product = Product.Create(
            _orgId, sku, name, ProductType.Physical,
            costPrice: 10.00m, salePrice: 25.00m);
        product.AdjustStock(100, "Initial stock");
        _db.Products.Add(product);
        _db.SaveChanges();
        return product;
    }

    private Order SeedOrder(
        string orderNumber = "ORD-001",
        OrderType type = OrderType.Sale,
        Product? product = null)
    {
        var order = Order.Create(_orgId, orderNumber, type);
        var p = product ?? SeedProduct($"PROD-{Guid.NewGuid():N}"[..8]);
        order.AddLine(p.Id, p.Name, 2, p.SalePrice);
        _db.Orders.Add(order);
        _db.SaveChanges();
        return order;
    }

    // ── GET /orders ─────────────────────────────────────────────────────────

    [Fact]
    public async Task ListOrders_ReturnsOkWithOrders()
    {
        // Arrange
        var product = SeedProduct();
        SeedOrder("ORD-001", product: product);
        SeedOrder("ORD-002", product: product);

        // Act
        var result = await _controller.ListOrders(
            type: null, status: null, customerId: null, supplierId: null,
            from: null, to: null);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = ok.Value!;
        var total = (int)value.GetType().GetProperty("total")!.GetValue(value)!;
        total.Should().Be(2);
    }

    [Fact]
    public async Task ListOrders_ReturnsEmptyWhenNoOrders()
    {
        // Act
        var result = await _controller.ListOrders(
            type: null, status: null, customerId: null, supplierId: null,
            from: null, to: null);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = ok.Value!;
        var total = (int)value.GetType().GetProperty("total")!.GetValue(value)!;
        total.Should().Be(0);
    }

    [Fact]
    public async Task ListOrders_FiltersByStatus()
    {
        // Arrange
        var product = SeedProduct();
        var order = SeedOrder("ORD-CONFIRM", product: product);
        order.Confirm();
        _db.SaveChanges();

        SeedOrder("ORD-DRAFT", product: product);

        // Act
        var result = await _controller.ListOrders(
            type: null, status: OrderStatus.Draft, customerId: null,
            supplierId: null, from: null, to: null);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = ok.Value!;
        var total = (int)value.GetType().GetProperty("total")!.GetValue(value)!;
        total.Should().Be(1);
    }

    [Fact]
    public async Task ListOrders_FiltersByType()
    {
        // Arrange
        var product = SeedProduct();
        SeedOrder("ORD-SALE", OrderType.Sale, product);
        SeedOrder("ORD-PO", OrderType.Purchase, product);

        // Act
        var result = await _controller.ListOrders(
            type: OrderType.Purchase, status: null, customerId: null,
            supplierId: null, from: null, to: null);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = ok.Value!;
        var total = (int)value.GetType().GetProperty("total")!.GetValue(value)!;
        total.Should().Be(1);
    }

    [Fact]
    public async Task ListOrders_ReturnsUnauthorizedWhenNoTenant()
    {
        // Arrange
        _tenantMock.Setup(t => t.OrgId).Returns((Guid?)null);

        // Act
        var result = await _controller.ListOrders(
            type: null, status: null, customerId: null, supplierId: null,
            from: null, to: null);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    // ── POST /orders ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateOrder_ReturnsCreatedResult()
    {
        // Arrange
        var product = SeedProduct();
        var request = new CreateOrderRequest(
            OrderNumber: "NEW-ORD-001",
            Type: OrderType.Sale,
            CustomerId: Guid.NewGuid(),
            SupplierId: null,
            Notes: "Test order",
            Lines: new List<OrderLineRequest>
            {
                new(ProductId: product.Id, Quantity: 3, UnitPrice: null)
            });

        // Act
        var result = await _controller.CreateOrder(request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<CreatedAtActionResult>();
    }

    [Fact]
    public async Task CreateOrder_RejectsEmptyOrderNumber()
    {
        // Arrange
        var request = new CreateOrderRequest(
            OrderNumber: "",
            Type: OrderType.Sale,
            CustomerId: null,
            SupplierId: null,
            Notes: null,
            Lines: new List<OrderLineRequest>
            {
                new(ProductId: Guid.NewGuid(), Quantity: 1, UnitPrice: 10m)
            });

        // Act
        var result = await _controller.CreateOrder(request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateOrder_RejectsNoLines()
    {
        // Arrange
        var request = new CreateOrderRequest(
            OrderNumber: "ORD-NOLINE",
            Type: OrderType.Sale,
            CustomerId: null,
            SupplierId: null,
            Notes: null,
            Lines: new List<OrderLineRequest>());

        // Act
        var result = await _controller.CreateOrder(request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateOrder_RejectsNullLines()
    {
        // Arrange
        var request = new CreateOrderRequest(
            OrderNumber: "ORD-NULL",
            Type: OrderType.Sale,
            CustomerId: null,
            SupplierId: null,
            Notes: null,
            Lines: null!);

        // Act
        var result = await _controller.CreateOrder(request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateOrder_RejectsDuplicateOrderNumber()
    {
        // Arrange
        var product = SeedProduct();
        SeedOrder("DUPLICATE-001", product: product);

        var request = new CreateOrderRequest(
            OrderNumber: "DUPLICATE-001",
            Type: OrderType.Sale,
            CustomerId: null,
            SupplierId: null,
            Notes: null,
            Lines: new List<OrderLineRequest>
            {
                new(ProductId: product.Id, Quantity: 1, UnitPrice: null)
            });

        // Act
        var result = await _controller.CreateOrder(request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task CreateOrder_ReturnsUnprocessableForMissingProduct()
    {
        // Arrange
        var request = new CreateOrderRequest(
            OrderNumber: "ORD-MISSING",
            Type: OrderType.Sale,
            CustomerId: null,
            SupplierId: null,
            Notes: null,
            Lines: new List<OrderLineRequest>
            {
                new(ProductId: Guid.NewGuid(), Quantity: 1, UnitPrice: null)
            });

        // Act
        var result = await _controller.CreateOrder(request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<UnprocessableEntityObjectResult>();
    }

    // ── Order Status Transitions ────────────────────────────────────────────

    [Fact]
    public async Task ConfirmOrder_TransitionsFromDraftToConfirmed()
    {
        // Arrange
        var product = SeedProduct();
        var order = SeedOrder("ORD-TRANS-1", product: product);

        // Act
        var result = await _controller.ConfirmOrder(order.Id, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var refreshed = await _db.Orders.FirstAsync(o => o.Id == order.Id);
        refreshed.Status.Should().Be(OrderStatus.Confirmed);
    }

    [Fact]
    public async Task ShipOrder_TransitionsFromConfirmedToShipped()
    {
        // Arrange
        var product = SeedProduct();
        var order = SeedOrder("ORD-TRANS-2", product: product);
        order.Confirm();
        await _db.SaveChangesAsync();

        // Act
        var result = await _controller.ShipOrder(order.Id, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var refreshed = await _db.Orders.FirstAsync(o => o.Id == order.Id);
        refreshed.Status.Should().Be(OrderStatus.Shipped);
    }

    [Fact]
    public async Task DeliverOrder_TransitionsFromShippedToDelivered()
    {
        // Arrange
        var product = SeedProduct();
        var order = SeedOrder("ORD-TRANS-3", product: product);
        order.Confirm();
        order.Ship();
        await _db.SaveChangesAsync();

        // Act
        var result = await _controller.DeliverOrder(order.Id, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var refreshed = await _db.Orders.FirstAsync(o => o.Id == order.Id);
        refreshed.Status.Should().Be(OrderStatus.Delivered);
    }

    [Fact]
    public async Task ConfirmOrder_FailsWhenAlreadyConfirmed()
    {
        // Arrange
        var product = SeedProduct();
        var order = SeedOrder("ORD-FAIL-1", product: product);
        order.Confirm();
        await _db.SaveChangesAsync();

        // Act
        var result = await _controller.ConfirmOrder(order.Id, CancellationToken.None);

        // Assert
        result.Should().BeOfType<UnprocessableEntityObjectResult>();
    }

    [Fact]
    public async Task ShipOrder_FailsWhenDraft()
    {
        // Arrange
        var product = SeedProduct();
        var order = SeedOrder("ORD-FAIL-2", product: product);

        // Act
        var result = await _controller.ShipOrder(order.Id, CancellationToken.None);

        // Assert
        result.Should().BeOfType<UnprocessableEntityObjectResult>();
    }

    [Fact]
    public async Task DeliverOrder_FailsWhenNotShipped()
    {
        // Arrange
        var product = SeedProduct();
        var order = SeedOrder("ORD-FAIL-3", product: product);
        order.Confirm();
        await _db.SaveChangesAsync();

        // Act - try to deliver a Confirmed order (not Shipped)
        var result = await _controller.DeliverOrder(order.Id, CancellationToken.None);

        // Assert
        result.Should().BeOfType<UnprocessableEntityObjectResult>();
    }

    [Fact]
    public async Task CancelOrder_CancelsDraftOrder()
    {
        // Arrange
        var product = SeedProduct();
        var order = SeedOrder("ORD-CANCEL-1", product: product);
        var body = new CancelOrderRequest("Customer requested cancellation");

        // Act
        var result = await _controller.CancelOrder(order.Id, body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var refreshed = await _db.Orders.FirstAsync(o => o.Id == order.Id);
        refreshed.Status.Should().Be(OrderStatus.Cancelled);
    }

    [Fact]
    public async Task CancelOrder_FailsForDeliveredOrder()
    {
        // Arrange
        var product = SeedProduct();
        var order = SeedOrder("ORD-CANCEL-2", product: product);
        order.Confirm();
        order.Ship();
        order.Deliver();
        await _db.SaveChangesAsync();

        var body = new CancelOrderRequest("Too late");

        // Act
        var result = await _controller.CancelOrder(order.Id, body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<UnprocessableEntityObjectResult>();
    }

    [Fact]
    public async Task CancelOrder_RejectsEmptyReason()
    {
        // Arrange
        var product = SeedProduct();
        var order = SeedOrder("ORD-CANCEL-3", product: product);
        var body = new CancelOrderRequest("");

        // Act
        var result = await _controller.CancelOrder(order.Id, body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    // ── Order Validation (Quantities) ───────────────────────────────────────

    [Fact]
    public void Order_AddLine_RejectsZeroQuantity()
    {
        // Arrange
        var order = Order.Create(_orgId, "ORD-QTY-0", OrderType.Sale);

        // Act & Assert
        var act = () => order.AddLine(Guid.NewGuid(), "Product", 0, 10.00m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Order_AddLine_RejectsNegativeQuantity()
    {
        // Arrange
        var order = Order.Create(_orgId, "ORD-QTY-NEG", OrderType.Sale);

        // Act & Assert
        var act = () => order.AddLine(Guid.NewGuid(), "Product", -1, 10.00m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Order_AddLine_RejectsNegativeUnitPrice()
    {
        // Arrange
        var order = Order.Create(_orgId, "ORD-PRICE-NEG", OrderType.Sale);

        // Act & Assert
        var act = () => order.AddLine(Guid.NewGuid(), "Product", 1, -5.00m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Order_Create_RejectsEmptyOrderNumber()
    {
        // Act & Assert
        var act = () => Order.Create(_orgId, "", OrderType.Sale);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Order_ConfirmWithNoLines_Throws()
    {
        // Arrange
        var order = Order.Create(_orgId, "ORD-EMPTY", OrderType.Sale);

        // Act & Assert
        var act = () => order.Confirm();
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*no lines*");
    }
}
