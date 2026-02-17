'use server';

import {
  clearTeamSubscriptionAction as clearTeamSubscriptionBaseAction,
  updateTeamSubscriptionAction as updateTeamSubscriptionBaseAction,
  updateUserSubscriptionAction as updateUserSubscriptionBaseAction
} from '../subscriptions/actions';

export async function clearTeamSubscriptionAction(formData: FormData) {
  return clearTeamSubscriptionBaseAction(formData);
}

export async function updateTeamSubscriptionAction(formData: FormData) {
  return updateTeamSubscriptionBaseAction(formData);
}

export async function updateUserSubscriptionAction(formData: FormData) {
  return updateUserSubscriptionBaseAction(formData);
}
