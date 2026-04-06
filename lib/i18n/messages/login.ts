export type LoginMessages = {
  language: {
    label: string;
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
    errors: {
      breakGlassPasskeyRequired: string;
      breakGlassLockedOut: string;
      invalidCredentials: string;
      deletedAccount: string;
      bannedAccount: string;
      suspendedAccount: string;
      adminAccessRequired: string;
      teamInvitationsDisabled: string;
      failedToCreateUser: string;
      invalidInvitation: string;
      failedToCreateTeam: string;
      teamMemberLimitReached: string;
    };
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
