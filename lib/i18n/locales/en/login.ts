import type { LoginMessages } from '../../messages/login';

const messages = {
  language: {
    label: 'Language'
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
    passwordSignInDisabled: 'Password sign-in is disabled for this area. Use an enabled provider.',
    passwordSignUpDisabled: 'Account creation with password is disabled for this area.',
    continueWith: 'Continue with',
    noExternalProviders: 'No external login provider is currently available.',
    forgotPassword: 'Forgot password?',
    errors: {
      breakGlassPasskeyRequired:
        'Password sign-in is disabled for this account. Use passkey sign-in.',
      breakGlassLockedOut:
        'Too many failed attempts. Try again later or use passkey sign-in.',
      invalidCredentials: 'Invalid email or password. Please try again.',
      deletedAccount:
        'This account has been deleted. Contact support for assistance.',
      bannedAccount: 'This account is banned. Contact support for assistance.',
      suspendedAccount:
        'This account is suspended. Contact support for assistance.',
      adminAccessRequired:
        'This account does not have admin access. Sign in from /login instead.',
      teamInvitationsDisabled:
        'Team invitations are disabled for this deployment.',
      failedToCreateUser: 'Failed to create user. Please try again.',
      invalidInvitation: 'Invalid or expired invitation.',
      failedToCreateTeam: 'Failed to create team. Please try again.',
      teamMemberLimitReached: 'This team has reached its member limit.'
    }
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
} satisfies LoginMessages;

export default messages;
