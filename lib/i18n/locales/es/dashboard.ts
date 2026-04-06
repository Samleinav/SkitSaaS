import type { DashboardMessages } from '../../messages/dashboard';

const messages = {
  language: {
    label: 'Idioma'
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
  homeNoContext: {
    title: 'No hay modulos de dashboard disponibles',
    description: 'Tu cuenta todavia no tiene una experiencia standalone configurada.'
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
      confirmRemoveDescription: 'Esta persona perdera acceso al equipo inmediatamente.',
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
    description: 'Controla la suscripcion de tu cuenta y la de cada organizacion en un solo lugar.',
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
      allDescription: 'Mostrando datos de todos tus equipos y del alcance de cuenta.'
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
      confirmCancelDescription: 'Esto quita inmediatamente la plantilla de suscripcion a nivel usuario.',
      confirmCancel: 'Si, cancelar',
      keep: 'Mantener suscripcion'
    },
    organizationPolicy: {
      title: 'Limites de organizaciones',
      maxBySubscription: 'Maximo de organizaciones (suscripcion de usuario)',
      currentOrganizations: 'Organizaciones actuales',
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
      owner: 'Propietario',
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
      confirmCancelDescription: 'Esto cancelara la suscripcion PayPal de la organizacion y volvera a estado gratis.',
      confirmCancel: 'Si, cancelar',
      keep: 'Mantener suscripcion'
    },
    logs: {
      title: 'Logs de pagos',
      description: 'Eventos recientes de pago para tu cuenta y tus organizaciones.',
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
    deleteWarning: 'La eliminacion de la cuenta no se puede revertir. Procede con cuidado.',
    confirmPassword: 'Confirmar contrasena',
    deleting: 'Eliminando...',
    deleteAccount: 'Eliminar cuenta',
    confirmDeleteTitle: 'Eliminar tu cuenta?',
    confirmDeleteDescription: 'Esta accion es permanente y elimina los datos de tu cuenta.',
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
    noActivityDescription: 'Cuando hagas acciones como iniciar sesion o actualizar tu cuenta, apareceran aqui.'
  }
} satisfies DashboardMessages;

export default messages;
