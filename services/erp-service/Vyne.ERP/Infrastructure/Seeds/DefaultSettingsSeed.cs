using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Domain.Settings;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Infrastructure.Seeds;

/// <summary>
/// Seeds default settings when a new organisation is provisioned.
/// All operations are idempotent — already-existing rows are skipped.
/// </summary>
public static class DefaultSettingsSeed
{
    public static async Task SeedAsync(ERPDbContext db, Guid orgId, CancellationToken ct = default)
    {
        await SeedOrgSettingsAsync(db, orgId, ct);
        await SeedTaxRatesAsync(db, orgId, ct);
        await SeedUnitsOfMeasureAsync(db, orgId, ct);
        await SeedProductCategoriesAsync(db, orgId, ct);
        await db.SaveChangesAsync(ct);
    }

    // ── OrgSettings ────────────────────────────────────────────────────────────

    private static async Task SeedOrgSettingsAsync(ERPDbContext db, Guid orgId, CancellationToken ct)
    {
        var exists = await db.OrgSettings
            .IgnoreQueryFilters()
            .AnyAsync(s => s.OrgId == orgId, ct);

        if (!exists)
            db.OrgSettings.Add(OrgSettings.CreateDefault(orgId, "My Company"));
    }

    // ── Tax Rates ──────────────────────────────────────────────────────────────

    private static async Task SeedTaxRatesAsync(ERPDbContext db, Guid orgId, CancellationToken ct)
    {
        var existingNames = await db.TaxRates
            .IgnoreQueryFilters()
            .Where(r => r.OrgId == orgId)
            .Select(r => r.Name)
            .ToHashSetAsync(ct);

        var defaults = new[]
        {
            ("Standard Rate", 10m, true),
            ("Zero-Rated",    0m,  false),
        };

        foreach (var (name, rate, isDefault) in defaults)
        {
            if (!existingNames.Contains(name))
                db.TaxRates.Add(TaxRate.Create(orgId, name, rate, isDefault));
        }
    }

    // ── Units of Measure ───────────────────────────────────────────────────────

    private static async Task SeedUnitsOfMeasureAsync(ERPDbContext db, Guid orgId, CancellationToken ct)
    {
        var existingSymbols = await db.UnitsOfMeasure
            .IgnoreQueryFilters()
            .Where(u => u.OrgId == orgId)
            .Select(u => u.Symbol)
            .ToHashSetAsync(ct);

        // category, name, symbol, isBase, conversionFactor (relative to base in category)
        var defaults = new (string category, string name, string symbol, bool isBase, decimal factor)[]
        {
            // Quantity
            ("Quantity", "Piece",    "pcs",  true,  1m),
            ("Quantity", "Box",      "box",  false, 1m),  // user defines qty per box
            ("Quantity", "Pack",     "pack", false, 1m),  // user defines qty per pack
            ("Quantity", "Dozen",    "doz",  false, 12m),

            // Weight
            ("Weight", "Kilogram",   "kg",   true,  1m),
            ("Weight", "Gram",       "g",    false, 0.001m),
            ("Weight", "Milligram",  "mg",   false, 0.000001m),
            ("Weight", "Pound",      "lb",   false, 0.453592m),
            ("Weight", "Ounce",      "oz",   false, 0.0283495m),
            ("Weight", "Metric Ton", "t",    false, 1000m),

            // Volume
            ("Volume", "Litre",      "L",    true,  1m),
            ("Volume", "Millilitre", "mL",   false, 0.001m),
            ("Volume", "Cubic Metre","m³",   false, 1000m),
            ("Volume", "Gallon",     "gal",  false, 3.78541m),
            ("Volume", "Fluid Ounce","fl oz",false, 0.0295735m),

            // Length
            ("Length", "Metre",      "m",    true,  1m),
            ("Length", "Centimetre", "cm",   false, 0.01m),
            ("Length", "Millimetre", "mm",   false, 0.001m),
            ("Length", "Kilometre",  "km",   false, 1000m),
            ("Length", "Inch",       "in",   false, 0.0254m),
            ("Length", "Foot",       "ft",   false, 0.3048m),
            ("Length", "Yard",       "yd",   false, 0.9144m),

            // Time
            ("Time", "Hour",    "hr",  true,  1m),
            ("Time", "Minute",  "min", false, 1m / 60m),
            ("Time", "Day",     "day", false, 24m),
        };

        foreach (var (category, name, symbol, isBase, factor) in defaults)
        {
            if (!existingSymbols.Contains(symbol))
                db.UnitsOfMeasure.Add(UnitOfMeasure.Create(orgId, name, symbol, category, isBase, factor));
        }
    }

    // ── Product Categories ─────────────────────────────────────────────────────

    private static async Task SeedProductCategoriesAsync(ERPDbContext db, Guid orgId, CancellationToken ct)
    {
        var existingNames = await db.ProductCategories
            .IgnoreQueryFilters()
            .Where(c => c.OrgId == orgId && c.ParentId == null)
            .Select(c => c.Name)
            .ToHashSetAsync(ct);

        // (name, icon, description, children[])
        var roots = new[]
        {
            ("Electronics",        "💻", "Electronic devices, components, and accessories.",
             new[] { "Computers & Laptops", "Mobile & Tablets", "Audio & Video", "Networking", "Components" }),

            ("Apparel",            "👕", "Clothing, footwear, and fashion accessories.",
             new[] { "Men's Clothing", "Women's Clothing", "Children's Clothing", "Footwear", "Accessories" }),

            ("Food & Beverage",    "🍎", "Food products, beverages, and consumables.",
             new[] { "Fresh Produce", "Packaged Foods", "Beverages", "Dairy & Eggs", "Frozen Foods" }),

            ("Raw Materials",      "🏭", "Industrial and manufacturing raw materials.",
             new[] { "Metals", "Plastics", "Textiles", "Wood & Timber", "Chemicals" }),

            ("Services",           "⚙️", "Service offerings and intangible products.",
             new[] { "Consulting", "Maintenance", "Installation", "Training", "Subscription" }),

            ("Office Supplies",    "📎", "Stationery, office equipment, and supplies.",
             new[] { "Stationery", "Furniture", "Printing", "Storage" }),

            ("Health & Beauty",    "💊", "Healthcare products, cosmetics, and personal care.",
             new[] { "Pharmaceuticals", "Cosmetics", "Personal Care", "Vitamins & Supplements" }),

            ("Home & Garden",      "🏠", "Household items, furniture, and garden products.",
             new[] { "Furniture", "Kitchen & Dining", "Garden & Outdoor", "Decor" }),
        };

        foreach (var (name, icon, description, children) in roots)
        {
            if (existingNames.Contains(name))
                continue;

            var root = ProductCategory.Create(orgId, name, parentId: null, description: description, icon: icon);
            db.ProductCategories.Add(root);

            // Add a placeholder so children can reference it (EF will resolve the key)
            foreach (var child in children)
            {
                var childCat = ProductCategory.Create(orgId, child, parentId: root.Id);
                db.ProductCategories.Add(childCat);
            }
        }
    }
}
