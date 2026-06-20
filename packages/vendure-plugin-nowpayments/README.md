# NOWPayments Plugin for Vendure

A cryptocurrency payment gateway plugin for Vendure that integrates with NOWPayments.io, enabling your store to accept payments in Bitcoin, Ethereum, and 100+ other cryptocurrencies.

## Features

- **Cryptocurrency Payments**: Accept payments in Bitcoin, Ethereum, Litecoin, and 100+ other cryptocurrencies
- **Dual Payment Modes**: Support for both direct payment links and invoices
- **Secure IPN Handling**: Instant Payment Notification webhook processing with HMAC signature verification
- **Sandbox Mode**: Test your integration safely with sandbox endpoints
- **Configurable Redirect URLs**: Customize success and cancel redirect paths via arrow functions
- **Configurable Options**: Customizable invoice prefixes, total calculations, and debug settings
- **TypeScript Support**: Full type definitions including `RedirectUrlFn` and `PluginInitOptions`
- **GraphQL API**: Exposes `createNowPaymentsPaymentIntent` mutation for easy integration
- **Automatic Payment Processing**: Completed payments are added to orders via webhook callbacks inside a database transaction
- **Multi-Channel Support**: IPN processing resolves the order's channel context before updating order state

## Architecture

This plugin follows a similar pattern to Vendure's official Stripe plugin:

1. **Payment Intent Creation**: Frontend calls `createNowPaymentsPaymentIntent` mutation to get a payment URL
2. **Customer Redirect**: Customer is redirected to NOWPayments to complete payment
3. **Webhook Processing**: NOWPayments sends IPN webhook to `POST /nowpayments/ipn`
4. **Automatic Payment Addition**: Controller transitions the order to `ArrangingPayment` (if needed) and calls `addPaymentToOrder` inside a transaction
5. **Payment Handler**: Payment method handler creates a settled payment when IPN metadata includes a `paymentId`

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

      // Base URL used for IPN callbacks and as the `host` argument in redirect URL functions
      host: process.env.VENDURE_HOST || 'http://localhost:3000',

      // Optional: customize where NOWPayments redirects the customer after payment
      getSuccessUrl: (order, host) => `${host}/order/confirmation/${order.code}`,
      getCancelUrl: (order, host) => `${host}/checkout`,

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

### Custom Redirect URLs

You can customize the success and cancel URLs NOWPayments sends the customer to after payment using optional arrow functions:

```ts
import type { RedirectUrlFn } from 'vendure-plugin-nowpayments';

const getSuccessUrl: RedirectUrlFn = (order, host) =>
  `${host}/en/account/orders/${order.code}`;

const getCancelUrl: RedirectUrlFn = (order, host) =>
  `${host}/en/checkout`;

NowpaymentsPlugin.init({
  // ...
  host: process.env.STOREFRONT_URL || 'http://localhost:3000',
  getSuccessUrl,
  getCancelUrl,
});
```

Each function receives:

- `order` — the Vendure `Order` entity (includes `code`, `id`, etc.)
- `host` — the configured `host` option

If omitted, the defaults are:

- **Success**: `{host}/checkout/confirmation/{orderCode}`
- **Cancel**: `{host}/checkout/cancel/{orderCode}`

## NOWPayments Setup

### 1. Create a NOWPayments Account

