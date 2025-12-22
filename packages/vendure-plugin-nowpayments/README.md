# NOWPayments Plugin for Vendure

A cryptocurrency payment gateway plugin for Vendure that integrates with NOWPayments.io, enabling your store to accept payments in Bitcoin, Ethereum, and 100+ other cryptocurrencies.

## Features

- ✅ **Cryptocurrency Payments**: Accept payments in Bitcoin, Ethereum, Litecoin, and 100+ other cryptocurrencies
- ✅ **Dual Payment Modes**: Support for both direct payment links and invoices
- ✅ **Secure IPN Handling**: Instant Payment Notification webhook processing with HMAC signature verification
- ✅ **Multiple Payment Statuses**: Handle finished, partially_paid, confirming, confirmed, sending, and failed payments
- ✅ **Sandbox Mode**: Test your integration safely with sandbox endpoints
- ✅ **Configurable Options**: Customizable invoice prefixes, total calculations, and debug settings
- ✅ **Full IPN Storage**: Complete IPN response storage with outcome_currency tracking
- ✅ **TypeScript Support**: Full type definitions for excellent developer experience
- ✅ **GraphQL API**: Exposes `createNowPaymentsPaymentIntent` mutation for easy integration
- ✅ **Automatic Payment Processing**: Payments are automatically added to orders via webhook callbacks
- ✅ **Stripe-like Architecture**: Follows the same payment flow pattern as Vendure's Stripe plugin for consistency

## Architecture

This plugin follows the same architectural pattern as Vendure's official Stripe plugin:

1. **Payment Intent Creation**: Frontend calls `createNowPaymentsPaymentIntent` mutation to get a payment URL
2. **Customer Redirect**: Customer is redirected to NOWPayments to complete payment
3. **Webhook Processing**: NOWPayments sends IPN webhook to `/nowpayments/ipn`
4. **Automatic Payment Addition**: Controller uses `addPaymentToOrder` to automatically add settled payments to orders
5. **Payment Handler**: Payment method handler processes the payment and sets appropriate state

This architecture ensures consistency with other Vendure payment plugins and makes integration straightforward.

## Installation

```bash
npm install vendure-plugin-nowpayments
```

## Configuration

Add the plugin to your Vendure config:

```ts
// vendure-config.ts
import { VendureConfig } from '@vendure/core';
import { NowpaymentsPlugin } from 'vendure-plugin-nowpayments';

export const config: VendureConfig = {
  // ... other config
  plugins: [
    NowpaymentsPlugin.init({
      apiKey: process.env.NOWPAYMENTS_API_KEY || '',
      ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET || '',
      host: process.env.VENDURE_HOST || 'http://localhost:3000',
      sandbox: process.env.NOWPAYMENTS_SANDBOX === 'true',
      useInvoices: false, // Set to true to use invoices instead of direct payment links
      invoicePrefix: 'VC-', // Must not end with a digit
      simpleTotal: false, // Set to true for compatibility with certain addons
      allowZeroConfirm: true,
      formSubmissionMethod: true,
      debugEmail: process.env.NOWPAYMENTS_DEBUG_EMAIL || '',
      debugPostUrl: process.env.NOWPAYMENTS_DEBUG_POST_URL || '',
      is_fixed_rate: false, // Use fixed rate pricing
      is_fee_paid_by_user: false, // Fees paid by merchant
    }),
    // ... other plugins
  ],
};
```

## NOWPayments Setup

### 1. Create a NOWPayments Account

