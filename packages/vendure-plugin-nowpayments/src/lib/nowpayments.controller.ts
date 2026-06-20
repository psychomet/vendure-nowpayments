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

        if (!this.nowPaymentsService.verifySignature(body, signature)) {
            Logger.error(`${signatureErrorMessage} for order ${order_id}`, loggerCtx);
            res.status(HttpStatus.BAD_REQUEST).send(signatureErrorMessage);
            return;
        }

        if (payment_status === 'failed' || payment_status === 'expired') {
            const orderCode = order_id.replace(this.nowPaymentsService.invoicePrefix, '');
            Logger.warn(`Payment for order ${orderCode} ${payment_status}`, loggerCtx);
            res.status(HttpStatus.OK).send('Ok');
            return;
        }

        if (payment_status !== 'finished') {
            const orderCode = order_id.replace(this.nowPaymentsService.invoicePrefix, '');
            Logger.info(`Received ${payment_status} status update for order ${orderCode}`, loggerCtx);
            res.status(HttpStatus.OK).send('Ok');
            return;
        }

        const orderCode = order_id.replace(this.nowPaymentsService.invoicePrefix, '');
        const defaultChannel = await this.channelService.getDefaultChannel();
        const lookupCtx = await this.requestContextService.create({
            apiType: 'admin',
            channelOrToken: defaultChannel.token,
        });

        const order = await this.orderService.findOneByCode(lookupCtx, orderCode);
        if (!order) {
            Logger.error(
                `Unable to find order ${orderCode}, unable to process IPN for payment ${body.payment_id}!`,
                loggerCtx,
            );
            res.status(HttpStatus.BAD_REQUEST).send(`Order ${orderCode} not found`);
            return;
        }

        const orderChannels = await this.orderService.getOrderChannels(lookupCtx, order);
        const orderChannel = orderChannels[0] ?? defaultChannel;
        const channelCtx = await this.requestContextService.create({
            apiType: 'admin',
            channelOrToken: orderChannel.token,
            languageCode: LanguageCode.en,
            req: request as unknown as Request,
        });

        try {
            await this.connection.withTransaction(channelCtx, async (ctx: RequestContext) => {
                const orderInTx = await this.orderService.findOneByCode(ctx, orderCode);
                if (!orderInTx) {
                    throw new Error(
                        `Unable to find order ${orderCode}, unable to process IPN for payment ${body.payment_id}!`,
                    );
                }

                if (
                    orderInTx.state !== 'ArrangingPayment' &&
                    orderInTx.state !== 'ArrangingAdditionalPayment'
                ) {
                    const transitionToStateResult = await this.orderService.transitionToState(
                        ctx,
                        orderInTx.id,
                        'ArrangingPayment',
                    );

                    if (transitionToStateResult instanceof OrderStateTransitionError) {
                        Logger.error(
                            `Error transitioning order ${orderCode} to ArrangingPayment state: ${transitionToStateResult.message}`,
                            loggerCtx,
                        );
                        throw transitionToStateResult;
                    }
                }

                const paymentMethod = await this.getPaymentMethod(ctx);

                const addPaymentToOrderResult = await this.orderService.addPaymentToOrder(
                    ctx,
                    orderInTx.id,
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
                    throw addPaymentToOrderResult;
                }

                Logger.info(
                    `NOWPayments payment id ${body.payment_id} added to order ${orderCode}`,
                    loggerCtx,
                );
            });

            res.status(HttpStatus.OK).send('Ok');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            Logger.error(`IPN processing failed for order ${orderCode}: ${message}`, loggerCtx);
            if (!res.headersSent) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('IPN processing failed');
            }
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
