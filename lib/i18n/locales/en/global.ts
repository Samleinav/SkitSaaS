import type { GlobalMessages } from '../../messages/global';

const messages = {
  language: {
    label: 'Language'
  },
  header: {
    home: 'Home',
    features: 'Features',
    pricing: 'Pricing',
    signIn: 'Sign in',
    signUp: 'Sign Up',
    dashboard: 'Dashboard',
    admin: 'Admin',
    signOut: 'Sign out'
  },
  home: {
    badge: 'SaaS Starter Kit',
    hero: {
      titleLine1: 'Build Your SaaS',
      titleLine2: 'Faster Than Ever',
      description: 'Launch your SaaS product in record time with our powerful, ready-to-use template. Packed with modern technologies and essential integrations.',
      deployButton: 'Deploy your own'
    },
    features: {
      reactTitle: 'Next.js and React',
      reactDescription: 'Leverage the power of modern web technologies for optimal performance and developer experience.',
      dbTitle: 'Postgres and Drizzle ORM',
      dbDescription: 'Robust database solution with an intuitive ORM for efficient data management and scalability.',
      stripeTitle: 'Stripe + PayPal Payments',
      stripeDescription: 'Accept cards with Stripe and subscriptions with PayPal using built-in checkout and webhook flows.'
    },
    cta: {
      title: 'Ready to launch your SaaS?',
      description: "Our template provides everything you need to get your SaaS up and running quickly. Don't waste time on boilerplate - focus on what makes your product unique.",
      viewCodeButton: 'View the code'
    },
    showcase: {
      sectionTitle: 'Build fast. Ship clean. Scale without rewrites.',
      securityLabel: 'Security',
      securityValue: 'Auth + RBAC',
      billingLabel: 'Billing'
    }
  },
  pricing: {
    headline: 'Clear subscriptions for individual work and team growth.',
    trialLabel: '{days} day free trial',
    perUserLabel: 'per user / {interval}',
    perOrganizationLabel: 'per organization / {interval}',
    userPlansTitle: 'User plans',
    userPlansDescription: 'For individual work, personal spaces, and lighter operations with full plan visibility.',
    organizationPlansTitle: 'Organization plans',
    organizationPlansDescription: 'For teams that need collaboration, control, and a base built to scale.',
    noUserPlansConfigured: 'No user plans configured yet.',
    noOrganizationPlansConfigured: 'No organization plans configured yet.',
    noPaymentConfigured: 'This plan does not have an available checkout yet.',
    noPlansConfigured: 'No plans are published yet. Configure templates from Admin.',
    noFeatures: 'No public features are configured for this plan.',
    discountLabel: 'Save {percent}%',
    paymentMethodLabel: 'Payment method',
    paymentMethodStripe: 'Stripe',
    paymentMethodPayPal: 'PayPal',
    changeModeLabel: 'Change timing',
    changeModeImmediate: 'Apply now',
    changeModePeriodEnd: 'At period end',
    changeModeImmediateHint: 'Activate the new plan as soon as checkout completes.',
    changeModePeriodEndHint: 'Schedule the change so it starts on {date}.',
    changeModeUnavailable: 'Period-end scheduling is not available yet.',
    currentPlanLabel: 'Current plan',
    upgradePlanLabel: 'Upgrade',
    downgradePlanLabel: 'Downgrade',
    lateralPlanLabel: 'Switch plan',
    selfServiceUnavailableLabel: 'This plan scope requires assisted activation; self-service checkout is not available yet.',
    intervals: {
      daily: 'day',
      weekly: 'week',
      monthly: 'month',
      quarterly: 'quarter',
      semiannual: '6 months',
      yearly: 'year'
    },
    planFeatures: {
      base: [
        'Unlimited Usage',
        'Unlimited Workspace Members',
        'Email Support'
      ],
      plus: [
        'Everything in Base, and:',
        'Early Access to New Features',
        '24/7 Support + Slack Access'
      ]
    }
  },
  submitButton: {
    loading: 'Loading...',
    comingSoon: 'Unavailable',
    getStarted: 'Choose plan'
  },
  paypal: {
    missingSubscriptionId: 'PayPal did not return a subscription ID.',
    unableToConfirm: 'Unable to confirm PayPal subscription.',
    canceled: 'PayPal checkout was canceled.',
    failed: 'PayPal checkout failed. Please try again.',
    unavailable: 'PayPal is not available for this account.',
    unableToLoad: 'Unable to load PayPal checkout.'
  },
  terminal: {
    copyAria: 'Copy to clipboard',
    copiedAria: 'Copied'
  },
  notify: {
    dismissAria: 'Dismiss notification',
    titles: {
      success: 'Success',
      error: 'Error',
      info: 'Info',
      warning: 'Warning'
    }
  },
  notFound: {
    title: 'Page Not Found',
    description: 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
    backHome: 'Back to Home'
  }
} satisfies GlobalMessages;

export default messages;
