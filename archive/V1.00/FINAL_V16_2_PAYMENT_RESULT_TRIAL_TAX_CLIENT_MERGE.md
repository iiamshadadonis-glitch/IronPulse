# V16.2 — Payment Result, Trial Tax & CRM Identity Fix

This update is intentionally additive to V16.1.

- Razorpay Standard Checkout immediately hands a successful browser response to the dedicated Payment Successful page. The signature is verified from that page and the payment-result endpoint can safely reconcile a captured Razorpay payment when the payment reference is linked to the local subscription invoice.
- Payment pages use new V16.2 asset names and no-store page caching to prevent an older payment script from remaining in the browser after deployment.
- Trial/upfront authorisation payments remain Authenticated until a real recurring charge is received. Existing V16.1 trial payments that included tax are recognised as authentication instead of being promoted to Active.
- A Razorpay `subscription.activated` lifecycle notification no longer promotes a paid-trial customer locally when only the trial/authentication receipt exists; the local subscriber becomes Active after an actual recurring charge is captured.
- Customers → Subscribers repairs the display on refresh: an order with only an upfront/trial receipt remains Authenticated; a later recurring receipt allows Active.
- Checkout now feeds name/phone/email/device identity into the existing lead merge/candidate pipeline. Matching priority is unchanged: device, phone, email, Instagram. Conflicting values become Edit Client dropdown candidates rather than overwriting the current confirmed value.
- True paid trial amounts are tax-free today. GST/service/other enabled charges remain attached to the recurring subscription amount after the trial. Normal subscriptions, setup charges that are not trials, one-time payments and other chargeable payments keep the existing tax rules.
- Admin custom subscriptions treat an upfront amount as a trial only when a future Subscription Start Date is supplied.

No manual database migration is required.
- Historical checkout/subscriber identity recovery now feeds already-linked older records back through the same candidate rules when Client Details is opened. This lets legacy checkout names, phones, and emails appear as pending dropdown candidates without creating duplicate leads or overwriting confirmed current values.

