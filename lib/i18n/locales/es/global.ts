import type { GlobalMessages } from '../../messages/global';

const messages = {
  language: {
    label: 'Idioma'
  },
  header: {
    home: 'Inicio',
    features: 'Funciones',
    pricing: 'Precios',
    packs: 'Packs',
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
      description: 'Lanza tu producto SaaS en tiempo record con nuestro template listo para usar. Incluye tecnologias modernas e integraciones esenciales.',
      deployButton: 'Despliega el tuyo'
    },
    features: {
      reactTitle: 'Next.js y React',
      reactDescription: 'Aprovecha el poder de tecnologias web modernas para mejor rendimiento y experiencia de desarrollo.',
      dbTitle: 'Postgres y Drizzle ORM',
      dbDescription: 'Una solucion robusta de base de datos con un ORM intuitivo para gestionar datos y escalar.',
      stripeTitle: 'Pagos con Stripe + PayPal',
      stripeDescription: 'Acepta tarjetas con Stripe y suscripciones con PayPal con flujos de checkout y webhooks incluidos.'
    },
    cta: {
      title: 'Listo para lanzar tu SaaS?',
      description: 'Nuestro template trae todo lo necesario para arrancar rapido. No pierdas tiempo en boilerplate y enfocate en tu producto.',
      viewCodeButton: 'Ver el codigo'
    },
    showcase: {
      sectionTitle: 'Construye rapido. Publica limpio. Escala sin reescribir todo.',
      securityLabel: 'Seguridad',
      securityValue: 'Auth + RBAC',
      billingLabel: 'Facturacion'
    }
  },
  pricing: {
    headline: 'Suscripciones claras para trabajo individual y crecimiento en equipo.',
    trialLabel: '{days} dias de prueba gratis',
    perUserLabel: 'por usuario / {interval}',
    perOrganizationLabel: 'por organizacion / {interval}',
    userPlansTitle: 'Planes para usuario',
    userPlansDescription: 'Para trabajo individual, espacios personales y operaciones ligeras con visibilidad total del plan.',
    organizationPlansTitle: 'Planes para organizacion',
    organizationPlansDescription: 'Para equipos que necesitan colaboracion, control y una base preparada para crecer.',
    noUserPlansConfigured: 'Aun no hay planes de usuario configurados.',
    noOrganizationPlansConfigured: 'Aun no hay planes de organizacion configurados.',
    noPaymentConfigured: 'Este plan aun no tiene un checkout disponible.',
    noPlansConfigured: 'Aun no hay planes publicados. Configura las plantillas desde Admin.',
    noFeatures: 'Sin funcionalidades publicas configuradas en este plan.',
    discountLabel: 'Ahorra {percent}%',
    paymentMethodLabel: 'Metodo de pago',
    paymentMethodStripe: 'Stripe',
    paymentMethodPayPal: 'PayPal',
    changeModeLabel: 'Momento del cambio',
    changeModeImmediate: 'Aplicar ahora',
    changeModePeriodEnd: 'Al final del periodo',
    changeModeImmediateHint: 'El nuevo plan se activa apenas finaliza el checkout.',
    changeModePeriodEndHint: 'Programa el cambio para que empiece el {date}.',
    changeModeUnavailable: 'El cambio al final del periodo aun no esta disponible.',
    currentPlanLabel: 'Plan actual',
    upgradePlanLabel: 'Upgrade',
    downgradePlanLabel: 'Downgrade',
    lateralPlanLabel: 'Cambiar plan',
    selfServiceUnavailableLabel: 'Este alcance de plan requiere activacion asistida; el checkout self-service aun no esta disponible.',
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
    comingSoon: 'No disponible',
    getStarted: 'Seleccionar plan'
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
    description: 'La pagina que buscas pudo haber sido eliminada, cambiada de nombre o no esta disponible temporalmente.',
    backHome: 'Volver al inicio'
  }
} satisfies GlobalMessages;

export default messages;
