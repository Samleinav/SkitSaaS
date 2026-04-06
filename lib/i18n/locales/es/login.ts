import type { LoginMessages } from '../../messages/login';

const messages = {
  language: {
    label: 'Idioma'
  },
  auth: {
    signInTitle: 'Inicia sesion en tu cuenta',
    signUpTitle: 'Crea tu cuenta',
    email: 'Correo',
    emailPlaceholder: 'Ingresa tu correo',
    password: 'Contrasena',
    passwordPlaceholder: 'Ingresa tu contrasena',
    loading: 'Cargando...',
    signIn: 'Iniciar sesion',
    signUp: 'Crear cuenta',
    newToPlatform: 'Nuevo en nuestra plataforma?',
    alreadyHaveAccount: 'Ya tienes una cuenta?',
    createAccount: 'Crear una cuenta',
    signInExisting: 'Iniciar sesion en cuenta existente',
    passwordSignInDisabled: 'El inicio de sesion con contrasena esta deshabilitado para esta area. Usa un proveedor habilitado.',
    passwordSignUpDisabled: 'La creacion de cuentas con contrasena esta deshabilitada para esta area.',
    continueWith: 'Continuar con',
    noExternalProviders: 'No hay proveedores de inicio de sesion externos disponibles.',
    forgotPassword: 'Olvidaste tu contrasena?',
    errors: {
      breakGlassPasskeyRequired:
        'El inicio de sesion con contrasena esta deshabilitado para esta cuenta. Usa acceso con passkey.',
      breakGlassLockedOut:
        'Demasiados intentos fallidos. Intenta de nuevo mas tarde o usa acceso con passkey.',
      invalidCredentials:
        'Correo o contrasena invalidos. Intenta nuevamente.',
      deletedAccount:
        'Esta cuenta fue eliminada. Contacta a soporte para recibir ayuda.',
      bannedAccount:
        'Esta cuenta esta bloqueada. Contacta a soporte para recibir ayuda.',
      suspendedAccount:
        'Esta cuenta esta suspendida. Contacta a soporte para recibir ayuda.',
      adminAccessRequired:
        'Esta cuenta no tiene acceso admin. Inicia sesion desde /login.',
      teamInvitationsDisabled:
        'Las invitaciones de equipo estan deshabilitadas en este despliegue.',
      failedToCreateUser:
        'No se pudo crear el usuario. Intenta nuevamente.',
      invalidInvitation: 'La invitacion es invalida o expiro.',
      failedToCreateTeam:
        'No se pudo crear el equipo. Intenta nuevamente.',
      teamMemberLimitReached:
        'Este equipo ya alcanzo su limite de miembros.'
    }
  },
  forgotPassword: {
    title: 'Restablecer tu contrasena',
    description: 'Ingresa tu correo y te enviaremos un enlace para restablecerla.',
    emailPlaceholder: 'tu@ejemplo.com',
    sendResetLink: 'Enviar enlace',
    sending: 'Enviando...',
    rememberPassword: 'Recuerdas tu contrasena?',
    backToSignIn: 'Volver a iniciar sesion'
  },
  resetPassword: {
    title: 'Elige una nueva contrasena',
    description: 'Debe tener al menos 8 caracteres.',
    newPassword: 'Nueva contrasena',
    newPasswordPlaceholder: 'Nueva contrasena',
    confirmPassword: 'Confirmar contrasena',
    confirmPasswordPlaceholder: 'Confirmar contrasena',
    setPassword: 'Establecer contrasena',
    updating: 'Actualizando...',
    backToSignIn: 'Volver a iniciar sesion'
  }
} satisfies LoginMessages;

export default messages;