1. Sign up at [nowpayments.io](https://nowpayments.io)
2. Complete KYC verification
3. Get your API key from the dashboard

### 2. Configure IPN (Instant Payment Notification)

1. Set your IPN URL to: `https://yourdomain.com/nowpayments/ipn`
2. Get your IPN secret from the NOWPayments dashboard
3. Ensure your server is accessible via HTTPS

### 3. Environment Variables

```bash
# Required
NOWPAYMENTS_API_KEY=your-api-key-here
NOWPAYMENTS_IPN_SECRET=your-ipn-secret-here
VENDURE_HOST=https://yourdomain.com

# Optional
NOWPAYMENTS_SANDBOX=true  # Enable sandbox mode for testing
NOWPAYMENTS_DEBUG_EMAIL=debug@yourdomain.com
NOWPAYMENTS_DEBUG_POST_URL=https://yourdomain.com/debug
NOWPAYMENTS_INVOICE_PREFIX=VC-
```

## Usage

### Payment Flow

The plugin follows a similar pattern to Stripe's payment flow:

1. **Customer selects NOWPayments** during checkout
2. **Frontend calls `createNowPaymentsPaymentIntent` mutation** to get the payment URL
3. **Customer is redirected** to the NOWPayments payment page (direct link or invoice)
4. **Customer pays** with their chosen cryptocurrency
5. **NOWPayments sends IPN** webhook to your server
6. **Payment is automatically added** to the order via `addPaymentToOrder`
7. **Order status is updated** to `PaymentSettled` when payment is complete

### Using the GraphQL Mutation

The plugin exposes a `createNowPaymentsPaymentIntent` mutation that returns a payment URL:

```graphql
mutation {
  createNowPaymentsPaymentIntent
}
```

**Response:**
```json
{
  "data": {
    "createNowPaymentsPaymentIntent": "https://nowpayments.io/payment?data=..."
  }
}
```

**Example usage in your storefront:**

```typescript
// In your checkout component
const { data, loading, error } = useMutation(CREATE_NOWPAYMENTS_PAYMENT_INTENT);

const handlePayment = async () => {
  try {
    const result = await data();
    const paymentUrl = result.createNowPaymentsPaymentIntent;
    // Redirect customer to payment URL
    window.location.href = paymentUrl;
  } catch (err) {
    console.error('Failed to create payment intent:', err);
  }
};
```

**GraphQL Query:**

```graphql
mutation CreateNowPaymentsPaymentIntent {
  createNowPaymentsPaymentIntent
}
```

### Payment Statuses

The plugin handles various payment statuses from NOWPayments IPN callbacks:

| Status | Order State | Description |
|--------|-------------|-------------|
| `finished` | PaymentSettled | Payment completed successfully - payment is automatically added to order via `addPaymentToOrder` |
| `partially_paid` | PaymentAuthorized | Partial payment received (metadata updated, payment remains authorized) |
| `confirming` | PaymentAuthorized | Payment is being confirmed on blockchain (metadata updated) |
| `confirmed` | PaymentAuthorized | Payment confirmed on blockchain (metadata updated) |
| `sending` | PaymentAuthorized | Payment is being sent (metadata updated) |
| `waiting` | PaymentAuthorized | Payment is waiting for user action (metadata updated) |
| `expired` | PaymentDeclined | Payment has expired - payment is cancelled |
| `failed` | PaymentDeclined | Payment failed - payment is cancelled |

**Note:** Only `finished` status payments are automatically added to orders. Other statuses update payment metadata but don't settle the payment.

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiKey` | string | ✅ | - | Your NOWPayments.io API key |
| `ipnSecret` | string | ✅ | - | Your NOWPayments.io IPN secret |
| `host` | string | ❌ | 'http://localhost:3000' | Your Vendure server host |
| `sandbox` | boolean | ❌ | false | Enable sandbox mode for testing |
| `useInvoices` | boolean | ❌ | false | Use invoices instead of direct payment links |
| `invoicePrefix` | string | ❌ | 'VC-' | Prefix for invoice numbers (must not end with digit) |
| `simpleTotal` | boolean | ❌ | false | Use simple total calculation |
| `allowZeroConfirm` | boolean | ❌ | true | Allow zero confirmation payments |
| `formSubmissionMethod` | boolean | ❌ | true | Use form submission method |
| `debugEmail` | string | ❌ | - | Email for debug notifications |
| `debugPostUrl` | string | ❌ | - | URL for debug POST notifications |
| `is_fixed_rate` | boolean | ❌ | false | Use fixed rate pricing for cryptocurrency conversions |
| `is_fee_paid_by_user` | boolean | ❌ | false | Whether transaction fees are paid by the user |

### Supported Cryptocurrencies

- Bitcoin (BTC)
- Ethereum (ETH)
- Litecoin (LTC)
- Bitcoin Cash (BCH)
- Ripple (XRP)
- Cardano (ADA)
- Polkadot (DOT)
- Chainlink (LINK)
- And 100+ more...

## API Extensions

The plugin extends the Vendure GraphQL API with the following:

### GraphQL Mutations

- `createNowPaymentsPaymentIntent: String!` - Creates a payment intent and returns the payment URL (invoice URL if `useInvoices` is enabled, otherwise payment URL)
  - Requires: Owner permission (customer must be logged in)
  - Returns: Payment URL string that the customer should be redirected to

### Payment Method Handler

- `nowpayments` - The payment method handler for NOWPayments

### IPN Webhook Endpoint

- `POST /nowpayments/ipn` - Webhook endpoint for NOWPayments IPN callbacks
  - Headers: `x-nowpayments-sig` (HMAC signature for verification)
  - Body: NOWPayments IPN payload (JSON)
  - Automatically processes payments and adds them to orders via `addPaymentToOrder`

### Payment Flow URLs

The plugin automatically generates the following URLs for payment flows:

- **Success URL**: `{host}/checkout/confirmation/{orderCode}` - Redirected to after successful payment
- **Cancel URL**: `{host}/checkout/cancel/{orderCode}` - Redirected to if payment is cancelled
- **IPN URL**: `{host}/nowpayments/ipn` - Webhook endpoint for payment notifications

**Note**: Replace `{host}` with your actual Vendure server URL (e.g., `https://yourdomain.com`).

## Security Features

- **HMAC Signature Verification**: All IPN requests are verified using SHA512 HMAC before processing
- **Order Validation**: Payment amounts and currencies are validated against order totals
- **Secure API Communication**: All API calls use HTTPS
- **Transaction Safety**: Webhook processing uses database transactions to ensure data consistency
- **Error Logging**: Comprehensive error logging for debugging
- **Owner-Only Mutations**: The `createNowPaymentsPaymentIntent` mutation requires owner permission (customer must be authenticated)

## Development

### Building the Plugin

```bash
npm run build
```

### Running Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## Troubleshooting

### Common Issues

1. **IPN not received:**
    - Check your server is accessible via HTTPS
    - Verify IPN URL is correct in NOWPayments dashboard
    - Check server logs for errors

2. **Invalid signature errors:**
    - Verify IPN secret is correct
    - Ensure HMAC calculation is working properly
    - Check for encoding issues

3. **Payment not settling:**
    - Check payment status in NOWPayments dashboard (must be `finished`)
    - Verify order ID format matches expected pattern (includes invoice prefix if used)
    - Review server logs for processing errors
    - Ensure IPN webhook is being received and processed
    - Check that payment status is `finished` (only finished payments are added to orders)

4. **Sandbox mode issues:**
    - Ensure `NOWPAYMENTS_SANDBOX=true` is set
    - Use sandbox API keys for testing
    - Check sandbox endpoints are being used

### Debug Mode

Enable debug mode by setting the environment variable:

```bash
NOWPAYMENTS_DEBUG=true
```

This will log detailed information about payment processing and IPN handling.

## Support

For support with this plugin:

1. Check the [Vendure documentation](https://www.vendure.io/docs)
2. Review the [NOWPayments documentation](https://nowpayments.io/docs)
3. Check the server logs for error details
4. Contact support with specific error messages and logs

## License

This plugin is licensed under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a list of changes between versions. 

Add Release commit

## OK