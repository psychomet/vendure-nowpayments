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

## Installation

```bash
npm install vendure-plugin-nowpayments
```

## Configuration

Add the plugin to your Vendure config:

```ts
// vendure-config.ts
import { VendureConfig } from '@vendure/core';
import { NowpaymentsPlugin } from '@vendure/nowpayments-plugin';

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
    }),
    // ... other plugins
  ],
  paymentOptions: {
    paymentMethodHandlers: [
      // ... other payment handlers
      nowPaymentsPaymentHandler, // This is exported from the plugin
    ],
  },
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

1. **Customer selects NOWPayments** during checkout
2. **Payment URL is generated** (direct link or invoice)
3. **Customer is redirected** to NOWPayments payment page
4. **Customer pays** with their chosen cryptocurrency
5. **NOWPayments sends IPN** to your server
6. **Order status is updated** based on payment status

### Payment Statuses

| Status | Order State | Description |
|--------|-------------|-------------|
| `finished` | PaymentSettled | Payment completed successfully |
| `partially_paid` | PaymentAuthorized | Partial payment received |
| `confirming` | PaymentAuthorized | Payment is being confirmed |
| `confirmed` | PaymentAuthorized | Payment confirmed on blockchain |
| `sending` | PaymentAuthorized | Payment is being sent |
| `failed` | PaymentDeclined | Payment failed |

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

### Payment Method

- `nowpayments` - The payment method handler for NOWPayments

### IPN Endpoint

- `POST /nowpayments/ipn` - Webhook endpoint for NOWPayments IPN callbacks

## Security Features

- **HMAC Signature Verification**: All IPN requests are verified using SHA512 HMAC
- **Order Validation**: Payment amounts and currencies are validated
- **Secure API Communication**: All API calls use HTTPS
- **Error Logging**: Comprehensive error logging for debugging

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
    - Check payment status in NOWPayments dashboard
    - Verify order ID format matches expected pattern
    - Review server logs for processing errors

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