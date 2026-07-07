import { storage } from "./storage";
import { getUncachableStripeClient } from "./stripeClient";
import type Stripe from "stripe";

export const TRIAL_DAYS = 14;
export const INTRO_COUPON_ID = "tempus-first-month-50off";

export class StripeService {
  async createCustomer(email: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    return stripe.customers.create({ email, metadata: { userId } });
  }

  /**
   * Resolves the intro coupon ID if it exists and is valid in Stripe.
   * Returns undefined if not found or invalid so checkout still proceeds.
   */
  async resolveIntroCoupon(): Promise<string | undefined> {
    try {
      const stripe = await getUncachableStripeClient();
      const coupon = await stripe.coupons.retrieve(INTRO_COUPON_ID);
      return coupon.valid ? coupon.id : undefined;
    } catch {
      return undefined;
    }
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    options?: { trialDays?: number; couponId?: string },
  ) {
    const stripe = await getUncachableStripeClient();

    const params: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: options?.trialDays ?? TRIAL_DAYS,
      },
    };

    if (options?.couponId) {
      params.discounts = [{ coupon: options.couponId }];
    }

    return stripe.checkout.sessions.create(params);
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getProduct(productId: string) {
    return storage.getProduct(productId);
  }

  async getSubscription(subscriptionId: string) {
    return storage.getSubscription(subscriptionId);
  }
}

export const stripeService = new StripeService();
