import React, { useState } from 'react';
import { checkoutStripeApi } from '../services/api.js';
import { User, Subscription } from '../types.js';
import {
  Check,
  Zap,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface PricingViewProps {
  user: User | null;
  subscription: Subscription | null;
  onUpgradeSuccess: (
    user: User,
    subscription: Subscription
  ) => void;
}

type Plan = 'pro' | 'agency';
type BillingCycle = 'monthly' | 'annual';

export const PricingView: React.FC<PricingViewProps> = ({
  user,
  subscription,
  onUpgradeSuccess,
}) => {
  const [billingCycle, setBillingCycle] =
    useState<BillingCycle>('monthly');

  const [loadingPlan, setLoadingPlan] =
    useState<Plan | null>(null);

  const [successMessage, setSuccessMessage] =
    useState('');

  const [errorMessage, setErrorMessage] =
    useState('');

  const handleCheckout = async (plan: Plan) => {
  if (!user) {
    setErrorMessage(
      'Please log in before upgrading your plan.'
    );
    return;
  }

  setLoadingPlan(plan);
  setSuccessMessage('');
  setErrorMessage('');

  try {
    const res = await checkoutStripeApi(plan);

    console.log('Stripe checkout response:', res);

    if (res?.url) {
      window.location.href = res.url;
      return;
    }

    throw new Error(
      'Stripe checkout URL was not returned by the server.'
    );
  } catch (err: any) {
    console.error(
      'Stripe checkout error:',
      err
    );

    setErrorMessage(
      err?.message ||
        'Unable to start checkout. Please try again.'
    );
  } finally {
    setLoadingPlan(null);
  }
};

  const isProActive =
    subscription?.plan === 'pro';

  const isAgencyActive =
    subscription?.plan === 'agency';

  const isFree =
    !isProActive && !isAgencyActive;

  const proPrice =
    billingCycle === 'monthly' ? 29 : 23;

  const agencyPrice =
    billingCycle === 'monthly' ? 79 : 63;

  const proAnnualTotal = 23 * 12;
  const agencyAnnualTotal = 63 * 12;

  return (
    <div className="w-full space-y-16 pb-16">

      {/* =====================================================
          HEADER
      ====================================================== */}
      <div className="text-center max-w-3xl mx-auto">

        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 border border-violet-500/20 mb-4">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span>
            Simple, Transparent SaaS Pricing
          </span>
        </span>

        <h1 className="text-3xl font-black text-white sm:text-4xl tracking-tight">
          Supercharge Your Content Reach with LumoClip
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 mt-3 leading-relaxed">
          Repurpose long YouTube podcasts, tutorials,
          and interviews into high-performing short clips.
        </p>

        {/* =================================================
            BILLING TOGGLE
        ================================================== */}
        <div className="mt-8 inline-flex items-center rounded-2xl bg-zinc-900 border border-zinc-800 p-1">

          <button
            type="button"
            onClick={() =>
              setBillingCycle('monthly')
            }
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              billingCycle === 'monthly'
                ? 'bg-violet-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Monthly Billing
          </button>

          <button
            type="button"
            onClick={() =>
              setBillingCycle('annual')
            }
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              billingCycle === 'annual'
                ? 'bg-violet-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Annual Billing</span>

            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-300 font-extrabold uppercase">
              Save 20%
            </span>
          </button>

        </div>
      </div>

      {/* =====================================================
          SUCCESS MESSAGE
      ====================================================== */}
      {successMessage && (
        <div className="max-w-3xl mx-auto rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {successMessage}
        </div>
      )}

      {/* =====================================================
          ERROR MESSAGE
      ====================================================== */}
      {errorMessage && (
        <div className="max-w-3xl mx-auto rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {/* =====================================================
          PRICING CARDS
      ====================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">

        {/* =================================================
            FREE PLAN
        ================================================== */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 flex flex-col justify-between shadow-xl">

          <div>

            <div className="flex items-center justify-between mb-4">

              <h3 className="text-lg font-bold text-white">
                Starter Free
              </h3>

              <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-400 uppercase">
                Free Forever
              </span>

            </div>

            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Perfect for exploring AI short clip
              creation with basic limits.
            </p>

            <div className="mb-6">
              <span className="text-3xl font-black text-white">
                $0
              </span>

              <span className="text-xs text-zinc-500 font-medium">
                {' '}
                / month
              </span>
            </div>

            <ul className="space-y-3 text-xs text-zinc-300 mb-8">

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-violet-400 shrink-0" />
                <span>
                  3 Video Repurposes per month
                </span>
              </li>

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-violet-400 shrink-0" />
                <span>
                  5 Viral Clips per video
                </span>
              </li>

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-violet-400 shrink-0" />
                <span>
                  Standard Subtitle Presets
                </span>
              </li>

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-violet-400 shrink-0" />
                <span>
                  720p Video Exports
                </span>
              </li>

            </ul>

          </div>

          <button
            type="button"
            disabled
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-bold text-zinc-400 cursor-not-allowed"
          >
            {isFree
              ? 'Current Plan'
              : 'Free Plan'}
          </button>

        </div>

        {/* =================================================
            PRO CREATOR
        ================================================== */}
        <div className="relative rounded-3xl border-2 border-violet-500 bg-gradient-to-b from-violet-950/60 via-zinc-950 to-zinc-950 p-8 flex flex-col justify-between shadow-2xl shadow-violet-950/50 md:scale-105">

          {/* Popular Badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-1 text-[10px] font-extrabold uppercase text-white shadow-md whitespace-nowrap">
            Most Popular
          </div>

          <div>

            <div className="flex items-center justify-between mb-4">

              <h3 className="text-lg font-bold text-white flex items-center gap-1.5">

                <Sparkles className="h-4 w-4 text-amber-400" />

                <span>
                  Pro Creator
                </span>

              </h3>

              <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-[10px] font-bold text-violet-300 uppercase">
                50 Credits/Mo
              </span>

            </div>

            <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
              For active creators & podcasters
              publishing consistent daily short content.
            </p>

            {/* Price */}
            <div className="mb-6">

              <span className="text-4xl font-black text-white">
                ${proPrice}
              </span>

              <span className="text-xs text-zinc-400 font-medium">
                {' '}
                / month
              </span>

              {billingCycle === 'annual' && (
                <p className="text-[10px] text-emerald-400 mt-1">
                  Billed annually (${proAnnualTotal}/year)
                </p>
              )}

            </div>

            {/* Features */}
            <ul className="space-y-3 text-xs text-zinc-200 mb-8">

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-amber-400 shrink-0" />

                <span>
                  <strong>50 Credits</strong> added monthly
                </span>
              </li>

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-amber-400 shrink-0" />

                <span>
                  Gemini AI Viral Hook Detection
                </span>
              </li>

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-amber-400 shrink-0" />

                <span>
                  Animated Karaoke & Highlight Subtitles
                </span>
              </li>

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-amber-400 shrink-0" />

                <span>
                  TikTok, Reels & Shorts Captions
                </span>
              </li>

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-amber-400 shrink-0" />

                <span>
                  Full 1080p HD 9:16 Video Exports
                </span>
              </li>

            </ul>

          </div>

          {/* Checkout Button */}
          <button
            type="button"
            onClick={() =>
              handleCheckout('pro')
            }
            disabled={
              loadingPlan === 'pro' ||
              isProActive
            }
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold transition shadow-lg ${
              isProActive
                ? 'bg-zinc-800 text-zinc-400 cursor-default'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-600/30 hover:from-violet-500 hover:to-indigo-500 active:scale-95'
            }`}
          >

            {loadingPlan === 'pro' ? (

              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />

            ) : isProActive ? (

              <span>
                Current Active Plan
              </span>

            ) : (

              <>
                <span>
                  Upgrade to Pro (${proPrice})
                </span>

                <ArrowRight className="h-4 w-4" />
              </>

            )}

          </button>

        </div>

        {/* =================================================
            AGENCY PLAN
        ================================================== */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 flex flex-col justify-between shadow-xl">

          <div>

            <div className="flex items-center justify-between mb-4">

              <h3 className="text-lg font-bold text-white">
                Agency / Team
              </h3>

              <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300 uppercase">
                200 Credits/Mo
              </span>

            </div>

            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              For marketing agencies, podcast
              networks, and multi-channel teams.
            </p>

            {/* Price */}
            <div className="mb-6">

              <span className="text-3xl font-black text-white">
                ${agencyPrice}
              </span>

              <span className="text-xs text-zinc-500 font-medium">
                {' '}
                / month
              </span>

              {billingCycle === 'annual' && (
                <p className="text-[10px] text-emerald-400 mt-1">
                  Billed annually (${agencyAnnualTotal}/year)
                </p>
              )}

            </div>

            {/* Features */}
            <ul className="space-y-3 text-xs text-zinc-300 mb-8">

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />

                <span>
                  <strong>200 Credits</strong> added monthly
                </span>
              </li>

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />

                <span>
                  Custom Brand Subtitle Fonts & Colors
                </span>
              </li>

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />

                <span>
                  Priority Server Processing Queue
                </span>
              </li>

              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />

                <span>
                  Bulk Zip Video Export
                </span>
              </li>

            </ul>

          </div>

          {/* Checkout */}
          <button
            type="button"
            onClick={() =>
              handleCheckout('agency')
            }
            disabled={
              loadingPlan === 'agency' ||
              isAgencyActive
            }
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition ${
              isAgencyActive
                ? 'bg-zinc-800 text-zinc-400 cursor-default'
                : 'bg-zinc-800 text-white hover:bg-zinc-700 active:scale-95'
            }`}
          >

            {loadingPlan === 'agency' ? (

              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />

            ) : isAgencyActive ? (

              <span>
                Current Active Plan
              </span>

            ) : (

              <>
                <span>
                  Upgrade to Agency (${agencyPrice})
                </span>

                <ArrowRight className="h-4 w-4" />
              </>

            )}

          </button>

        </div>

      </div>

      {/* =====================================================
          FAQ
      ====================================================== */}
      <div className="max-w-3xl mx-auto">

        <h2 className="text-center text-3xl font-bold text-white">
          Frequently Asked Questions
        </h2>

        <div className="mt-10 space-y-5">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">

            <h3 className="font-semibold text-white">
              Can I cancel anytime?
            </h3>

            <p className="mt-2 text-sm text-zinc-400">
              Yes. Cancel anytime from your Billing
              page. No long-term contracts.
            </p>

          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">

            <h3 className="font-semibold text-white">
              Do unused credits roll over?
            </h3>

            <p className="mt-2 text-sm text-zinc-400">
              Unused credits expire at the end of
              each billing cycle.
            </p>

          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">

            <h3 className="font-semibold text-white">
              Which payment methods are supported?
            </h3>

            <p className="mt-2 text-sm text-zinc-400">
              Visa, Mastercard, American Express
              and many more through Stripe.
            </p>

          </div>

        </div>

      </div>

      {/* =====================================================
          CONTACT SALES CTA
      ====================================================== */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-10 text-center">

        <h2 className="text-3xl font-bold text-white">
          Need help choosing a plan?
        </h2>

        <p className="mt-3 text-zinc-400">
          Our team will help you choose the
          perfect plan for your workflow.
        </p>

        <button
          type="button"
          onClick={() => {
            window.location.href =
              'mailto:sales@lumoclip.com';
          }}
          className="mt-6 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-500 transition active:scale-95"
        >
          Contact Sales
        </button>

      </div>

    </div>
  );
};