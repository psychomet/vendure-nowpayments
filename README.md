# Vendure NOWPayments Plugin

A [Vendure](https://www.vendure.io/) plugin that integrates [NOWPayments](https://nowpayments.io/) cryptocurrency payment processing into your e-commerce store.

## 🚀 Features

- **Cryptocurrency Payments**: Accept Bitcoin, Ethereum, and 1000+ other cryptocurrencies
- **IPN (Instant Payment Notification)**: Real-time payment status updates
- **Secure Payment Processing**: Built-in signature verification for webhook security
- **Vendure Integration**: Seamless integration with Vendure's payment system
- **TypeScript Support**: Full TypeScript support with type safety

## 📦 Installation

```bash
npm install vendure-plugin-nowpayments
```

## 🔧 Configuration

### 1. Add the plugin to your Vendure config

```typescript
import { VendureConfig } from '@vendure/core';
import { NOWPaymentsPlugin } from 'vendure-plugin-nowpayments';

export const config: VendureConfig = {
  plugins: [
    NOWPaymentsPlugin.init({
      apiKey: 'your-nowpayments-api-key',
      ipnSecret: 'your-ipn-secret-key',
      sandbox: false, // Set to true for testing
    }),
  ],
  // ... rest of your config
};
```

### 2. Environment Variables

```bash
# Required
NOWPAYMENTS_API_KEY=your-api-key-here
NOWPAYMENTS_IPN_SECRET=your-ipn-secret-here

# Optional
NOWPAYMENTS_SANDBOX=true  # Set to true for testing
```

## 🎯 Usage

### Payment Method Setup

1. **Create a Payment Method** in your Vendure admin
2. **Configure NOWPayments** with your API credentials
3. **Set up IPN endpoint** at `/nowpayments/ipn`

### API Endpoints

#### IPN Webhook
```
POST /nowpayments/ipn
```

The plugin automatically handles IPN (Instant Payment Notification) from NOWPayments to update order status.

## 🔐 Security

- **Signature Verification**: All IPN requests are verified using HMAC-SHA256
- **Request Validation**: Comprehensive validation of payment data
- **Error Handling**: Secure error responses without exposing sensitive information

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Vendure 3.0+

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/psychomet/vendure-nowpayments.git
cd vendure-nowpayments

# Install dependencies
npm install

# Build the plugin
npx nx build vendure-plugin-nowpayments

# Run tests
npx nx test vendure-plugin-nowpayments
```

### Project Structure

```
packages/vendure-plugin-nowpayments/
├── src/
│   ├── lib/
│   │   ├── constants.ts          # Plugin constants
│   │   ├── nowpayments.controller.ts  # IPN endpoint
│   │   ├── nowpayments.service.ts     # Core business logic
│   │   ├── nowpayments.plugin.ts      # Plugin definition
│   │   └── types.ts                   # TypeScript types
│   └── index.ts                  # Main entry point
├── package.json
└── tsconfig.json
```

## 🧪 Testing

```bash
# Run unit tests
npx nx test vendure-plugin-nowpayments

# Run with coverage
npx nx test vendure-plugin-nowpayments --coverage
```

## 📦 Building

```bash
# Build the plugin
npx nx build vendure-plugin-nowpayments

# Build with type checking
npx nx typecheck vendure-plugin-nowpayments
```

## 🚀 Release

The project uses [Nx Release](https://nx.dev/features/manage-releases) for automated versioning and publishing.

### Automatic Releases

The plugin automatically releases when you push conventional commits to the main branch:

```bash
# Minor version bump
git commit -m "feat: add new payment method"

# Patch version bump
git commit -m "fix: resolve authentication issue"

# No version bump
git commit -m "docs: update README"
```

### Manual Release

```bash
# Preview release
npx nx release vendure-plugin-nowpayments --dry-run

# Create release
npx nx release vendure-plugin-nowpayments --yes
```

## 📋 Supported Cryptocurrencies

NOWPayments supports 1000+ cryptocurrencies including:

- Bitcoin (BTC)
- Ethereum (ETH)
- Litecoin (LTC)
- Bitcoin Cash (BCH)
- And many more...

See the [NOWPayments supported currencies](https://nowpayments.io/supported-coins) for the complete list.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
- Write tests for new features
- Update documentation as needed
- Ensure TypeScript compilation passes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Vendure Docs](https://www.vendure.io/docs)
- **Issues**: [GitHub Issues](https://github.com/psychomet/vendure-nowpayments/issues)
- **Discord**: [Vendure Community](https://discord.gg/vendure)

## 🙏 Acknowledgments

- [Vendure](https://www.vendure.io/) - The amazing e-commerce framework
- [NOWPayments](https://nowpayments.io/) - Cryptocurrency payment processing
- [Nx](https://nx.dev/) - Monorepo tooling

---

Made with ❤️ by the Vendure community