1. Sign up at [nowpayments.io](https://nowpayments.io)
2. Complete KYC verification
3. Get your API key from the dashboard

### 2. Configure IPN (Instant Payment Notification)

1. Set your IPN URL to: `https://yourdomain.com/nowpayments/ipn`
2. Get your IPN secret from the NOWPayments dashboard
3. Ensure your server is accessible via HTTPS

The IPN URL is derived from the `host` option: `{host}/nowpayments/ipn`.

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

1. **Customer selects NOWPayments** during checkout
2. **Frontend calls `createNowPaymentsPaymentIntent` mutation** to get the payment URL
3. **Customer is redirected** to the NOWPayments payment page (direct link or invoice)
4. **Customer pays** with their chosen cryptocurrency
5. **NOWPayments sends IPN** webhook to your server
6. **Payment is automatically added** to the order via `addPaymentToOrder` (only when status is `finished`)
7. **Order is settled** by the payment handler when the payment is created

### Using the GraphQL Mutation

The plugin exposes a `createNowPaymentsPaymentIntent` mutation that returns a payment URL:

```graphql
mutation CreateNowPaymentsPaymentIntent {
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
const CREATE_NOWPAYMENTS_PAYMENT_INTENT = gql`
  mutation CreateNowPaymentsPaymentIntent {
    createNowPaymentsPaymentIntent
  }
`;

const [createPaymentIntent] = useMutation(CREATE_NOWPAYMENTS_PAYMENT_INTENT);

const handlePayment = async () => {
  const { data } = await createPaymentIntent();
  const paymentUrl = data.createNowPaymentsPaymentIntent;
  window.location.href = paymentUrl;
};
```

The mutation requires the customer to be authenticated (`Permission.Owner`) and uses the active session order. The plugin loads the order's customer and line items automatically before creating the payment URL.

### Payment Statuses

The IPN webhook endpoint handles NOWPayments status updates as follows:

| Status | Action |
|--------|--------|
| `finished` | Order is transitioned to `ArrangingPayment` (if needed), payment is added via `addPaymentToOrder`, and the payment handler settles it |
| `failed`, `expired` | Logged and acknowledged; no payment is added |
| All other statuses (`confirming`, `confirmed`, `partially_paid`, `waiting`, etc.) | Logged and acknowledged; no payment is added |

Only `finished` payments trigger order updates. Other statuses are received so NOWPayments does not retry unnecessarily, but they do not modify the order.

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiKey` | string | ✅ | - | Your NOWPayments.io API key |
| `ipnSecret` | string | ✅ | - | Your NOWPayments.io IPN secret |
| `host` | string | ❌ | `http://localhost:3000` | Base URL for IPN callbacks and redirect URL functions |
| `getSuccessUrl` | `RedirectUrlFn` | ❌ | `{host}/checkout/confirmation/{orderCode}` | Function that returns the success redirect URL |
| `getCancelUrl` | `RedirectUrlFn` | ❌ | `{host}/checkout/cancel/{orderCode}` | Function that returns the cancel redirect URL |
| `sandbox` | boolean | ❌ | `false` | Enable sandbox mode for testing |
| `useInvoices` | boolean | ❌ | `false` | Use invoices instead of direct payment links |
| `invoicePrefix` | string | ❌ | `VC-` | Prefix for invoice numbers (must not end with digit) |
| `simpleTotal` | boolean | ❌ | `false` | Use simple total calculation (excludes tax from total) |
| `allowZeroConfirm` | boolean | ❌ | `true` | Allow zero confirmation payments |
| `formSubmissionMethod` | boolean | ❌ | `true` | Use form submission method |
| `title` | string | ❌ | - | Payment method title |
| `description` | string | ❌ | - | Payment method description |
| `instructions` | string | ❌ | - | Payment method instructions |
| `debugEmail` | string | ❌ | - | Email for debug notifications |
| `debugPostUrl` | string | ❌ | - | URL for debug POST notifications |
| `is_fixed_rate` | boolean | ❌ | `false` | Use fixed rate pricing for cryptocurrency conversions |
| `is_fee_paid_by_user` | boolean | ❌ | `false` | Whether transaction fees are paid by the user |

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

- `createNowPaymentsPaymentIntent: String!` — Creates a payment intent and returns the payment URL (invoice URL if `useInvoices` is enabled, otherwise payment URL)
  - Requires: Owner permission (customer must be logged in)
  - Returns: Payment URL string that the customer should be redirected to

### Payment Method Handler

- `nowpayments` — The payment method handler for NOWPayments

### IPN Webhook Endpoint

- `POST /nowpayments/ipn` — Webhook endpoint for NOWPayments IPN callbacks
  - Headers: `x-nowpayments-sig` (HMAC signature for verification)
  - Body: NOWPayments IPN payload (JSON)
  - Verifies the HMAC signature before processing
  - Resolves the order's channel and runs all order mutations inside a database transaction
  - Adds settled payments to orders when status is `finished`

### Payment Flow URLs

| URL | Source | Default |
|-----|--------|---------|
| Success URL | `getSuccessUrl(order, host)` | `{host}/checkout/confirmation/{orderCode}` |
| Cancel URL | `getCancelUrl(order, host)` | `{host}/checkout/cancel/{orderCode}` |
| IPN URL | `{host}/nowpayments/ipn` | Fixed path on your Vendure server |

**Note:** For redirect URLs, `host` is typically your storefront URL (e.g. `https://shop.example.com`). For IPN, `host` must be your publicly accessible Vendure server URL.

## Security Features

- **HMAC Signature Verification**: All IPN requests are verified using SHA512 HMAC before processing
- **Secure API Communication**: All API calls use HTTPS
- **Transaction Safety**: Webhook processing uses `TransactionalConnection.withTransaction()` so order state changes and payment creation are atomic
- **Channel-Aware Processing**: IPN handler resolves the order's channel before transitioning state or adding payments
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

1. **IPN not received**
   - Check your server is accessible via HTTPS
   - Verify IPN URL is correct in NOWPayments dashboard (`{host}/nowpayments/ipn`)
   - Check server logs for errors

2. **Invalid signature errors**
   - Verify IPN secret is correct
   - Ensure HMAC calculation is working properly
   - Check for encoding issues

3. **Payment not settling**
   - Check payment status in NOWPayments dashboard (must be `finished`)
   - Verify order ID format matches expected pattern (includes `invoicePrefix` if configured)
   - Review server logs for processing errors
   - Ensure the NOWPayments payment method is enabled in the Admin UI

4. **`addPaymentToOrder must be called within a transaction`**
   - Ensure you are running a recent version of the plugin; IPN processing must use the transactional `RequestContext` from `withTransaction`

5. **`Order has no customer`**
   - The customer must be assigned to the order before creating a payment intent
   - Guest checkout must set customer details on the order first

6. **Sandbox mode issues**
   - Ensure `sandbox: true` is set in plugin options
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
