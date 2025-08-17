import { Injectable, Inject } from '@nestjs/common';
import { 
    RequestContext, 
    Order, 
    OrderService, 
    PaymentService,
    TransactionalConnection,
    Logger,
    Payment,
} from '@vendure/core';
import { NOWPAYMENTS_PLUGIN_OPTIONS, loggerCtx } from './constants';
import { PluginInitOptions, NOWPaymentsPaymentData, NOWPaymentsInvoiceData, NOWPaymentsIPNData } from './types';
import * as crypto from 'crypto';

@Injectable()
export class NOWPaymentsService {

    constructor(
        private orderService: OrderService,
        private paymentService: PaymentService,
        private connection: TransactionalConnection,
        @Inject(NOWPAYMENTS_PLUGIN_OPTIONS) private options: PluginInitOptions
    ) {}

    get useInvoices(): boolean {
        return this.options.useInvoices || false;
    }

    get apiKey(): string {
        return this.options.apiKey || '';
    }

    get ipnSecret(): string {
        return this.options.ipnSecret || '';
    }

    get invoicePrefix(): string {
        return this.options.invoicePrefix || 'VC-';
    }

    get simpleTotal(): boolean {
        return this.options.simpleTotal || false;
    }

    get host(): string {
        return this.options.host || 'http://localhost:3000';
    }

    get sandbox(): boolean {
        return this.options.sandbox || false;
    }

    get isFixedRate(): boolean {
        return this.options.is_fixed_rate || false;
    }

    get isFeePaidByUser(): boolean {
        return this.options.is_fee_paid_by_user || false;
    }

    async generatePaymentUrl(ctx: RequestContext, order: Order): Promise<string> {
        const paymentData = await this.getPaymentData(ctx, order);
        const jsonData = JSON.stringify(paymentData);
        const encodedData = encodeURIComponent(jsonData);
        
        const baseUrl = this.sandbox ? 'https://sandbox.nowpayments.io' : 'https://nowpayments.io';
        return `${baseUrl}/payment?data=${encodedData}`;
    }

