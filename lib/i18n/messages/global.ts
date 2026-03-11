export type GlobalMessages = {
  language: {
    label: string;
  };
  header: {
    home: string;
    features: string;
    pricing: string;
    packs: string;
    signIn: string;
    signUp: string;
    dashboard: string;
    admin: string;
    signOut: string;
  };
  home: {
    badge: string;
    hero: {
      titleLine1: string;
      titleLine2: string;
      description: string;
      deployButton: string;
    };
    features: {
      reactTitle: string;
      reactDescription: string;
      dbTitle: string;
      dbDescription: string;
      stripeTitle: string;
      stripeDescription: string;
    };
    cta: {
      title: string;
      description: string;
      viewCodeButton: string;
    };
    showcase: {
      sectionTitle: string;
      securityLabel: string;
      securityValue: string;
      billingLabel: string;
    };
  };
  pricing: {
    headline: string;
    trialLabel: string;
    perUserLabel: string;
    perOrganizationLabel: string;
    userPlansTitle: string;
    userPlansDescription: string;
    organizationPlansTitle: string;
    organizationPlansDescription: string;
    noUserPlansConfigured: string;
    noOrganizationPlansConfigured: string;
    noPaymentConfigured: string;
    noPlansConfigured: string;
    noFeatures: string;
    discountLabel: string;
    paymentMethodLabel: string;
    paymentMethodStripe: string;
    paymentMethodPayPal: string;
    changeModeLabel: string;
    changeModeImmediate: string;
    changeModePeriodEnd: string;
    changeModeImmediateHint: string;
    changeModePeriodEndHint: string;
    changeModeUnavailable: string;
    currentPlanLabel: string;
    upgradePlanLabel: string;
    downgradePlanLabel: string;
    lateralPlanLabel: string;
    selfServiceUnavailableLabel: string;
    intervals: {
      daily: string;
      weekly: string;
      monthly: string;
      quarterly: string;
      semiannual: string;
      yearly: string;
    };
    planFeatures: {
      base: string[];
      plus: string[];
    };
  };
  submitButton: {
    loading: string;
    comingSoon: string;
    getStarted: string;
  };
  paypal: {
    missingSubscriptionId: string;
    unableToConfirm: string;
    canceled: string;
    failed: string;
    unavailable: string;
    unableToLoad: string;
  };
  terminal: {
    copyAria: string;
    copiedAria: string;
  };
  notify: {
    dismissAria: string;
    titles: {
      success: string;
      error: string;
      info: string;
      warning: string;
    };
  };
  notFound: {
    title: string;
    description: string;
    backHome: string;
  };
};
