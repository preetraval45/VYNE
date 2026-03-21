namespace Vyne.ERP.Domain.Manufacturing;

public class BillOfMaterials
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public Guid ProductId { get; private set; }  // finished product
    public string Version { get; private set; } = "1.0";
    public bool IsActive { get; private set; } = true;
    public string? Notes { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public ICollection<BomComponent> Components { get; private set; } = [];

    private BillOfMaterials() { }

    public static BillOfMaterials Create(
        Guid orgId,
        Guid productId,
        string version = "1.0",
        string? notes = null)
        => new()
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            ProductId = productId,
            Version = version,
            Notes = notes,
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
        };

    public void AddComponent(Guid componentProductId, decimal quantity, string unitOfMeasure = "pcs")
    {
        if (quantity <= 0)
            throw new ArgumentException("Component quantity must be greater than zero.", nameof(quantity));

        Components.Add(BomComponent.Create(Id, componentProductId, quantity, unitOfMeasure));
    }

    public void RemoveComponent(Guid componentId)
    {
        var component = Components.FirstOrDefault(c => c.Id == componentId);
        if (component is null)
            throw new InvalidOperationException($"Component '{componentId}' not found on this BOM.");

        ((ICollection<BomComponent>)Components).Remove(component);
    }

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;
}

public class BomComponent
{
    public Guid Id { get; private set; }
    public Guid BomId { get; private set; }
    public Guid ComponentProductId { get; private set; }
    public decimal Quantity { get; private set; }
    public string UnitOfMeasure { get; private set; } = "pcs";
    public string? Notes { get; private set; }

    private BomComponent() { }

    public static BomComponent Create(
        Guid bomId,
        Guid componentProductId,
        decimal quantity,
        string uom = "pcs")
        => new()
        {
            Id = Guid.NewGuid(),
            BomId = bomId,
            ComponentProductId = componentProductId,
            Quantity = quantity,
            UnitOfMeasure = uom,
        };
}
