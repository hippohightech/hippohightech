import { Router, Response } from 'express';
import db from '../database';
import { authenticateToken } from '../middleware/auth';
import { requireOrganization, requireOrganizationMember, requireOrganizationAdmin, OrgRequest } from '../middleware/organization';
import { SubscriptionPlan } from '../types';
import { createCustomer, createCheckoutSession, createPortalSession } from '../services/stripeService';
import { logActivity } from '../utils/logger';

const router = Router();

// Get all subscription plans
router.get('/plans', (req, res: Response) => {
  db.all(
    'SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC',
    [],
    (err, plans: SubscriptionPlan[]) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching plans' });
      }
      res.json(plans);
    }
  );
});

// Get current subscription
router.get(
  '/current/:organizationId',
  authenticateToken,
  requireOrganization,
  requireOrganizationMember,
  (req: OrgRequest, res: Response) => {
    const organization = req.organization!;

    db.get(
      'SELECT * FROM subscription_plans WHERE name = ?',
      [organization.subscription_plan],
      (err, plan: SubscriptionPlan) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching subscription' });
        }

        res.json({
          plan,
          subscription_status: organization.subscription_status,
          stripe_customer_id: organization.stripe_customer_id,
          stripe_subscription_id: organization.stripe_subscription_id,
          trial_ends_at: organization.trial_ends_at,
        });
      }
    );
  }
);

// Create checkout session
router.post(
  '/checkout/:organizationId',
  authenticateToken,
  requireOrganization,
  requireOrganizationMember,
  requireOrganizationAdmin,
  async (req: OrgRequest, res: Response) => {
    const { plan_name } = req.body;
    const organization = req.organization!;

    try {
      // Get plan details
      const plan = await new Promise<SubscriptionPlan>((resolve, reject) => {
        db.get(
          'SELECT * FROM subscription_plans WHERE name = ? AND is_active = 1',
          [plan_name],
          (err, row: SubscriptionPlan) => {
            if (err) reject(err);
            else if (!row) reject(new Error('Plan not found'));
            else resolve(row);
          }
        );
      });

      if (!plan.stripe_price_id) {
        return res.status(400).json({
          error: 'Stripe integration not configured for this plan. Please contact support.',
        });
      }

      // Create or get Stripe customer
      let customerId = organization.stripe_customer_id;
      if (!customerId) {
        const user = await new Promise<any>((resolve, reject) => {
          db.get('SELECT * FROM users WHERE id = ?', [req.userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        const customer = await createCustomer(
          user.email,
          `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
        );

        customerId = customer.id;

        // Save customer ID
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE organizations SET stripe_customer_id = ? WHERE id = ?',
            [customerId, organization.id],
            (err) => {
              if (err) reject(err);
              else resolve(null);
            }
          );
        });
      }

      // Create checkout session
      const session = await createCheckoutSession(
        customerId,
        plan.stripe_price_id,
        organization.id,
        `${process.env.APP_URL}/organizations/${organization.id}/settings?session_id={CHECKOUT_SESSION_ID}`,
        `${process.env.APP_URL}/organizations/${organization.id}/settings?canceled=true`
      );

      logActivity(
        'checkout_session_created',
        req.userId,
        organization.id,
        'subscription',
        undefined,
        { plan_name, session_id: session.id },
        req.ip
      );

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error: any) {
      console.error('Checkout error:', error);
      res.status(500).json({ error: error.message || 'Error creating checkout session' });
    }
  }
);

// Create portal session
router.post(
  '/portal/:organizationId',
  authenticateToken,
  requireOrganization,
  requireOrganizationMember,
  requireOrganizationAdmin,
  async (req: OrgRequest, res: Response) => {
    const organization = req.organization!;

    if (!organization.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    try {
      const session = await createPortalSession(
        organization.stripe_customer_id,
        `${process.env.APP_URL}/organizations/${organization.id}/settings`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error('Portal error:', error);
      res.status(500).json({ error: 'Error creating portal session' });
    }
  }
);

// Webhook handler for Stripe events
router.post('/webhook', async (req, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const { constructWebhookEvent } = await import('../services/stripeService');
    const event = constructWebhookEvent(req.body, sig);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const organizationId = parseInt(session.metadata.organization_id);

        // Update organization subscription
        db.run(
          `UPDATE organizations SET
           subscription_status = 'active',
           stripe_subscription_id = ?,
           updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [session.subscription, organizationId],
          (err) => {
            if (err) console.error('Error updating subscription:', err);
          }
        );

        logActivity(
          'subscription_activated',
          undefined,
          organizationId,
          'subscription',
          undefined,
          { subscription_id: session.subscription }
        );
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;

        db.get(
          'SELECT id FROM organizations WHERE stripe_subscription_id = ?',
          [subscription.id],
          (err, org: any) => {
            if (org) {
              const status = subscription.status;
              db.run(
                'UPDATE organizations SET subscription_status = ? WHERE id = ?',
                [status, org.id],
                (err) => {
                  if (err) console.error('Error updating subscription status:', err);
                }
              );
            }
          }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;

        db.get(
          'SELECT id FROM organizations WHERE stripe_subscription_id = ?',
          [subscription.id],
          (err, org: any) => {
            if (org) {
              db.run(
                `UPDATE organizations SET
                 subscription_plan = 'free',
                 subscription_status = 'canceled',
                 stripe_subscription_id = NULL
                 WHERE id = ?`,
                [org.id],
                (err) => {
                  if (err) console.error('Error canceling subscription:', err);
                }
              );

              logActivity(
                'subscription_canceled',
                undefined,
                org.id,
                'subscription',
                undefined,
                { subscription_id: subscription.id }
              );
            }
          }
        );
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;

        db.get(
          'SELECT id FROM organizations WHERE stripe_customer_id = ?',
          [invoice.customer],
          (err, org: any) => {
            if (org) {
              db.run(
                `INSERT INTO payments (organization_id, amount, currency, status, stripe_payment_id, stripe_invoice_id, description)
                 VALUES (?, ?, ?, 'succeeded', ?, ?, ?)`,
                [
                  org.id,
                  invoice.amount_paid / 100,
                  invoice.currency,
                  invoice.payment_intent,
                  invoice.id,
                  'Subscription payment',
                ],
                (err) => {
                  if (err) console.error('Error recording payment:', err);
                }
              );
            }
          }
        );
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

export default router;
