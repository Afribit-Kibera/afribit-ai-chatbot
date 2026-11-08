# Huawei/Safaricom outage-method preparation - 29 October 2026

**Later update:** user reports modelHG8145V6, then explicitly defers the household outage test.
[Final checkpoint and graceful node closure](2026-10-29-outage-deferred-session-close.md) supersede
pending model/active-session statements below. No model-specific WAN instruction was applied.

**Router vendor/ISP/direct fibre confirmed by user; exact model and suitable interruption control
unverified. No outage performed.** Edmund supplied `https://192.168.100.1/`, identified Huawei,
Safaricom and a fibre cable directly into the unit. This resolves the earlier fibre-or-SIM ambiguity.
It does not identify the model, firmware, account permissions or a safe internet-only control.

| Trial | Observation |
|---|---|
| [618d332a](../../../output/trials/618d332a-ac0c-4848-9c1b-f232a094f797.json) | Read-only native root requests: HTTPS trust-chain verification failed `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; uncredentialed HTTP root200, no model candidate. TLS verification retained, no raw body stored, login or settings change |
| [99403ab5](../../../output/trials/99403ab5-ee86-41fc-950f-885978e3de6e.json) | Read-only fresh Playwright browser inspection completed, but HTTP navigation resulted in a certificate interstitial `net::ERR_CERT_AUTHORITY_INVALID`, not a rendered router login page. No bypass/login; browser closed. Model not identified |

[Native observations](../../../output/router-identification/618d332a-ac0c-4848-9c1b-f232a094f797/summary.json),
[browser classification](../../../output/playwright/99403ab5-ee86-41fc-950f-885978e3de6e/classification.json).
Browser exit0 indicates observation commands ran, not successful access to the router UI. The original
summary's `publicLoginPageOnly` denotes intended read-only scope; the classification clarifies actual
certificate-blocked rendering. Original artifacts remain preserved. No credentials, authenticated page,
WAN profile or private router configuration was inspected, changed or exported.

Consulted primary Huawei and Safaricom documentation. [Huawei's device-management guidance](https://consumer.huawei.com/en/support/content/en-us15806342/)
describes internet-access controls for listed consumer Wi-Fi products, not proof that this unidentified
fibre ONT has that menu. [Safaricom's FAQ](https://internet.safaricom.co.ke/faqs/expressCheckoutWeb)
covers multiple services/device types and does not identify this customer's hardware. No model-specific
instruction was inferred from either source. No default-password lookup, login attempt, reset,
bridge-mode change, optical-fibre removal, router restart or network/firewall change.

Next required fact is the printed model code (the text after Model on the label), without passwords,
Wi-Fi keys or a full sticker export. The user can read that physical label; the agent cannot. Then
check documentation for that exact unit and ISP firmware/permissions before selecting an internet-only
pause that keeps the Wi-Fi/LAN powered. No permission to alter an unreviewed router setting is inferred.

Current member node `54b40282` remains bounded to its existing11:35 Nairobi29 October expiry; this
planning work does not extend it. If the node expires first, resume with a new trial/account sheet.
Do not mistake server expiry for internet-outage behavior. Previous phone login, local answer and
cross-/same-community display-separation observations remain valid for their recorded scope.
Physical backhaul loss, cellular-failover settings and request/recovery during loss remain pending.
No model generation/training/new paid compute or acceptance result. No message to Safaricom or others.
