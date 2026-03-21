namespace Vyne.ERP.Domain.Manufacturing;

public enum WorkOrderStatus { Draft, Confirmed, InProgress, Done, Cancelled }

public class WorkOrder
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string WorkOrderNumber { get; private set; } = string.Empty;
    public Guid ProductId { get; private set; }
    public Guid BomId { get; private set; }
    public decimal QuantityToProduce { get; private set; }
    public decimal QuantityProduced { get; private set; }
    public WorkOrderStatus Status { get; private set; } = WorkOrderStatus.Draft;
    public DateTime? ScheduledStart { get; private set; }
    public DateTime? ScheduledEnd { get; private set; }
    public DateTime? ActualStart { get; private set; }
    public DateTime? ActualEnd { get; private set; }
    public string? Notes { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private WorkOrder() { }

    public static WorkOrder Create(
        Guid orgId,
        string number,
        Guid productId,
        Guid bomId,
        decimal qty,
        DateTime? start = null,
        DateTime? end = null,
        string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(number))
            throw new ArgumentException("Work order number is required.", nameof(number));
        if (qty <= 0)
            throw new ArgumentException("Quantity to produce must be greater than zero.", nameof(qty));

        return new()
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            WorkOrderNumber = number.Trim(),
            ProductId = productId,
            BomId = bomId,
            QuantityToProduce = qty,
            ScheduledStart = start,
            ScheduledEnd = end,
            Notes = notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
    }

    public void Confirm()
    {
        if (Status != WorkOrderStatus.Draft)
            throw new InvalidOperationException($"Only Draft work orders can be confirmed. Current status: {Status}.");

        Status = WorkOrderStatus.Confirmed;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Start()
    {
        if (Status is not (WorkOrderStatus.Draft or WorkOrderStatus.Confirmed))
            throw new InvalidOperationException($"Cannot start a work order in '{Status}' status.");

        Status = WorkOrderStatus.InProgress;
        ActualStart = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Complete(decimal qtyProduced)
    {
        if (Status != WorkOrderStatus.InProgress)
            throw new InvalidOperationException($"Only InProgress work orders can be completed. Current status: {Status}.");
        if (qtyProduced <= 0)
            throw new ArgumentException("Quantity produced must be greater than zero.", nameof(qtyProduced));

        Status = WorkOrderStatus.Done;
        QuantityProduced = qtyProduced;
        ActualEnd = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        if (Status == WorkOrderStatus.Done)
            throw new InvalidOperationException("Cannot cancel a completed work order.");

        Status = WorkOrderStatus.Cancelled;
        UpdatedAt = DateTime.UtcNow;
    }
}
