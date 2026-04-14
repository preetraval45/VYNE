using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stripe;
using Stripe.Checkout;

namespace Vyne.Core.Controllers;

[ApiController]
[Route("billing")]
[Authorize]
public class BillingController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<BillingController> _logger;

    public BillingController(IConfiguration config, ILogger<BillingController> logger)
    {
        _config = config;
        _logger = logger;
    }

    // ── POST /billing/checkout ────────────────────────────────────────────────
    /// <summary>
    /// Create a Stripe Checkout session for upgrading to a paid plan.
    /// In demo mode (no STRIPE_SECRET_KEY set) returns a mock URL.
    /// </summary>
    [HttpPost("checkout")]
    public async Task<IActionResult> CreateCheckoutSession(
        [FromBody] CheckoutRequest request,
        CancellationToken ct)
    {
        var stripeKey = _config["Stripe:SecretKey"];

        if (string.IsNullOrEmpty(stripeKey))
        {
            // Demo / dev mode — return a placeholder so the frontend still works
            return Ok(new
            {
                url = $"{request.ReturnUrl}/settings?billing=demo",
                demo = true,
            });
        }

        var priceId = request.Tier?.ToLowerInvariant() switch
        {
            "starter" => _config["Stripe:StarterPriceId"],
            "business" => _config["Stripe:BusinessPriceId"],
            _ => null,
        };

        if (string.IsNullOrEmpty(priceId))
        {
            return BadRequest(new { error = "Unknown plan tier" });
        }

        StripeConfiguration.ApiKey = stripeKey;

        var options = new SessionCreateOptions
        {
            Mode = "subscription",
            LineItems =
            [
                new SessionLineItemOptions { Price = priceId, Quantity = 1 },
            ],
            SuccessUrl = $"{request.ReturnUrl}/settings?billing=success&session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{request.ReturnUrl}/settings?billing=cancelled",
            AllowPromotionCodes = true,
        };

        try
        {
            var service = new SessionService();
            var session = await service.CreateAsync(options, cancellationToken: ct);
            return Ok(new { url = session.Url });
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Stripe checkout session creation failed");
            return StatusCode(502, new { error = "Payment provider error", detail = ex.Message });
        }
    }

    // ── POST /billing/portal ──────────────────────────────────────────────────
    /// <summary>
    /// Create a Stripe Billing Portal session so customers can manage their subscription.
    /// </summary>
    [HttpPost("portal")]
    public async Task<IActionResult> CreatePortalSession(
        [FromBody] PortalRequest request,
        CancellationToken ct)
    {
        var stripeKey = _config["Stripe:SecretKey"];

        if (string.IsNullOrEmpty(stripeKey))
        {
            return Ok(new
            {
                url = $"{request.ReturnUrl}/settings?billing=demo-portal",
                demo = true,
            });
        }

        StripeConfiguration.ApiKey = stripeKey;

        // customerId should be stored in the org record; fall back to the org id
        var customerId = request.CustomerId;
        if (string.IsNullOrEmpty(customerId))
        {
            return BadRequest(new { error = "Stripe customer ID not found for this organisation" });
        }

        try
        {
            var options = new Stripe.BillingPortal.SessionCreateOptions
            {
                Customer = customerId,
                ReturnUrl = $"{request.ReturnUrl}/settings",
            };
            var service = new Stripe.BillingPortal.SessionService();
            var session = await service.CreateAsync(options, cancellationToken: ct);
            return Ok(new { url = session.Url });
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Stripe portal session creation failed");
            return StatusCode(502, new { error = "Payment provider error", detail = ex.Message });
        }
    }

    // ── POST /billing/webhook ─────────────────────────────────────────────────
    /// <summary>
    /// Stripe webhook — processes subscription events to keep org plan state in sync.
    /// </summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook()
    {
        var stripeKey = _config["Stripe:SecretKey"];
        var webhookSecret = _config["Stripe:WebhookSecret"];

        if (string.IsNullOrEmpty(stripeKey) || string.IsNullOrEmpty(webhookSecret))
        {
            return Ok(); // demo mode — swallow gracefully
        }

        StripeConfiguration.ApiKey = stripeKey;

        string json;
        using (var reader = new StreamReader(HttpContext.Request.Body))
        {
            json = await reader.ReadToEndAsync();
        }

        try
        {
            var stripeSignature = Request.Headers["Stripe-Signature"].FirstOrDefault() ?? "";
            var stripeEvent = EventUtility.ConstructEvent(json, stripeSignature, webhookSecret);

            switch (stripeEvent.Type)
            {
                case EventTypes.CustomerSubscriptionCreated:
                case EventTypes.CustomerSubscriptionUpdated:
                    var sub = (Subscription)stripeEvent.Data.Object;
                    _logger.LogInformation(
                        "Subscription {Status} for customer {CustomerId}",
                        sub.Status,
                        sub.CustomerId);
                    // TODO: update org.Plan in database based on sub.Items.Data[0].Price.Id
                    break;

                case EventTypes.CustomerSubscriptionDeleted:
                    var deleted = (Subscription)stripeEvent.Data.Object;
                    _logger.LogInformation(
                        "Subscription cancelled for customer {CustomerId}",
                        deleted.CustomerId);
                    // TODO: downgrade org to free plan
                    break;
            }

            return Ok();
        }
        catch (StripeException ex)
        {
            _logger.LogWarning(ex, "Invalid Stripe webhook signature");
            return BadRequest(new { error = "Invalid webhook signature" });
        }
    }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record CheckoutRequest(string Tier, string ReturnUrl);
public record PortalRequest(string? CustomerId, string ReturnUrl);
