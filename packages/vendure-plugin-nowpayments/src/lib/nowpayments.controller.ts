import { Controller, Post, Body, Headers, Res, HttpStatus, Req } from '@nestjs/common';
import { Response } from 'express';
import type { PaymentMethod, RequestContext } from '@vendure/core';
import {
    RequestContextService,
    Logger,
    OrderService,
    PaymentMethodService,
    ChannelService,
    TransactionalConnection,
    InternalServerError,
    OrderStateTransitionError,
    LanguageCode,
} from '@vendure/core';
import type { Request } from 'express';
import { NOWPaymentsService } from './nowpayments.service';
import { NOWPaymentsIPNData } from './types';
import { loggerCtx } from './constants';
import { nowPaymentsPaymentHandler } from './nowpayments-payment.handler';
import { Order } from '@vendure/core';

const missingSignatureErrorMessage = 'Missing x-nowpayments-sig header';
const signatureErrorMessage = 'Error verifying NOWPayments IPN signature';
const noOrderIdErrorMessage = 'No order_id in the IPN payload';

@Controller('nowpayments')
export class NOWPaymentsController {
    constructor(
        private nowPaymentsService: NOWPaymentsService,
        private requestContextService: RequestContextService,
        private orderService: OrderService,
        private paymentMethodService: PaymentMethodService,
        private channelService: ChannelService,
        private connection: TransactionalConnection,
    ) {}

    @Post('ipn')
    async handleIpn(
        @Body() body: NOWPaymentsIPNData,
        @Headers('x-nowpayments-sig') signature: string | undefined,
        @Req() request: Request,
        @Res() res: Response,
    ): Promise<void> {
        if (!signature) {
            Logger.error(missingSignatureErrorMessage, loggerCtx);
            res.status(HttpStatus.BAD_REQUEST).send(missingSignatureErrorMessage);
            return;
        }

        const { order_id, payment_status } = body;

        if (!order_id) {
            Logger.error(noOrderIdErrorMessage, loggerCtx);
            res.status(HttpStatus.BAD_REQUEST).send(noOrderIdErrorMessage);
            return;
        }

        // Extract order code from order_id (remove invoice prefix)
        const orderCode = order_id.replace(this.nowPaymentsService.invoicePrefix, '');

        // Create initial context with default channel to find the order
        const defaultChannel = await this.channelService.getDefaultChannel();
        const initialCtx = await this.requestContextService.create({
            apiType: 'admin',
            channelOrToken: defaultChannel.token,
        });

        await this.connection.withTransaction(initialCtx, async (ctx: RequestContext) => {
            const order = await this.orderService.findOneByCode(ctx, orderCode);

            if (!order) {
                throw new Error(
                    `Unable to find order ${orderCode}, unable to process IPN for payment ${body.payment_id}!`,
                );
            }

            // Verify signature
            if (!this.nowPaymentsService.verifySignature(body, signature)) {
                Logger.error(`${signatureErrorMessage} for order ${orderCode}`, loggerCtx);
                res.status(HttpStatus.BAD_REQUEST).send(signatureErrorMessage);
                return;
            }

            // Handle failed/expired payments
            if (payment_status === 'failed' || payment_status === 'expired') {
                const message = `Payment for order ${orderCode} ${payment_status}`;
                Logger.warn(message, loggerCtx);
                res.status(HttpStatus.OK).send('Ok');
                return;
            }

            // Only process 'finished' status - this is when payment is complete
            if (payment_status !== 'finished') {
                Logger.info(`Received ${payment_status} status update for order ${orderCode}`, loggerCtx);
                res.status(HttpStatus.OK).send('Ok');
                return;
            }

            // Use default channel for context (similar to Stripe's fallback approach)
            const ctxWithOrderChannel = await this.requestContextService.create({
                apiType: 'admin',
                channelOrToken: defaultChannel.token,
                languageCode: LanguageCode.en,
                req: request as unknown as Request,
            });

            // Transition order to ArrangingPayment if needed
            if (order.state !== 'ArrangingPayment' && order.state !== 'ArrangingAdditionalPayment') {
                let transitionToStateResult = await this.orderService.transitionToState(
                    ctxWithOrderChannel,
                    order.id,
                    'ArrangingPayment',
                );

                // If the channel specific context fails, try to use the default channel context
                if (transitionToStateResult instanceof OrderStateTransitionError) {
                    const defaultChannelCtx = await this.requestContextService.create({
                        apiType: 'admin',
                        channelOrToken: defaultChannel.token,
                        languageCode: LanguageCode.en,
                        req: request as unknown as Request,
                    });

                    transitionToStateResult = await this.orderService.transitionToState(
                        defaultChannelCtx,
                        order.id,
                        'ArrangingPayment',
                    );
                }

                // If the order is still not in the ArrangingPayment state, log an error
                if (transitionToStateResult instanceof OrderStateTransitionError) {
                    Logger.error(
                        `Error transitioning order ${orderCode} to ArrangingPayment state: ${transitionToStateResult.message}`,
                        loggerCtx,
                    );
                    return;
                }
            }

            const paymentMethod = await this.getPaymentMethod(ctxWithOrderChannel);

            const addPaymentToOrderResult = await this.orderService.addPaymentToOrder(
                ctxWithOrderChannel,
                order.id,
                {
                    method: paymentMethod.code,
                    metadata: {
                        paymentId: body.payment_id,
                        invoiceId: body.invoice_id,
                        paymentStatus: payment_status,
                        actuallyPaid: body.actually_paid,
                        payAmount: body.pay_amount,
                        payCurrency: body.pay_currency,
                        outcomeAmount: body.outcome_amount,
                        outcomeCurrency: body.outcome_currency,
                        orderId: order_id,
                    },
                },
            );

            if (!(addPaymentToOrderResult instanceof Order)) {
                Logger.error(
                    `Error adding payment to order ${orderCode}: ${addPaymentToOrderResult.message}`,
                    loggerCtx,
                );
                return;
            }

            Logger.info(
                `NOWPayments payment id ${body.payment_id} added to order ${orderCode}`,
                loggerCtx,
            );
        });

        // Send the response status only if we didn't send anything yet.
        if (!res.headersSent) {
            res.status(HttpStatus.OK).send('Ok');
        }
    }

    private async getPaymentMethod(ctx: RequestContext): Promise<PaymentMethod> {
        const method = (await this.paymentMethodService.findAll(ctx)).items.find(
            m => m.handler.code === nowPaymentsPaymentHandler.code,
        );

        if (!method) {
            throw new InternalServerError(`[${loggerCtx}] Could not find NOWPayments PaymentMethod`);
        }

        return method;
    }
} 