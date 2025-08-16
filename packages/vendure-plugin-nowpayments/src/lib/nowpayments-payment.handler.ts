import { 
    PaymentMethodHandler, 
    CreatePaymentResult, 
    SettlePaymentResult, 
    LanguageCode,
    Injector
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
        try {
            // Check if a NOWPayments payment already exists for this order
            // const existingPayment = order.payments.find(p => p.method === 'nowpayments');
            // if (existingPayment) {
            //     // If payment already exists, return the existing payment state
            //     return {
            //         amount: existingPayment.amount,
            //         state: existingPayment.state as any,
            //         metadata: existingPayment.metadata,
            //     };
            // }

            // Generate payment URL based on configuration
            const redirectUrl = nowPaymentsService.useInvoices 
                ? await nowPaymentsService.generateInvoiceUrl(ctx, order)
                : await nowPaymentsService.generatePaymentUrl(ctx, order);
            const orderId = nowPaymentsService.invoicePrefix + order.code;

            return {
                amount: amount,
                state: 'Authorized' as const,
                metadata: {
                    public: {
                      redirectUrl
                    },
                    orderId: order.id,
                    paymentMethod: 'nowpayments',
                    nowPaymentsOrderId: orderId,
                },
            };
        } catch (err: any) {
            return {
                amount: amount,
                state: 'Declined' as const,
                metadata: {
                    errorMessage: err.message,
                },
            };
        }
    },
    settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult> => {
        // For NOWPayments, we don't settle immediately
        // The payment is settled via IPN callback
        return { success: true };
    }
}); 