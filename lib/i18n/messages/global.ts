import type { AppLocale } from '@/lib/i18n/config';

export type GlobalMessages = {
  language: {
    label: string;
    english: string;
    spanish: string;
  };
  header: {
    home: string;
    features: string;
    pricing: string;
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

export const globalMessages: Record<AppLocale, GlobalMessages> = {
  en: {
    language: {
      label: 'Language',
      english: 'English',
      spanish: 'Spanish'
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
        description:
          'Launch your SaaS product in record time with our powerful, ready-to-use template. Packed with modern technologies and essential integrations.',
        deployButton: 'Deploy your own'
      },
      features: {
        reactTitle: 'Next.js and React',
        reactDescription:
          'Leverage the power of modern web technologies for optimal performance and developer experience.',
        dbTitle: 'Postgres and Drizzle ORM',
        dbDescription:
          'Robust database solution with an intuitive ORM for efficient data management and scalability.',
        stripeTitle: 'Stripe + PayPal Payments',
        stripeDescription:
          'Accept cards with Stripe and subscriptions with PayPal using built-in checkout and webhook flows.'
      },
      cta: {
        title: 'Ready to launch your SaaS?',
        description:
          "Our template provides everything you need to get your SaaS up and running quickly. Don't waste time on boilerplate - focus on what makes your product unique.",
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
      headline: 'Plans built for users and organizations.',
      trialLabel: '{days} day free trial',
      perUserLabel: 'per user / {interval}',
      perOrganizationLabel: 'per organization / {interval}',
      userPlansTitle: 'User plans',
      userPlansDescription:
        'Plans designed for individual users and personal workspaces.',
      organizationPlansTitle: 'Organization plans',
      organizationPlansDescription:
        'Plans designed for teams and collaborative organizations.',
      noUserPlansConfigured: 'No user plans configured yet.',
      noOrganizationPlansConfigured:
        'No organization plans configured yet.',
      noPaymentConfigured: 'No payment method is configured for this plan yet.',
      noPlansConfigured: 'No plans configured yet. Create templates from Admin.',
      noFeatures: 'No custom features configured.',
      discountLabel: 'Save {percent}%',
      paymentMethodLabel: 'Payment method',
      paymentMethodStripe: 'Stripe',
      paymentMethodPayPal: 'PayPal',
      changeModeLabel: 'Change timing',
      changeModeImmediate: 'Apply now',
      changeModePeriodEnd: 'At period end',
      changeModeImmediateHint: 'Start the new plan immediately after checkout.',
      changeModePeriodEndHint: 'Schedule the new plan to start on {date}.',
      changeModeUnavailable: 'Period-end scheduling is not available yet.',
      currentPlanLabel: 'Current plan',
      upgradePlanLabel: 'Upgrade',
      downgradePlanLabel: 'Downgrade',
      lateralPlanLabel: 'Switch plan',
      selfServiceUnavailableLabel:
        'Self-service checkout for this plan scope is not available yet.',
      intervals: {
        daily: 'day',
        weekly: 'week',
        monthly: 'month',
        quarterly: 'quarter',
        semiannual: '6 months',
        yearly: 'year'
      },
      planFeatures: {
        base: ['Unlimited Usage', 'Unlimited Workspace Members', 'Email Support'],
        plus: [
          'Everything in Base, and:',
          'Early Access to New Features',
          '24/7 Support + Slack Access'
        ]
      }
    },
    submitButton: {
      loading: 'Loading...',
      comingSoon: 'Coming Soon',
      getStarted: 'Get Started'
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
      description:
        'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
      backHome: 'Back to Home'
    }
  },
  es: {
    language: {
      label: 'Idioma',
      english: 'Ingles',
      spanish: 'Espanol'
    },
    header: {
      home: 'Inicio',
      features: 'Funciones',
      pricing: 'Precios',
      signIn: 'Iniciar sesion',
      signUp: 'Crear cuenta',
      dashboard: 'Panel',
      admin: 'Admin',
      signOut: 'Cerrar sesion'
    },
    home: {
      badge: 'Kit inicial SaaS',
      hero: {
        titleLine1: 'Construye tu SaaS',
        titleLine2: 'Mas rapido que nunca',
        description:
          'Lanza tu producto SaaS en tiempo record con nuestro template listo para usar. Incluye tecnologias modernas e integraciones esenciales.',
        deployButton: 'Despliega el tuyo'
      },
      features: {
        reactTitle: 'Next.js y React',
        reactDescription:
          'Aprovecha el poder de tecnologias web modernas para mejor rendimiento y experiencia de desarrollo.',
        dbTitle: 'Postgres y Drizzle ORM',
        dbDescription:
          'Una solucion robusta de base de datos con un ORM intuitivo para gestionar datos y escalar.',
        stripeTitle: 'Pagos con Stripe + PayPal',
        stripeDescription:
          'Acepta tarjetas con Stripe y suscripciones con PayPal con flujos de checkout y webhooks incluidos.'
      },
      cta: {
        title: 'Listo para lanzar tu SaaS?',
        description:
          'Nuestro template trae todo lo necesario para arrancar rapido. No pierdas tiempo en boilerplate y enfocate en tu producto.',
        viewCodeButton: 'Ver el codigo'
      },
      showcase: {
        sectionTitle:
          'Construye rapido. Publica limpio. Escala sin reescribir todo.',
        securityLabel: 'Seguridad',
        securityValue: 'Auth + RBAC',
        billingLabel: 'Facturacion'
      }
    },
    pricing: {
      headline: 'Planes pensados para usuarios y organizaciones.',
      trialLabel: '{days} dias de prueba gratis',
      perUserLabel: 'por usuario / {interval}',
      perOrganizationLabel: 'por organizacion / {interval}',
      userPlansTitle: 'Planes para usuario',
      userPlansDescription:
        'Planes pensados para uso individual y espacios personales.',
      organizationPlansTitle: 'Planes para organizacion',
      organizationPlansDescription:
        'Planes pensados para equipos y organizaciones colaborativas.',
      noUserPlansConfigured: 'Aun no hay planes de usuario configurados.',
      noOrganizationPlansConfigured:
        'Aun no hay planes de organizacion configurados.',
      noPaymentConfigured: 'Aun no hay metodo de pago configurado para este plan.',
      noPlansConfigured:
        'Aun no hay planes configurados. Crea plantillas desde Admin.',
      noFeatures: 'Sin funcionalidades personalizadas configuradas.',
      discountLabel: 'Ahorra {percent}%',
      paymentMethodLabel: 'Metodo de pago',
      paymentMethodStripe: 'Stripe',
      paymentMethodPayPal: 'PayPal',
      changeModeLabel: 'Momento del cambio',
      changeModeImmediate: 'Aplicar ahora',
      changeModePeriodEnd: 'Al final del periodo',
      changeModeImmediateHint: 'El nuevo plan inicia inmediatamente despues del checkout.',
      changeModePeriodEndHint: 'Programa el nuevo plan para iniciar el {date}.',
      changeModeUnavailable: 'El cambio al final del periodo aun no esta disponible.',
      currentPlanLabel: 'Plan actual',
      upgradePlanLabel: 'Upgrade',
      downgradePlanLabel: 'Downgrade',
      lateralPlanLabel: 'Cambiar plan',
      selfServiceUnavailableLabel:
        'El checkout self-service para este scope de plan aun no esta disponible.',
      intervals: {
        daily: 'dia',
        weekly: 'semana',
        monthly: 'mes',
        quarterly: 'trimestre',
        semiannual: '6 meses',
        yearly: 'ano'
      },
      planFeatures: {
        base: [
          'Uso ilimitado',
          'Miembros ilimitados en el equipo',
          'Soporte por correo'
        ],
        plus: [
          'Todo lo de Base, y ademas:',
          'Acceso anticipado a nuevas funcionalidades',
          'Soporte 24/7 + acceso a Slack'
        ]
      }
    },
    submitButton: {
      loading: 'Cargando...',
      comingSoon: 'Muy pronto',
      getStarted: 'Comenzar'
    },
    paypal: {
      missingSubscriptionId: 'PayPal no devolvio un ID de suscripcion.',
      unableToConfirm: 'No se pudo confirmar la suscripcion de PayPal.',
      canceled: 'El checkout de PayPal fue cancelado.',
      failed: 'El checkout de PayPal fallo. Intenta de nuevo.',
      unavailable: 'PayPal no esta disponible para esta cuenta.',
      unableToLoad: 'No se pudo cargar el checkout de PayPal.'
    },
    terminal: {
      copyAria: 'Copiar al portapapeles',
      copiedAria: 'Copiado'
    },
    notify: {
      dismissAria: 'Cerrar notificacion',
      titles: {
        success: 'Exito',
        error: 'Error',
        info: 'Info',
        warning: 'Advertencia'
      }
    },
    notFound: {
      title: 'Pagina no encontrada',
      description:
        'La pagina que buscas pudo haber sido eliminada, cambiada de nombre o no esta disponible temporalmente.',
      backHome: 'Volver al inicio'
    }
  }
};
