import { Controller, Post, Body, Headers, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { RequestContextService, Logger } from '@vendure/core';
import { NOWPaymentsService } from './nowpayments.service';
import { NOWPaymentsIPNData } from './types';
import { loggerCtx } from './constants';

@Controller('nowpayments')
export class NOWPaymentsController {
    constructor(
        private nowPaymentsService: NOWPaymentsService,
        private requestContextService: RequestContextService
    ) {}

    @Post('ipn')
    async handleIpn(
        @Body() body: NOWPaymentsIPNData,
        @Headers('x-nowpayments-sig') signature: string,
        @Res() res: Response
    ) {
        try {
            // Create a proper RequestContext for the IPN processing
            const ctx = await this.requestContextService.create({
                apiType: 'admin',
            });

            const success = await this.nowPaymentsService.processIpn(ctx, body, signature);

            if (success) {
                res.status(HttpStatus.OK).send('IPN processed successfully');
            } else {
                res.status(HttpStatus.BAD_REQUEST).send('IPN processing failed');
            }
        } catch (error) {
            Logger.error('IPN processing error', loggerCtx, error instanceof Error ? error.message : String(error));
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal server error');
        }
    }
} 