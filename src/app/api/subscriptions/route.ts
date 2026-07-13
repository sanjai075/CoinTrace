import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event;
    
    console.log('Incoming Razorpay Webhook Event:', event);

    if (event === 'subscription.charged') {
      const entity = body.payload.subscription.entity;
      const razorpaySubId = entity.id;
      const planId = entity.plan_id;
      const currentEnd = entity.current_end; // Unix timestamp
      const userId = entity.notes?.userId;

      if (userId) {
        // Map plan_id to CoinTrace pricing tiers
        // In Razorpay, plan_id would be configured in Dashboard (e.g. plan_oneshop, plan_twoshops, plan_multi)
        let subscriptionPlan = 'ONE_SHOP';
        if (planId.includes('two')) subscriptionPlan = 'TWO_SHOPS';
        else if (planId.includes('three') || planId.includes('multi')) subscriptionPlan = 'THREE_PLUS';

        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionPlan,
            subscriptionEnds: new Date(currentEnd * 1000),
            razorpaySubId,
          },
        });
      }
    }

    if (event === 'subscription.cancelled') {
      const entity = body.payload.subscription.entity;
      const razorpaySubId = entity.id;
      const userId = entity.notes?.userId;

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionPlan: 'FREE',
            subscriptionEnds: new Date(), // End immediately
          },
        });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Internal error';
    console.error('Razorpay Webhook Error:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
