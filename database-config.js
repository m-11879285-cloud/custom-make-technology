/*
 * Set this to your backend endpoint that creates an order and a payment session.
 * Example: orderApiUrl: "https://your-domain.com/api/orders"
 *
 * The endpoint receives JSON containing customer, items, total, currency, and
 * paymentMethod, and should return JSON such as { "checkoutUrl": "https://..." }.
 * The backend must validate prices and payment methods itself, save the order,
 * and create the provider checkout URL (Visa/card, TNG eWallet, or FPX).
 *
 * Do not put database passwords, payment secret keys, or card details here.
 * This file runs in the browser; connect to the database through your backend.
 */
window.CHECKOUT_CONFIG = {
  orderApiUrl: "https://script.google.com/macros/s/AKfycbwTkEHI1ndEL7RFCB4-w88tLS_A1w8pI6AdBoT_rwWMGWhCn4hcs6PKesGpXK1unsWxTg/exec"
};