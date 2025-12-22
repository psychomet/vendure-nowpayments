import {
  PaymentMethodHandler,
  CreatePaymentResult,
  SettlePaymentResult,
  LanguageCode,
  Injector,
  PaymentState,
} from '@vendure/core';
import { NOWPaymentsService } from './nowpayments.service';

let nowPaymentsService: NOWPaymentsService;

export const nowPaymentsPaymentHandler = new PaymentMethodHandler({
    code: 'nowpayments',
    description: [{
        languageCode: LanguageCode.en,
        value: 'NOWPayments Cryptocurrency Payment Gateway',
    }],
    args: {}, // Empty args since we use dependency injection
    init(injector: Injector) {
        nowPaymentsService = injector.get(NOWPaymentsService);
    },
    createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
        // Payment is already settled in NOWPayments by the time the webhook in nowpayments.controller.ts
        // adds the payment to the order via addPaymentToOrder
        if (ctx.apiType !== 'admin') {
            throw Error(`CreatePayment is not allowed for apiType '${ctx.apiType}'`);
        }

        // If metadata contains paymentId, this is coming from addPaymentToOrder (webhook flow)
        if (metadata?.paymentId) {
            // Convert amount from decimal to minor units if needed
            // The amount received is already in minor units from the controller
            const amountReceived = metadata.actuallyPaid 
                ? Math.round(parseFloat(metadata.actuallyPaid) * 100)
                : amount;

            return {
                amount: amountReceived,
                state: 'Settled' as const,
                transactionId: metadata.paymentId?.toString(),
                metadata,
            };
        }

        // Fallback: if no paymentId in metadata, this might be a direct payment creation
        // This should not happen in normal flow, but keeping for backwards compatibility
        return {
            amount: amount,
            state: 'Authorized' as const,
            metadata: metadata || {},
        };
    },
    settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult> => {
        // For NOWPayments, we don't settle immediately
        // The payment is settled via IPN callback
        return { success: true };
    }
}); 