using System.Text.RegularExpressions;

namespace Vyne.ERP.Domain.Settings;

public enum CustomFieldType { Text, Number, Date, Boolean, Select, MultiSelect, Url, Email }
public enum CustomFieldEntity { Product, Order, Customer, Supplier, WorkOrder }

public class CustomField
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public CustomFieldEntity Entity { get; private set; }
    public string Name { get; private set; } = string.Empty;          // e.g. "Weight (kg)"
    public string ApiKey { get; private set; } = string.Empty;         // e.g. "weight_kg"
    public CustomFieldType Type { get; private set; }
    public bool IsRequired { get; private set; }
    public string? DefaultValue { get; private set; }
    public string[]? Options { get; private set; }                     // for Select/MultiSelect
    public int DisplayOrder { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; }

    private CustomField() { }

    public static CustomField Create(
        Guid orgId,
        CustomFieldEntity entity,
        string name,
        CustomFieldType type,
        bool isRequired = false,
        string? defaultValue = null,
        string[]? options = null,
        int displayOrder = 0)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Custom field name is required.", nameof(name));

        if (type is CustomFieldType.Select or CustomFieldType.MultiSelect &&
            (options == null || options.Length == 0))
            throw new ArgumentException("Options are required for Select/MultiSelect fields.", nameof(options));

        var apiKey = GenerateApiKey(name);

        return new CustomField
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            Entity = entity,
            Name = name.Trim(),
            ApiKey = apiKey,
            Type = type,
            IsRequired = isRequired,
            DefaultValue = defaultValue,
            Options = options,
            DisplayOrder = displayOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
    }

    private static string GenerateApiKey(string name)
    {
        var key = name.ToLower()
            .Replace(" ", "_")
            .Replace("(", "")
            .Replace(")", "")
            .Replace("/", "_")
            .Replace("-", "_")
            .Replace(".", "_");

        // Remove any remaining non-alphanumeric/underscore characters
        key = Regex.Replace(key, @"[^a-z0-9_]", "");
        // Collapse multiple underscores
        key = Regex.Replace(key, @"_+", "_").Trim('_');

        return key;
    }

    public void Update(string? name = null, bool? isRequired = null,
        string? defaultValue = null, string[]? options = null, int? displayOrder = null)
    {
        if (name != null)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name cannot be empty.", nameof(name));
            Name = name.Trim();
            ApiKey = GenerateApiKey(name);
        }
        if (isRequired.HasValue) IsRequired = isRequired.Value;
        if (defaultValue != null) DefaultValue = defaultValue;
        if (options != null) Options = options;
        if (displayOrder.HasValue) DisplayOrder = displayOrder.Value;
    }

    public void Deactivate() => IsActive = false;
}

// Stores actual values for custom fields on records
public class CustomFieldValue
{
    public Guid Id { get; private set; }
    public Guid FieldId { get; private set; }
    public Guid RecordId { get; private set; }    // the entity's ID
    public string? Value { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    // Navigation
    public CustomField? Field { get; private set; }

    private CustomFieldValue() { }

    public static CustomFieldValue Create(Guid fieldId, Guid recordId, string? value)
        => new()
        {
            Id = Guid.NewGuid(),
            FieldId = fieldId,
            RecordId = recordId,
            Value = value,
            UpdatedAt = DateTime.UtcNow,
        };

    public void SetValue(string? value)
    {
        Value = value;
        UpdatedAt = DateTime.UtcNow;
    }
}
