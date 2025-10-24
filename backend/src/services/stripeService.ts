import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export const createCustomer = async (email: string, name: string) => {
  const customer = await stripe.customers.create({
    email,
    name,
  });
  return customer;
};

export const createCheckoutSession = async (
  customerId: string,
  priceId: string,
  organizationId: number,
  successUrl: string,
  cancelUrl: string
) => {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organization_id: organizationId.toString(),
    },
  });
  return session;
};

export const createPortalSession = async (customerId: string, returnUrl: string) => {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session;
};

export const cancelSubscription = async (subscriptionId: string) => {
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
};

export const updateSubscription = async (subscriptionId: string, priceId: string) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });

  return updatedSubscription;
};

export const getSubscription = async (subscriptionId: string) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
};

export const constructWebhookEvent = (payload: string | Buffer, signature: string) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  return event;
};

export default stripe;
