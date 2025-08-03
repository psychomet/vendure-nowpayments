import { LanguageCode } from '@vendure/core';

export const NOWPaymentsConfig = {
    code: 'nowpayments',
    name: 'NOWPayments',
    description: 'Cryptocurrency Payment Gateway via NOWPayments.io',
    supportedCurrencies: ['USD', 'EUR', 'BTC', 'ETH', 'LTC', 'BCH', 'XRP', 'ADA', 'DOT', 'LINK'],
    
    // Admin configuration fields
    configFields: [
        {
            name: 'apiKey',
            type: 'string',
            required: true,
            label: [{ languageCode: LanguageCode.en, value: 'API Key' }],
            description: [{ languageCode: LanguageCode.en, value: 'Your NOWPayments.io API key' }],
        },
        {
            name: 'ipnSecret',
            type: 'string',
            required: true,
            label: [{ languageCode: LanguageCode.en, value: 'IPN Secret' }],
            description: [{ languageCode: LanguageCode.en, value: 'Your NOWPayments.io IPN secret for webhook verification' }],
        },
        {
            name: 'title',
            type: 'string',
            required: false,
            defaultValue: 'NOWPayments',
            label: [{ languageCode: LanguageCode.en, value: 'Title' }],
            description: [{ languageCode: LanguageCode.en, value: 'Payment method title shown to customers' }],
        },
        {
            name: 'description',
            type: 'string',
            required: false,
            defaultValue: 'Pay with cryptocurrency via NOWPayments.io',
            label: [{ languageCode: LanguageCode.en, value: 'Description' }],
            description: [{ languageCode: LanguageCode.en, value: 'Payment method description shown to customers' }],
        },
        {
            name: 'useInvoices',
            type: 'boolean',
            required: false,
            defaultValue: false,
            label: [{ languageCode: LanguageCode.en, value: 'Use Invoices' }],
            description: [{ languageCode: LanguageCode.en, value: 'Use NOWPayments invoices instead of direct payment links' }],
        },
        {
            name: 'invoicePrefix',
            type: 'string',
            required: false,
            defaultValue: 'VC-',
            label: [{ languageCode: LanguageCode.en, value: 'Invoice Prefix' }],
            description: [{ languageCode: LanguageCode.en, value: 'Prefix for invoice numbers (must not end with a digit)' }],
        },
        {
            name: 'simpleTotal',
            type: 'boolean',
            required: false,
            defaultValue: false,
            label: [{ languageCode: LanguageCode.en, value: 'Simple Total' }],
            description: [{ languageCode: LanguageCode.en, value: 'Use simple total calculation (may be needed for compatibility)' }],
        },
        {
            name: 'debugEmail',
            type: 'string',
            required: false,
            label: [{ languageCode: LanguageCode.en, value: 'Debug Email' }],
            description: [{ languageCode: LanguageCode.en, value: 'Email address for debug notifications (optional)' }],
        },
    ],
}; 