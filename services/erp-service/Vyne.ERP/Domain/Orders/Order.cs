namespace Vyne.ERP.Domain.Orders;

public enum OrderStatus { Draft, Confirmed, Processing, Shipped, Delivered, Cancelled }
public enum OrderType { Sale, Purchase }

public class Order
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string OrderNumber { get; private set; } = string.Empty;
    public OrderType Type { get; private set; }
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;
    public Guid? CustomerId { get; private set; }
    public Guid? SupplierId { get; private set; }
    public decimal Subtotal { get; private set; }
    public decimal TaxAmount { get; private set; }
    public decimal TotalAmount { get; private set; }
    public string? Notes { get; private set; }
    public string? CancellationReason { get; private set; }
    public DateTime? ShippedAt { get; private set; }
    public DateTime? DeliveredAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private readonly List<OrderLine> _lines = [];
    public IReadOnlyCollection<OrderLine> Lines => _lines.AsReadOnly();

    private Order() { }

    public static Order Create(
        Guid orgId,
        string orderNumber,
        OrderType type,
        Guid? customerId = null,
        Guid? supplierId = null,
        string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(orderNumber))
            throw new ArgumentException("Order number is required.", nameof(orderNumber));

        return new Order
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            OrderNumber = orderNumber.Trim(),
            Type = type,
            Status = OrderStatus.Draft,
            CustomerId = customerId,
            SupplierId = supplierId,
            Notes = notes,
            Subtotal = 0m,
            TaxAmount = 0m,
            TotalAmount = 0m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
    }

    public void AddLine(Guid productId, string productName, int quantity, decimal unitPrice)
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("Lines can only be added to Draft orders.");
        if (quantity <= 0)
            throw new ArgumentException("Quantity must be greater than zero.", nameof(quantity));
        if (unitPrice < 0)
            throw new ArgumentException("Unit price cannot be negative.", nameof(unitPrice));

        // Replace existing line for same product if present
        var existing = _lines.FirstOrDefault(l => l.ProductId == productId);
        if (existing is not null)
            _lines.Remove(existing);

        _lines.Add(OrderLine.Create(Id, productId, productName, quantity, unitPrice));
        RecalculateTotals();
    }

    public void RemoveLine(Guid lineId)
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("Lines can only be removed from Draft orders.");

        var line = _lines.FirstOrDefault(l => l.Id == lineId)
            ?? throw new InvalidOperationException($"Line '{lineId}' not found on this order.");

        _lines.Remove(line);
        RecalculateTotals();
    }

    public void Confirm()
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException($"Cannot confirm an order with status '{Status}'.");
        if (_lines.Count == 0)
            throw new InvalidOperationException("Cannot confirm an order with no lines.");

        Status = OrderStatus.Confirmed;
        UpdatedAt = DateTime.UtcNow;
    }

    public void StartProcessing()
    {
        if (Status != OrderStatus.Confirmed)
            throw new InvalidOperationException($"Cannot process an order with status '{Status}'.");

        Status = OrderStatus.Processing;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Ship()
    {
        if (Status is not (OrderStatus.Confirmed or OrderStatus.Processing))
            throw new InvalidOperationException($"Cannot ship an order with status '{Status}'.");

        Status = OrderStatus.Shipped;
        ShippedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deliver()
    {
        if (Status != OrderStatus.Shipped)
            throw new InvalidOperationException($"Cannot deliver an order with status '{Status}'.");

        Status = OrderStatus.Delivered;
        DeliveredAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel(string reason)
    {
        if (Status is OrderStatus.Delivered or OrderStatus.Cancelled)
            throw new InvalidOperationException($"Cannot cancel an order with status '{Status}'.");

        Status = OrderStatus.Cancelled;
        CancellationReason = reason;
        Notes = string.IsNullOrWhiteSpace(Notes)
            ? $"Cancelled: {reason}"
            : $"{Notes} | Cancelled: {reason}";
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateNotes(string? notes)
    {
        Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RecalculateTotals()
    {
        Subtotal = _lines.Sum(l => l.LineTotal);
        TaxAmount = Math.Round(Subtotal * 0.1m, 2);
        TotalAmount = Subtotal + TaxAmount;
        UpdatedAt = DateTime.UtcNow;
    }
}

public class OrderLine
{
    public Guid Id { get; private set; }
    public Guid OrderId { get; private set; }
    public Guid ProductId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public string? ProductSku { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal LineTotal => Quantity * UnitPrice;

    private OrderLine() { }

    public static OrderLine Create(
        Guid orderId,
        Guid productId,
        string productName,
        int quantity,
        decimal unitPrice,
        string? productSku = null)
        => new()
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            ProductId = productId,
            ProductName = productName,
            ProductSku = productSku,
            Quantity = quantity,
            UnitPrice = unitPrice,
        };
}
