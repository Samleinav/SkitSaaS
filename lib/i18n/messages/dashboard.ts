import type { AppLocale } from '@/lib/i18n/config';

export type DashboardMessages = {
  language: {
    label: string;
    english: string;
    spanish: string;
  };
  layout: {
    settings: string;
    toggleSidebar: string;
    nav: {
      team: string;
      general: string;
      activity: string;
      security: string;
      subscriptions: string;
    };
  };
  team: {
    title: string;
    subscription: {
      title: string;
      currentPlan: string;
      unknown: string;
      free: string;
      billedMonthly: string;
      trialPeriod: string;
      noActiveSubscription: string;
      manage: string;
      cancel: string;
    };
    members: {
      title: string;
      unknownUser: string;
      noMembers: string;
      remove: string;
      removing: string;
      confirmRemoveTitle: string;
      confirmRemoveDescription: string;
      confirm: string;
      cancel: string;
    };
    invite: {
      title: string;
      emailLabel: string;
      emailPlaceholder: string;
      roleLabel: string;
      member: string;
      owner: string;
      inviting: string;
      inviteMember: string;
      ownerRequired: string;
    };
  };
  general: {
    title: string;
    accountInformation: string;
    name: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    saving: string;
    saveChanges: string;
  };
  subscriptions: {
    title: string;
    description: string;
    summary: {
      organizations: string;
      paymentEvents: string;
      invoices: string;
    };
    teamFilter: {
      title: string;
      label: string;
      allTeams: string;
      apply: string;
      clear: string;
      selected: string;
      allDescription: string;
    };
    userPlan: {
      title: string;
      noSubscription: string;
      activeSubscription: string;
      plan: string;
      interval: string;
      amount: string;
      source: string;
      sourceManual: string;
      sourceSystem: string;
      changePlanImmediate: string;
      changePlanPeriodEnd: string;
      cancel: string;
      cancelPending: string;
      confirmCancelTitle: string;
      confirmCancelDescription: string;
      confirmCancel: string;
      keep: string;
    };
    organizationPolicy: {
      title: string;
      allowMultiOrganizations: string;
      maxByConfig: string;
      maxBySubscription: string;
      effectiveLimit: string;
      currentOrganizations: string;
      yes: string;
      no: string;
      unlimited: string;
    };
    organizations: {
      title: string;
      empty: string;
      columns: {
        organization: string;
        role: string;
        plan: string;
        provider: string;
        status: string;
        joinedAt: string;
        actions: string;
      };
      owner: string;
      member: string;
      noPlan: string;
      noProvider: string;
      noStatus: string;
      manage: string;
      managePending: string;
      changePlanImmediate: string;
      changePlanPeriodEnd: string;
      cancelPaypal: string;
      cancelPaypalPending: string;
      confirmCancelTitle: string;
      confirmCancelDescription: string;
      confirmCancel: string;
      keep: string;
    };
    logs: {
      title: string;
      description: string;
      empty: string;
      filterPlaceholder: string;
      columns: {
        date: string;
        scope: string;
        provider: string;
        status: string;
        event: string;
        amount: string;
        paymentRef: string;
        orderRef: string;
      };
      accountScope: string;
      unknownScope: string;
    };
    invoices: {
      title: string;
      description: string;
      empty: string;
      filterPlaceholder: string;
      columns: {
        date: string;
        scope: string;
        plan: string;
        provider: string;
        amount: string;
        reference: string;
      };
    };
    statuses: {
      active: string;
      trialing: string;
      unpaid: string;
      canceled: string;
      free: string;
      pending: string;
      received: string;
      failed: string;
    };
    intervals: {
      daily: string;
      weekly: string;
      monthly: string;
      quarterly: string;
      semiannual: string;
      yearly: string;
    };
    table: {
      showingRows: string;
      previous: string;
      next: string;
    };
  };
  security: {
    title: string;
    passwordTitle: string;
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
    updating: string;
    updatePassword: string;
    deleteAccountTitle: string;
    deleteWarning: string;
    confirmPassword: string;
    deleting: string;
    deleteAccount: string;
    confirmDeleteTitle: string;
    confirmDeleteDescription: string;
    confirm: string;
    cancel: string;
  };
  activity: {
    title: string;
    recentActivity: string;
    time: {
      justNow: string;
      minutesAgo: string;
      hoursAgo: string;
      daysAgo: string;
    };
    actions: {
      signUp: string;
      signIn: string;
      signOut: string;
      updatePassword: string;
      deleteAccount: string;
      updateAccount: string;
      createTeam: string;
      removeTeamMember: string;
      inviteTeamMember: string;
      acceptInvitation: string;
      resetPassword: string;
      unknown: string;
    };
    fromIp: string;
    noActivityTitle: string;
    noActivityDescription: string;
  };
};