    async generateInvoiceUrl(ctx: RequestContext, order: Order): Promise<string> {
        const invoiceData = await this.getInvoiceData(ctx, order);
        
        try {
            const baseUrl = this.sandbox ? 'https://api-sandbox.nowpayments.io' : 'https://api.nowpayments.io';
            
            // Log the request data for debugging
            Logger.info(`Creating NOWPayments invoice for order ${order.code} - URL: ${baseUrl}/v1/invoice, Sandbox: ${this.sandbox}, Data: ${JSON.stringify(invoiceData)}`, loggerCtx);
            
            // Validate required fields before sending
            const requiredFields = ['ipn_callback_url', 'price_currency', 'success_url', 'cancel_url', 'order_id', 'price_amount'];
            const missingFields = requiredFields.filter(field => !invoiceData[field as keyof NOWPaymentsInvoiceData]);
            
            if (missingFields.length > 0) {
                Logger.error(`Missing required fields for invoice creation: ${missingFields.join(', ')} - Order: ${order.code}`, loggerCtx);
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }
            
            // Log the exact request being sent
            Logger.info(`Sending invoice request to NOWPayments - Headers: ${JSON.stringify({ 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey ? '***' + this.apiKey.slice(-4) : 'missing' })} - Body: ${JSON.stringify(invoiceData)}`, loggerCtx);
            
            const response = await fetch(`${baseUrl}/v1/invoice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': this.apiKey
                },
                body: JSON.stringify(invoiceData)
            });

            if (!response.ok) {
                // Get the response body for detailed error information
                let errorBody = '';
                try {
                    errorBody = await response.text();
                } catch (e) {
                    errorBody = 'Unable to read response body';
                }
                
                // Get response headers for debugging
                const responseHeaders: Record<string, string> = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });
                
                // Log detailed error information
                const apiKeySuffix = this.apiKey ? '***' + this.apiKey.slice(-4) : 'missing';
                Logger.error(`Invoice creation failed: ${response.status} ${response.statusText} - Response: ${errorBody} - Request: ${JSON.stringify(invoiceData)} - API Key: ${apiKeySuffix} - URL: ${baseUrl}/v1/invoice - Order: ${order.code} - Order ID: ${invoiceData.order_id} - Amount: ${invoiceData.price_amount} ${invoiceData.price_currency} - Response Headers: ${JSON.stringify(responseHeaders)}`, loggerCtx);
                
                throw new Error(`Invoice creation failed: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const data = await response.json() as any;
            
            // Log successful invoice creation
            Logger.info(`Successfully created NOWPayments invoice for order ${order.code} - Invoice URL: ${data.invoice_url} - Invoice ID: ${data.invoice_id}`, loggerCtx);
            
            return data.invoice_url;
        } catch (error: any) {
            Logger.error(`Failed to create NOWPayments invoice: ${error.message} - Order: ${order.code} - Request Data: ${JSON.stringify(invoiceData)}`, loggerCtx);
            throw error;
        }
    }

    private async getPaymentData(ctx: RequestContext, order: Order): Promise<NOWPaymentsPaymentData> {
        const customer = order.customer;
        if (!customer) {
            throw new Error('Order has no customer');
        }

        const orderId = this.invoicePrefix + order.code;
        const total = this.simpleTotal ? order.total : order.totalWithTax;
        
        const paymentData: NOWPaymentsPaymentData = {
            dataSource: 'vendure',
            ipnURL: this.getIpnUrl(),
            paymentCurrency: order.currencyCode,
            successURL: this.getSuccessUrl(order),
            cancelURL: this.getCancelUrl(order),
            orderID: orderId,
            apiKey: this.apiKey,
            customerName: customer.firstName || '',
            customerEmail: customer.emailAddress,
            paymentAmount: (total / 100).toFixed(8),
            tax: this.simpleTotal ? 0 : (order.lines.reduce((sum, line) => sum + (line.linePriceWithTax - line.linePrice), 0) / 100),
            shipping: order.shipping / 100,
            products: order.lines.map(line => ({
                name: line.productVariant.name,
                quantity: line.quantity,
                price: line.unitPrice / 100,
                total: line.linePriceWithTax / 100
            })),
            is_fixed_rate: this.isFixedRate,
            is_fee_paid_by_user: this.isFeePaidByUser
        };

        return paymentData;
    }

    private async getInvoiceData(ctx: RequestContext, order: Order): Promise<NOWPaymentsInvoiceData> {
        const customer = order.customer;
        if (!customer) {
            throw new Error('Order has no customer');
        }

        const orderId = this.invoicePrefix + order.code;
        const total = this.simpleTotal ? order.total : order.totalWithTax;
        
        const description = {
            customerName: customer.firstName || '',
            customerEmail: customer.emailAddress,
            tax: this.simpleTotal ? 0 : (order.lines.reduce((sum, line) => sum + (line.linePriceWithTax - line.linePrice), 0) / 100),
            shipping: order.shipping / 100
        };

        const invoiceData: NOWPaymentsInvoiceData = {
            // source: 'vendure',
            ipn_callback_url: this.getIpnUrl(),
            price_currency: order.currencyCode,
            success_url: this.getSuccessUrl(order),
            cancel_url: this.getCancelUrl(order),
            order_id: orderId,
            order_description: JSON.stringify(description),
            price_amount: (total / 100).toFixed(8),
            is_fixed_rate: this.isFixedRate,
            is_fee_paid_by_user: this.isFeePaidByUser
        };

        return invoiceData;
    }

    private getIpnUrl(): string {
        // This should be your server's IPN endpoint
        return `${this.host}/nowpayments/ipn`;
    }

    private getSuccessUrl(order: Order): string {
        return `${this.host}/checkout/confirmation/${order.code}`;
    }

    private getCancelUrl(order: Order): string {
        return `${this.host}/checkout/cancel/${order.code}`;
    }

    async processIpn(ctx: RequestContext, ipnData: NOWPaymentsIPNData, signature: string): Promise<boolean> {
        try {
            // Verify HMAC signature
            if (!this.verifySignature(ipnData, signature)) {
                Logger.error('Invalid IPN signature');
                return false;
            }

            // Find the order by code (not ID)
            const orderCode = ipnData.order_id.replace(this.invoicePrefix, '');
            const order = await this.orderService.findOneByCode(ctx, orderCode);
            
            if (!order) {
                Logger.error(`Order not found: ${orderCode}`);
                return false;
            }

            // Load the order with payments relation using repository
            const orderRepo = this.connection.getRepository(ctx, Order);
            const orderWithPayments = await orderRepo.findOne({
                where: { id: order.id },
                relations: ['payments']
            });

            if (!orderWithPayments) {
                Logger.error(`Order with payments not found: ${order.id}`);
                return false;
            }

            // Process payment status
            await this.processPaymentStatus(ctx, orderWithPayments, ipnData);
            
            return true;
        } catch (error: any) {
            Logger.error(`IPN processing error: ${error.message}`);
            return false;
        }
    }

    private verifySignature(data: any, receivedSignature: string): boolean {
        // Sort the data keys alphabetically
        const sortedData = Object.keys(data).sort().reduce((result, key) => {
            result[key] = data[key];
            return result;
        }, {} as any);

        const sortedJson = JSON.stringify(sortedData);
        const calculatedSignature = crypto
            .createHmac('sha512', this.ipnSecret)
            .update(sortedJson)
            .digest('hex');

        return calculatedSignature === receivedSignature;
    }

    private async processPaymentStatus(ctx: RequestContext, order: Order, ipnData: NOWPaymentsIPNData): Promise<void> {
        const paymentStatus = ipnData.payment_status;
        const payment = order.payments.find(p => p.method === 'nowpayments');

        if (!payment) {
            Logger.error(`No NOWPayments payment found for order: ${order.code}`);
            return;
        }

        // Store the full IPN response in metadata
        const fullIpnData = {
            ...ipnData,
            processed_at: new Date().toISOString()
        };

        switch (paymentStatus) {
            case 'finished':
                // Use PaymentService to properly settle the payment
                await this.paymentService.settlePayment(ctx, payment.id);
                payment.metadata = {
                    ...payment.metadata,
                    settled: true,
                    paymentStatus: 'finished',
                    fullIpnData,
                    outcome_currency: ipnData.outcome_currency,
                    outcome_amount: ipnData.outcome_amount,
                    pay_currency: ipnData.pay_currency,
                    pay_amount: ipnData.pay_amount,
                    actually_paid: ipnData.actually_paid,
                    payment_id: ipnData.payment_id,
                    invoice_id: ipnData.invoice_id
                };
                break;

            case 'partially_paid':
                // Keep payment in Authorized state but update metadata
                payment.metadata = {
                    ...payment.metadata,
                    paymentStatus: 'partially_paid',
                    fullIpnData,
                    outcome_currency: ipnData.outcome_currency,
                    outcome_amount: ipnData.outcome_amount,
                    pay_currency: ipnData.pay_currency,
                    pay_amount: ipnData.pay_amount,
                    actually_paid: ipnData.actually_paid,
                    payment_id: ipnData.payment_id,
                    invoice_id: ipnData.invoice_id
                };
                break;

            case 'confirming':
            case 'confirmed':
            case 'sending':
                // Keep payment in Authorized state but update metadata
                payment.metadata = {
                    ...payment.metadata,
                    paymentStatus,
                    fullIpnData,
                    outcome_currency: ipnData.outcome_currency,
                    outcome_amount: ipnData.outcome_amount,
                    pay_currency: ipnData.pay_currency,
                    pay_amount: ipnData.pay_amount,
                    actually_paid: ipnData.actually_paid,
                    payment_id: ipnData.payment_id,
                    invoice_id: ipnData.invoice_id
                };
                break;

            case 'failed':
                // Use PaymentService to properly decline the payment
                await this.paymentService.cancelPayment(ctx, payment.id);
                payment.metadata = {
                    ...payment.metadata,
                    paymentStatus: 'failed',
                    fullIpnData,
                    outcome_currency: ipnData.outcome_currency,
                    outcome_amount: ipnData.outcome_amount,
                    pay_currency: ipnData.pay_currency,
                    pay_amount: ipnData.pay_amount,
                    actually_paid: ipnData.actually_paid,
                    payment_id: ipnData.payment_id,
                    invoice_id: ipnData.invoice_id
                };
                break;

            default:
                Logger.warn(`Unknown payment status: ${paymentStatus}`);
                // Still store the IPN data even for unknown statuses
                payment.metadata = {
                    ...payment.metadata,
                    paymentStatus,
                    fullIpnData,
                    outcome_currency: ipnData.outcome_currency,
                    outcome_amount: ipnData.outcome_amount,
                    pay_currency: ipnData.pay_currency,
                    pay_amount: ipnData.pay_amount,
                    actually_paid: ipnData.actually_paid,
                    payment_id: ipnData.payment_id,
                    invoice_id: ipnData.invoice_id
                };
        }

        // Save the payment metadata updates
        await this.connection.getRepository(ctx, Payment).save(payment);
    }
} 