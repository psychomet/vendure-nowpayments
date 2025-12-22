import { Mutation, Resolver } from '@nestjs/graphql';
import {
    ActiveOrderService,
    Allow,
    Ctx,
    Permission,
    RequestContext,
    UnauthorizedError,
    UserInputError,
} from '@vendure/core';

import { NOWPaymentsService } from './nowpayments.service';

@Resolver()
export class NOWPaymentsResolver {
    constructor(
        private nowPaymentsService: NOWPaymentsService,
        private activeOrderService: ActiveOrderService,
    ) {}

    @Mutation()
    @Allow(Permission.Owner)
    async createNowPaymentsPaymentIntent(@Ctx() ctx: RequestContext): Promise<string> {
        if (!ctx.authorizedAsOwnerOnly) {
            throw new UnauthorizedError();
        }
        const sessionOrder = await this.activeOrderService.getActiveOrder(ctx, undefined);
        if (!sessionOrder) {
            throw new UserInputError('No active order found for session');
        }
        return this.nowPaymentsService.createPaymentIntent(ctx, sessionOrder);
    }
}

