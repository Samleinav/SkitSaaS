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
      noExternalProviders: 'No external login provider is currently available.'
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
        'No hay proveedores de inicio de sesion externos disponibles.'
    }
  }
};
