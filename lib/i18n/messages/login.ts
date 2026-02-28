import type { AppLocale } from '@/lib/i18n/config';

export type LoginMessages = {
  language: {
    label: string;
    english: string;
    spanish: string;
  };
  auth: {
    signInTitle: string;
    signUpTitle: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    loading: string;
    signIn: string;
    signUp: string;
    newToPlatform: string;
    alreadyHaveAccount: string;
    createAccount: string;
    signInExisting: string;
    passwordSignInDisabled: string;
    passwordSignUpDisabled: string;
    continueWith: string;
    noExternalProviders: string;
    forgotPassword: string;
  };
  forgotPassword: {
    title: string;
    description: string;
    emailPlaceholder: string;
    sendResetLink: string;
    sending: string;
    rememberPassword: string;
    backToSignIn: string;
  };
  resetPassword: {
    title: string;
    description: string;
    newPassword: string;
    newPasswordPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    setPassword: string;
    updating: string;
    backToSignIn: string;
  };
};

export const loginMessages: Record<AppLocale, LoginMessages> = {
  en: {
    language: {
      label: 'Language',
      english: 'English',
      spanish: 'Spanish'
    },
    auth: {
      signInTitle: 'Sign in to your account',
      signUpTitle: 'Create your account',
      email: 'Email',
      emailPlaceholder: 'Enter your email',
      password: 'Password',
      passwordPlaceholder: 'Enter your password',
      loading: 'Loading...',
      signIn: 'Sign in',
      signUp: 'Sign up',
      newToPlatform: 'New to our platform?',
      alreadyHaveAccount: 'Already have an account?',
      createAccount: 'Create an account',
      signInExisting: 'Sign in to existing account',
      passwordSignInDisabled:
        'Password sign-in is disabled for this area. Use an enabled provider.',
      passwordSignUpDisabled:
        'Account creation with password is disabled for this area.',
      continueWith: 'Continue with',
      noExternalProviders: 'No external login provider is currently available.',
      forgotPassword: 'Forgot password?'
    },
    forgotPassword: {
      title: 'Reset your password',
      description: "Enter your email and we'll send you a reset link.",
      emailPlaceholder: 'you@example.com',
      sendResetLink: 'Send reset link',
      sending: 'Sending...',
      rememberPassword: 'Remember your password?',
      backToSignIn: 'Back to sign in'
    },
    resetPassword: {
      title: 'Choose a new password',
      description: 'Must be at least 8 characters.',
      newPassword: 'New password',
      newPasswordPlaceholder: 'New password',
      confirmPassword: 'Confirm password',
      confirmPasswordPlaceholder: 'Confirm password',
      setPassword: 'Set new password',
      updating: 'Updating...',
      backToSignIn: 'Back to sign in'
    }
  },
  es: {
    language: {
      label: 'Idioma',
      english: 'Ingles',
      spanish: 'Espanol'
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
      passwordSignInDisabled:
        'El inicio de sesion con contrasena esta deshabilitado para esta area. Usa un proveedor habilitado.',
      passwordSignUpDisabled:
        'La creacion de cuentas con contrasena esta deshabilitada para esta area.',
      continueWith: 'Continuar con',
      noExternalProviders:
        'No hay proveedores de inicio de sesion externos disponibles.',
      forgotPassword: 'Olvidaste tu contrasena?'
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
  }
};
