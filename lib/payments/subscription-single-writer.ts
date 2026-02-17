const loggedContexts = new Set<string>();

export function isSubscriptionMutationBlocked(context: string) {
  if (!loggedContexts.has(context)) {
    loggedContexts.add(context);
    console.warn('[subscription-single-writer] blocked legacy mutation', {
      context
    });
  }

  return true;
}
