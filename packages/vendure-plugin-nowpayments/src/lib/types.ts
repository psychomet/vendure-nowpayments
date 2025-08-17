/**
 * @description
 * The plugin can be configured using the following options:
 */
export interface PluginInitOptions {
    apiKey: string;
    ipnSecret: string;
    host?: string;
    title?: string;
    description?: string;
    instructions?: string;
    debugEmail?: string;
    debugPostUrl?: string;
    allowZeroConfirm?: boolean;
    formSubmissionMethod?: boolean;
    invoicePrefix?: string;
    simpleTotal?: boolean;
    useInvoices?: boolean;
    sandbox?: boolean;
    is_fixed_rate?: boolean;
    is_fee_paid_by_user?: boolean;
}

export interface NOWPaymentsPaymentData {
    dataSource: string;
    ipnURL: string;
    paymentCurrency: string;
    successURL: string;
    cancelURL: string;
    orderID: string;
    apiKey: string;
    customerName: string;
    customerEmail: string;
    paymentAmount: string;
    tax: number;
    shipping: number;
    products: any[];
    is_fixed_rate?: boolean;
    is_fee_paid_by_user?: boolean;
}

export interface NOWPaymentsInvoiceData {
    // source: string;
    ipn_callback_url: string;
    price_currency: string;
    success_url: string;
    cancel_url: string;
    order_id: string;
    order_description: string;
    price_amount: string;
    is_fixed_rate?: boolean;
    is_fee_paid_by_user?: boolean;
}

export interface NOWPaymentsIPNData {
    order_id: string;
    payment_status: string;
    pay_currency: string;
    price_amount: string;
    actually_paid: string;
    actually_paid_at_fiat: number;
    outcome_currency: string;
    outcome_amount: number;
    pay_amount: number;
    payment_id: number;
    invoice_id: number;
    pay_address: string;
    price_currency: string;
    purchase_id: string;
    updated_at: number;
    fee?: {
        currency: string;
        depositFee: number;
        serviceFee: number;
        withdrawalFee: number;
    };
    order_description?: string | null;
    parent_payment_id?: number | null;
    payin_extra_id?: string | null;
    payment_extra_ids?: any;
    [key: string]: any;
}
