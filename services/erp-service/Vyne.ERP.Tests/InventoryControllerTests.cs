using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Vyne.ERP.Controllers;
using Vyne.ERP.Domain.Inventory;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Tests;

public class InventoryControllerTests : IDisposable
{
    private readonly ERPDbContext _db;
    private readonly Mock<ITenantContext> _tenantMock;
    private readonly Mock<ILogger<InventoryController>> _loggerMock;
    private readonly InventoryController _controller;
    private readonly Guid _orgId = Guid.NewGuid();

    public InventoryControllerTests()
    {
        _tenantMock = new Mock<ITenantContext>();
        _tenantMock.Setup(t => t.OrgId).Returns(_orgId);
        _tenantMock.Setup(t => t.IsAuthenticated).Returns(true);

        _loggerMock = new Mock<ILogger<InventoryController>>();

        var options = new DbContextOptionsBuilder<ERPDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _db = new ERPDbContext(options, _tenantMock.Object);
        _controller = new InventoryController(_db, _tenantMock.Object, _loggerMock.Object);

        // Set up a default HttpContext for the controller
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

    private Product SeedProduct(
        string sku = "TEST-001",
        string name = "Test Product",
        string? category = null,
        bool isActive = true,
        int stockQuantity = 100,
        int reorderPoint = 10)
    {
        var product = Product.Create(
            _orgId, sku, name, ProductType.Physical,
            costPrice: 10.00m, salePrice: 20.00m,
            reorderPoint: reorderPoint, reorderQuantity: 50);

        if (category is not null)
            product.Update(category: category);

        if (!isActive)
            product.Deactivate();

        if (stockQuantity > 0)
            product.AdjustStock(stockQuantity, "Initial stock");

        _db.Products.Add(product);
        _db.SaveChanges();
        return product;
    }

    // ── GET /inventory/products ──────────────────────────────────────────────

    [Fact]
    public async Task ListProducts_ReturnsOkWithProducts()
    {
        // Arrange
        SeedProduct("SKU-A", "Alpha Product");
        SeedProduct("SKU-B", "Beta Product");

        // Act
        var result = await _controller.ListProducts(
            category: null, search: null, active: null, type: null);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = ok.Value!;
        var total = (int)value.GetType().GetProperty("total")!.GetValue(value)!;
        total.Should().Be(2);
    }

    [Fact]
    public async Task ListProducts_ReturnsEmptyWhenNoProducts()
    {
        // Act
        var result = await _controller.ListProducts(
            category: null, search: null, active: null, type: null);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = ok.Value!;
        var total = (int)value.GetType().GetProperty("total")!.GetValue(value)!;
        total.Should().Be(0);
    }

    [Fact]
    public async Task ListProducts_FiltersByCategory()
    {
        // Arrange
        SeedProduct("SKU-A", "Alpha", category: "Electronics");
        SeedProduct("SKU-B", "Beta", category: "Electronics");
        SeedProduct("SKU-C", "Charlie", category: "Furniture");

        // Act
        var result = await _controller.ListProducts(
            category: "Electronics", search: null, active: null, type: null);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = ok.Value!;
        var total = (int)value.GetType().GetProperty("total")!.GetValue(value)!;
        total.Should().Be(2);
    }

    [Fact]
    public async Task ListProducts_FiltersByActiveStatus()
    {
        // Arrange
        SeedProduct("SKU-A", "Active Product", isActive: true);
        SeedProduct("SKU-B", "Inactive Product", isActive: false);

        // Act
        var result = await _controller.ListProducts(
            category: null, search: null, active: true, type: null);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = ok.Value!;
        var total = (int)value.GetType().GetProperty("total")!.GetValue(value)!;
        total.Should().Be(1);
    }

    [Fact]
    public async Task ListProducts_FiltersBySearchTerm()
    {
        // Arrange
        SeedProduct("SKU-A", "Power Supply");
        SeedProduct("SKU-B", "Network Cable");

        // Act
        var result = await _controller.ListProducts(
            category: null, search: "power", active: null, type: null);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = ok.Value!;
        var total = (int)value.GetType().GetProperty("total")!.GetValue(value)!;
        total.Should().Be(1);
    }

    [Fact]
    public async Task ListProducts_FiltersByProductType()
    {
        // Arrange
        SeedProduct("SKU-A", "Physical Item");
        var serviceProduct = Product.Create(
            _orgId, "SVC-001", "Consulting", ProductType.Service,
            costPrice: 0m, salePrice: 100m);
        _db.Products.Add(serviceProduct);
        await _db.SaveChangesAsync();

        // Act
        var result = await _controller.ListProducts(
            category: null, search: null, active: null, type: ProductType.Service);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = ok.Value!;
        var total = (int)value.GetType().GetProperty("total")!.GetValue(value)!;
        total.Should().Be(1);
    }

    [Fact]
    public async Task ListProducts_ReturnsUnauthorizedWhenNoTenant()
    {
        // Arrange
        _tenantMock.Setup(t => t.OrgId).Returns((Guid?)null);

        // Act
        var result = await _controller.ListProducts(
            category: null, search: null, active: null, type: null);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    // ── POST /inventory/products ─────────────────────────────────────────────

    [Fact]
    public async Task CreateProduct_ReturnsCreatedResult()
    {
        // Arrange
        var request = new CreateProductRequest(
            Sku: "NEW-001",
            Name: "New Product",
            Description: "A test product",
            Type: ProductType.Physical,
            CostPrice: 5.00m,
            SalePrice: 15.00m,
            ReorderPoint: 10,
            ReorderQuantity: 50,
            SupplierId: null,
            Category: "Electronics",
            ImageUrl: null);

        // Act
        var result = await _controller.CreateProduct(request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<CreatedAtActionResult>();
        var created = result as CreatedAtActionResult;
        var product = created!.Value as Product;
        product.Should().NotBeNull();
        product!.Name.Should().Be("New Product");
        product.Sku.Should().Be("NEW-001"); // Should be uppercased
    }

    [Fact]
    public async Task CreateProduct_RejectsDuplicateSku()
    {
        // Arrange
        SeedProduct("DUP-SKU", "Original Product");

        var request = new CreateProductRequest(
            Sku: "DUP-SKU",
            Name: "Duplicate Product",
            Description: null,
            Type: ProductType.Physical,
            CostPrice: 5.00m,
            SalePrice: 15.00m,
            ReorderPoint: null,
            ReorderQuantity: null,
            SupplierId: null,
            Category: null,
            ImageUrl: null);

        // Act
        var result = await _controller.CreateProduct(request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task CreateProduct_RejectsEmptySku()
    {
        // Arrange
        var request = new CreateProductRequest(
            Sku: "",
            Name: "Product",
            Description: null,
            Type: ProductType.Physical,
            CostPrice: 5.00m,
            SalePrice: 15.00m,
            ReorderPoint: null,
            ReorderQuantity: null,
            SupplierId: null,
            Category: null,
            ImageUrl: null);

        // Act
        var result = await _controller.CreateProduct(request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateProduct_RejectsEmptyName()
    {
        // Arrange
        var request = new CreateProductRequest(
            Sku: "SKU-001",
            Name: "",
            Description: null,
            Type: ProductType.Physical,
            CostPrice: 5.00m,
            SalePrice: 15.00m,
            ReorderPoint: null,
            ReorderQuantity: null,
            SupplierId: null,
            Category: null,
            ImageUrl: null);

        // Act
        var result = await _controller.CreateProduct(request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateProduct_ReturnsUnauthorizedWhenNoTenant()
    {
        // Arrange
        _tenantMock.Setup(t => t.OrgId).Returns((Guid?)null);

        var request = new CreateProductRequest(
            Sku: "SKU-001", Name: "Product", Description: null,
            Type: ProductType.Physical, CostPrice: 5.00m, SalePrice: 15.00m,
            ReorderPoint: null, ReorderQuantity: null, SupplierId: null,
            Category: null, ImageUrl: null);

        // Act
        var result = await _controller.CreateProduct(request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    // ── Stock Level Validation ───────────────────────────────────────────────

    [Fact]
    public async Task AdjustStock_RejectsNegativeResultingQuantity()
    {
        // Arrange
        var product = SeedProduct("STK-001", "Stock Item", stockQuantity: 5);

        var request = new AdjustStockRequest(Delta: -10, Reason: "Over-deduction");

        // Act
        var result = await _controller.AdjustStock(product.Id, request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<UnprocessableEntityObjectResult>();
    }

    [Fact]
    public async Task AdjustStock_AllowsValidPositiveAdjustment()
    {
        // Arrange
        var product = SeedProduct("STK-002", "Stock Item", stockQuantity: 10);

        var request = new AdjustStockRequest(Delta: 20, Reason: "Restocking");

        // Act
        var result = await _controller.AdjustStock(product.Id, request, CancellationToken.None);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = ok.Value!;
        var qty = (int)value.GetType().GetProperty("StockQuantity")!.GetValue(value)!;
        qty.Should().Be(30); // 10 + 20
    }

    [Fact]
    public async Task AdjustStock_RejectsZeroDelta()
    {
        // Arrange
        var product = SeedProduct("STK-003", "Stock Item");

        var request = new AdjustStockRequest(Delta: 0, Reason: "No change");

        // Act
        var result = await _controller.AdjustStock(product.Id, request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task AdjustStock_RejectsEmptyReason()
    {
        // Arrange
        var product = SeedProduct("STK-004", "Stock Item");

        var request = new AdjustStockRequest(Delta: 5, Reason: "");

        // Act
        var result = await _controller.AdjustStock(product.Id, request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task AdjustStock_ReturnsNotFoundForMissingProduct()
    {
        // Act
        var request = new AdjustStockRequest(Delta: 5, Reason: "Test");
        var result = await _controller.AdjustStock(Guid.NewGuid(), request, CancellationToken.None);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ── GET /inventory/low-stock ─────────────────────────────────────────────

    [Fact]
    public async Task GetLowStockProducts_ReturnsLowStockItems()
    {
        // Arrange - product with stock at or below reorder point
        SeedProduct("LOW-001", "Low Stock Item", stockQuantity: 5, reorderPoint: 10);
        SeedProduct("HIGH-001", "High Stock Item", stockQuantity: 100, reorderPoint: 10);

        // Act
        var result = await _controller.GetLowStockProducts(CancellationToken.None);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = ok.Value!;
        var total = (int)value.GetType().GetProperty("total")!.GetValue(value)!;
        total.Should().Be(1);
    }

    // ── GET /inventory/products/{id} ─────────────────────────────────────────

    [Fact]
    public async Task GetProduct_ReturnsProductWhenExists()
    {
        // Arrange
        var product = SeedProduct("GET-001", "Existing Product");

        // Act
        var result = await _controller.GetProduct(product.Id, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetProduct_ReturnsNotFoundForMissingProduct()
    {
        // Act
        var result = await _controller.GetProduct(Guid.NewGuid(), CancellationToken.None);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }
}
