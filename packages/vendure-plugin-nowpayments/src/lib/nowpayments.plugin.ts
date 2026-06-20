/**
 * NOWPayments cryptocurrency payment gateway plugin for Vendure.
 * 
 * This plugin integrates with NOWPayments.io to enable cryptocurrency payments
 * in your Vendure store. It supports Bitcoin, Ethereum, and 100+ other cryptocurrencies.
 * 
 * @category Plugin
 */
import { 
    PluginCommonModule, 
    Type, 
    VendurePlugin,
} from '@vendure/core';
import { gql } from 'graphql-tag';
import { NOWPaymentsService } from './nowpayments.service';
import { NOWPaymentsController } from './nowpayments.controller';
import { NOWPaymentsResolver } from './nowpayments.resolver';
import { nowPaymentsPaymentHandler } from './nowpayments-payment.handler';

import { NOWPAYMENTS_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';

console.log('hello');
console.log('hello');


@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        { provide: NOWPAYMENTS_PLUGIN_OPTIONS, useFactory: () => NowpaymentsPlugin.options },
        NOWPaymentsService,
    ],
    controllers: [NOWPaymentsController],
    configuration: config => {
        // Register the payment method handler
        config.paymentOptions.paymentMethodHandlers.push(nowPaymentsPaymentHandler);
        
        // Plugin-specific configuration
        // such as custom fields, custom permissions,
        // strategies etc. can be configured here by
        // modifying the `config` object.
        return config;
    },
    shopApiExtensions: {
        schema: gql`
            extend type Mutation {
                createNowPaymentsPaymentIntent: String!
            }
        `,
        resolvers: [NOWPaymentsResolver],
    },
    compatibility: '^3.0.0',
})
export class NowpaymentsPlugin {
    /** @internal */
    static options: PluginInitOptions;

    /**
     * Initialize the NOWPayments plugin with the required configuration options.
     * 
     * @example
     * ```ts
     * NowpaymentsPlugin.init({
     *     apiKey: process.env.NOWPAYMENTS_API_KEY || '',
     *     ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET || '',
     *     host: process.env.VENDURE_HOST || 'http://localhost:3000',
     *     getSuccessUrl: (order, host) => `${host}/order/confirmation/${order.code}`,
     *     getCancelUrl: (order, host) => `${host}/checkout`,
     *     sandbox: process.env.NOWPAYMENTS_SANDBOX === 'true',
     *     useInvoices: false,
     *     invoicePrefix: 'VC-',
     *     simpleTotal: false,
     *     allowZeroConfirm: true,
     *     formSubmissionMethod: true,
     *     debugEmail: process.env.NOWPAYMENTS_DEBUG_EMAIL || '',
     *     debugPostUrl: process.env.NOWPAYMENTS_DEBUG_POST_URL || '',
     *     is_fixed_rate: false,
     *     is_fee_paid_by_user: false,
     * }),
     * ```
     */
    static init(options: PluginInitOptions): Type<NowpaymentsPlugin> {
        this.options = options;
        return NowpaymentsPlugin;
    }
}