export const dashboardMessages: Record<AppLocale, DashboardMessages> = {
  en: {
    language: {
      label: 'Language',
      english: 'English',
      spanish: 'Spanish'
    },
    layout: {
      settings: 'Settings',
      toggleSidebar: 'Toggle sidebar',
      nav: {
        team: 'Team',
        general: 'General',
        activity: 'Activity',
        security: 'Security',
        subscriptions: 'Subscriptions'
      }
    },
    team: {
      title: 'Team Settings',
      subscription: {
        title: 'Team Subscription',
        currentPlan: 'Current Plan',
        unknown: 'Unknown',
        free: 'Subscription Free',
        billedMonthly: 'Billed monthly',
        trialPeriod: 'Trial period',
        noActiveSubscription: 'No active subscription',
        manage: 'Manage Subscription',
        cancel: 'Cancel Subscription'
      },
      members: {
        title: 'Team Members',
        unknownUser: 'Unknown User',
        noMembers: 'No team members yet.',
        remove: 'Remove',
        removing: 'Removing...',
        confirmRemoveTitle: 'Remove this team member?',
        confirmRemoveDescription:
          'This person will lose access to the team immediately.',
        confirm: 'Remove member',
        cancel: 'Cancel'
      },
      invite: {
        title: 'Invite Team Member',
        emailLabel: 'Email',
        emailPlaceholder: 'Enter email',
        roleLabel: 'Role',
        member: 'Member',
        owner: 'Owner',
        inviting: 'Inviting...',
        inviteMember: 'Invite Member',
        ownerRequired: 'You must be a team owner to invite new members.'
      }
    },
    general: {
      title: 'General Settings',
      accountInformation: 'Account Information',
      name: 'Name',
      namePlaceholder: 'Enter your name',
      email: 'Email',
      emailPlaceholder: 'Enter your email',
      saving: 'Saving...',
      saveChanges: 'Save Changes'
    },
    subscriptions: {
      title: 'Subscription Management',
      description:
        'Control your account subscription and each organization subscription from one place.',
      summary: {
        organizations: 'Organizations',
        paymentEvents: 'Payment events',
        invoices: 'Invoices'
      },
      teamFilter: {
        title: 'Team filter',
        label: 'View by team',
        allTeams: 'All teams',
        apply: 'Apply',
        clear: 'Clear',
        selected: 'Showing data for: {team}',
        allDescription: 'Showing data for all your teams and account scope.'
      },
      userPlan: {
        title: 'User subscription',
        noSubscription: 'No user subscription assigned.',
        activeSubscription: 'Active user subscription',
        plan: 'Plan',
        interval: 'Interval',
        amount: 'Amount',
        source: 'Source',
        sourceManual: 'Manual assignment',
        sourceSystem: 'Billing system',
        changePlanImmediate: 'Change plan now',
        changePlanPeriodEnd: 'Change plan at period end',
        cancel: 'Cancel user subscription',
        cancelPending: 'Canceling...',
        confirmCancelTitle: 'Cancel your user subscription?',
        confirmCancelDescription:
          'This removes the user-level template assignment immediately.',
        confirmCancel: 'Yes, cancel',
        keep: 'Keep subscription'
      },
      organizationPolicy: {
        title: 'Organization policy and limits',
        allowMultiOrganizations: 'Allow multi organizations',
        maxByConfig: 'Max organizations (app config)',
        maxBySubscription: 'Max organizations (user subscription)',
        effectiveLimit: 'Effective max organizations',
        currentOrganizations: 'Current organizations',
        yes: 'Yes',
        no: 'No',
        unlimited: 'Unlimited'
      },
      organizations: {
        title: 'Organization subscriptions',
        empty: 'No organization memberships found.',
        columns: {
          organization: 'Organization',
          role: 'Role',
          plan: 'Plan',
          provider: 'Provider',
          status: 'Status',
          joinedAt: 'Joined',
          actions: 'Actions'
        },
        owner: 'Owner',
        member: 'Member',
        noPlan: 'No plan',
        noProvider: 'No provider',
        noStatus: 'No status',
        manage: 'Manage',
        managePending: 'Opening...',
        changePlanImmediate: 'Change plan now',
        changePlanPeriodEnd: 'Change plan at period end',
        cancelPaypal: 'Cancel PayPal',
        cancelPaypalPending: 'Canceling...',
        confirmCancelTitle: 'Cancel this PayPal subscription?',
        confirmCancelDescription:
          'This will cancel the organization PayPal subscription and revert to free status.',
        confirmCancel: 'Yes, cancel',
        keep: 'Keep subscription'
      },
      logs: {
        title: 'Payment logs',
        description: 'Recent payment events for your account and organizations.',
        empty: 'No payment events found.',
        filterPlaceholder: 'Filter by scope...',
        columns: {
          date: 'Date',
          scope: 'Scope',
          provider: 'Provider',
          status: 'Status',
          event: 'Event',
          amount: 'Amount',
          paymentRef: 'Payment reference',
          orderRef: 'Order reference'
        },
        accountScope: 'Account',
        unknownScope: 'Unknown scope'
      },
      invoices: {
        title: 'Invoices',
        description: 'Completed payments (invoice-style history).',
        empty: 'No invoices found.',
        filterPlaceholder: 'Filter by scope...',
        columns: {
          date: 'Date',
          scope: 'Scope',
          plan: 'Plan',
          provider: 'Provider',
          amount: 'Amount',
          reference: 'Reference'
        }
      },
      statuses: {
        active: 'Active',
        trialing: 'Trialing',
        unpaid: 'Unpaid',
        canceled: 'Canceled',
        free: 'Free',
        pending: 'Pending',
        received: 'Received',
        failed: 'Failed'
      },
      intervals: {
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        semiannual: 'Semiannual',
        yearly: 'Yearly'
      },
      table: {
        showingRows: 'Showing {shown} of {filtered} rows',
        previous: 'Previous',
        next: 'Next'
      }
    },
    security: {
      title: 'Security Settings',
      passwordTitle: 'Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmNewPassword: 'Confirm New Password',
      updating: 'Updating...',
      updatePassword: 'Update Password',
      deleteAccountTitle: 'Delete Account',
      deleteWarning:
        'Account deletion is non-reversable. Please proceed with caution.',
      confirmPassword: 'Confirm Password',
      deleting: 'Deleting...',
      deleteAccount: 'Delete Account',
      confirmDeleteTitle: 'Delete your account?',
      confirmDeleteDescription:
        'This action is permanent and removes your account data.',
      confirm: 'Delete account',
      cancel: 'Cancel'
    },
    activity: {
      title: 'Activity Log',
      recentActivity: 'Recent Activity',
      time: {
        justNow: 'just now',
        minutesAgo: '{count} minutes ago',
        hoursAgo: '{count} hours ago',
        daysAgo: '{count} days ago'
      },
      actions: {
        signUp: 'You signed up',
        signIn: 'You signed in',
        signOut: 'You signed out',
        updatePassword: 'You changed your password',
        deleteAccount: 'You deleted your account',
        updateAccount: 'You updated your account',
        createTeam: 'You created a new team',
        removeTeamMember: 'You removed a team member',
        inviteTeamMember: 'You invited a team member',
        acceptInvitation: 'You accepted an invitation',
        resetPassword: 'You reset your password',
        unknown: 'Unknown action occurred'
      },
      fromIp: 'from IP',
      noActivityTitle: 'No activity yet',
      noActivityDescription:
        "When you perform actions like signing in or updating your account, they'll appear here."
    }
  },
  es: {
    language: {
      label: 'Idioma',
      english: 'Ingles',
      spanish: 'Espanol'
    },
    layout: {
      settings: 'Configuracion',
      toggleSidebar: 'Abrir menu lateral',
      nav: {
        team: 'Equipo',
        general: 'General',
        activity: 'Actividad',
        security: 'Seguridad',
        subscriptions: 'Suscripciones'
      }
    },
    team: {
      title: 'Configuracion del equipo',
      subscription: {
        title: 'Suscripcion del equipo',
        currentPlan: 'Plan actual',
        unknown: 'Desconocido',
        free: 'Suscripcion gratis',
        billedMonthly: 'Facturacion mensual',
        trialPeriod: 'Periodo de prueba',
        noActiveSubscription: 'Sin suscripcion activa',
        manage: 'Gestionar suscripcion',
        cancel: 'Cancelar suscripcion'
      },
      members: {
        title: 'Miembros del equipo',
        unknownUser: 'Usuario desconocido',
        noMembers: 'Aun no hay miembros en el equipo.',
        remove: 'Eliminar',
        removing: 'Eliminando...',
        confirmRemoveTitle: 'Eliminar este miembro del equipo?',
        confirmRemoveDescription:
          'Esta persona perdera acceso al equipo inmediatamente.',
        confirm: 'Eliminar miembro',
        cancel: 'Cancelar'
      },
      invite: {
        title: 'Invitar miembro al equipo',
        emailLabel: 'Correo',
        emailPlaceholder: 'Ingresa el correo',
        roleLabel: 'Rol',
        member: 'Miembro',
        owner: 'Propietario',
        inviting: 'Invitando...',
        inviteMember: 'Invitar miembro',
        ownerRequired: 'Debes ser owner del equipo para invitar nuevos miembros.'
      }
    },
    general: {
      title: 'Configuracion general',
      accountInformation: 'Informacion de la cuenta',
      name: 'Nombre',
      namePlaceholder: 'Ingresa tu nombre',
      email: 'Correo',
      emailPlaceholder: 'Ingresa tu correo',
      saving: 'Guardando...',
      saveChanges: 'Guardar cambios'
    },
    subscriptions: {
      title: 'Gestion de suscripciones',
      description:
        'Controla la suscripcion de tu cuenta y la de cada organizacion en un solo lugar.',
      summary: {
        organizations: 'Organizaciones',
        paymentEvents: 'Eventos de pago',
        invoices: 'Facturas'
      },
      teamFilter: {
        title: 'Filtro por equipo',
        label: 'Ver por equipo',
        allTeams: 'Todos los equipos',
        apply: 'Aplicar',
        clear: 'Limpiar',
        selected: 'Mostrando datos de: {team}',
        allDescription:
          'Mostrando datos de todos tus equipos y del alcance de cuenta.'
      },
      userPlan: {
        title: 'Suscripcion de usuario',
        noSubscription: 'No hay suscripcion de usuario asignada.',
        activeSubscription: 'Suscripcion de usuario activa',
        plan: 'Plan',
        interval: 'Intervalo',
        amount: 'Monto',
        source: 'Origen',
        sourceManual: 'Asignacion manual',
        sourceSystem: 'Sistema de cobro',
        changePlanImmediate: 'Cambiar plan ahora',
        changePlanPeriodEnd: 'Cambiar al final del periodo',
        cancel: 'Cancelar suscripcion de usuario',
        cancelPending: 'Cancelando...',
        confirmCancelTitle: 'Cancelar tu suscripcion de usuario?',
        confirmCancelDescription:
          'Esto quita inmediatamente la plantilla de suscripcion a nivel usuario.',
        confirmCancel: 'Si, cancelar',
        keep: 'Mantener suscripcion'
      },
      organizationPolicy: {
        title: 'Politica y limites de organizaciones',
        allowMultiOrganizations: 'Permitir multiples organizaciones',
        maxByConfig: 'Maximo de organizaciones (app config)',
        maxBySubscription: 'Maximo de organizaciones (suscripcion de usuario)',
        effectiveLimit: 'Limite efectivo de organizaciones',
        currentOrganizations: 'Organizaciones actuales',
        yes: 'Si',
        no: 'No',
        unlimited: 'Ilimitado'
      },
      organizations: {
        title: 'Suscripciones por organizacion',
        empty: 'No hay membresias de organizaciones.',
        columns: {
          organization: 'Organizacion',
          role: 'Rol',
          plan: 'Plan',
          provider: 'Proveedor',
          status: 'Estado',
          joinedAt: 'Ingreso',
          actions: 'Acciones'
        },
        owner: 'Owner',
        member: 'Miembro',
        noPlan: 'Sin plan',
        noProvider: 'Sin proveedor',
        noStatus: 'Sin estado',
        manage: 'Gestionar',
        managePending: 'Abriendo...',
        changePlanImmediate: 'Cambiar plan ahora',
        changePlanPeriodEnd: 'Cambiar al final del periodo',
        cancelPaypal: 'Cancelar PayPal',
        cancelPaypalPending: 'Cancelando...',
        confirmCancelTitle: 'Cancelar esta suscripcion de PayPal?',
        confirmCancelDescription:
          'Esto cancelara la suscripcion PayPal de la organizacion y volvera a estado gratis.',
        confirmCancel: 'Si, cancelar',
        keep: 'Mantener suscripcion'
      },
      logs: {
        title: 'Logs de pagos',
        description:
          'Eventos recientes de pago para tu cuenta y tus organizaciones.',
        empty: 'No se encontraron eventos de pago.',
        filterPlaceholder: 'Filtrar por alcance...',
        columns: {
          date: 'Fecha',
          scope: 'Alcance',
          provider: 'Proveedor',
          status: 'Estado',
          event: 'Evento',
          amount: 'Monto',
          paymentRef: 'Referencia de pago',
          orderRef: 'Referencia de orden'
        },
        accountScope: 'Cuenta',
        unknownScope: 'Alcance desconocido'
      },
      invoices: {
        title: 'Facturas',
        description: 'Pagos completados (historial tipo factura).',
        empty: 'No se encontraron facturas.',
        filterPlaceholder: 'Filtrar por alcance...',
        columns: {
          date: 'Fecha',
          scope: 'Alcance',
          plan: 'Plan',
          provider: 'Proveedor',
          amount: 'Monto',
          reference: 'Referencia'
        }
      },
      statuses: {
        active: 'Activo',
        trialing: 'Prueba',
        unpaid: 'Impago',
        canceled: 'Cancelado',
        free: 'Gratis',
        pending: 'Pendiente',
        received: 'Recibido',
        failed: 'Fallido'
      },
      intervals: {
        daily: 'Diario',
        weekly: 'Semanal',
        monthly: 'Mensual',
        quarterly: 'Trimestral',
        semiannual: 'Semestral',
        yearly: 'Anual'
      },
      table: {
        showingRows: 'Mostrando {shown} de {filtered} filas',
        previous: 'Anterior',
        next: 'Siguiente'
      }
    },
    security: {
      title: 'Configuracion de seguridad',
      passwordTitle: 'Contrasena',
      currentPassword: 'Contrasena actual',
      newPassword: 'Nueva contrasena',
      confirmNewPassword: 'Confirmar nueva contrasena',
      updating: 'Actualizando...',
      updatePassword: 'Actualizar contrasena',
      deleteAccountTitle: 'Eliminar cuenta',
      deleteWarning:
        'La eliminacion de la cuenta no se puede revertir. Procede con cuidado.',
      confirmPassword: 'Confirmar contrasena',
      deleting: 'Eliminando...',
      deleteAccount: 'Eliminar cuenta',
      confirmDeleteTitle: 'Eliminar tu cuenta?',
      confirmDeleteDescription:
        'Esta accion es permanente y elimina los datos de tu cuenta.',
      confirm: 'Eliminar cuenta',
      cancel: 'Cancelar'
    },
    activity: {
      title: 'Registro de actividad',
      recentActivity: 'Actividad reciente',
      time: {
        justNow: 'ahora mismo',
        minutesAgo: 'hace {count} minutos',
        hoursAgo: 'hace {count} horas',
        daysAgo: 'hace {count} dias'
      },
      actions: {
        signUp: 'Te registraste',
        signIn: 'Iniciaste sesion',
        signOut: 'Cerraste sesion',
        updatePassword: 'Cambiaste tu contrasena',
        deleteAccount: 'Eliminaste tu cuenta',
        updateAccount: 'Actualizaste tu cuenta',
        createTeam: 'Creaste un equipo nuevo',
        removeTeamMember: 'Eliminaste un miembro del equipo',
        inviteTeamMember: 'Invitaste a un miembro al equipo',
        acceptInvitation: 'Aceptaste una invitacion',
        resetPassword: 'Restableciste tu contrasena',
        unknown: 'Ocurrio una accion desconocida'
      },
      fromIp: 'desde IP',
      noActivityTitle: 'Aun no hay actividad',
      noActivityDescription:
        'Cuando hagas acciones como iniciar sesion o actualizar tu cuenta, apareceran aqui.'
    }
  }
};
