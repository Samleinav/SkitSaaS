import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DASHBOARD_SUBSCRIPTION_FEATURES,
  USER_SUBSCRIPTION_FEATURES,
  isManagedSubscriptionFeatureInputValid
} from '../../lib/features/catalog';
import { createFeatureController } from '../../lib/features/controller';
import {
  areTeamInvitesEnabledBySubscription,
  resolveTeamMemberLimitBySubscription,
  resolveUserOrganizationLimitBySubscription
} from '../../lib/organizations/subscription-limit-values';

test('managed core count quotas accept -1 and reject 0 as form input', () => {
  assert.equal(
    isManagedSubscriptionFeatureInputValid(
      DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax,
      '-1'
    ),
    true
  );
  assert.equal(
    isManagedSubscriptionFeatureInputValid(
      DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax,
      '0'
    ),
    false
  );
  assert.equal(
    isManagedSubscriptionFeatureInputValid(
      USER_SUBSCRIPTION_FEATURES.organizationsMax,
      '-1'
    ),
    true
  );
  assert.equal(
    isManagedSubscriptionFeatureInputValid(
      USER_SUBSCRIPTION_FEATURES.organizationsMax,
      '0'
    ),
    false
  );
});

test('count quota helpers normalize -1 to unlimited and repair invalid 0 safely', () => {
  assert.equal(resolveTeamMemberLimitBySubscription(-1), null);
  assert.equal(resolveTeamMemberLimitBySubscription(4), 4);
  assert.equal(resolveTeamMemberLimitBySubscription(0), 1);

  assert.equal(resolveUserOrganizationLimitBySubscription(-1), null);
  assert.equal(resolveUserOrganizationLimitBySubscription(6), 6);
  assert.equal(resolveUserOrganizationLimitBySubscription(0), 1);
  assert.equal(resolveUserOrganizationLimitBySubscription(null), 1);
});

test('feature controller treats negative numeric quotas as enabled/unlimited', () => {
  const controller = createFeatureController({
    [DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.key]: '-1'
  });

  assert.equal(controller.has(DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.key), true);
  assert.equal(
    controller.can(DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.key, 999),
    true
  );
});

test('team invites gate is controlled only by dashboard.team.invites.enabled', () => {
  const disabledController = createFeatureController({
    [DASHBOARD_SUBSCRIPTION_FEATURES.teamInvitesEnabled.key]: 'false',
    [DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.key]: '-1'
  });
  const enabledController = createFeatureController({
    [DASHBOARD_SUBSCRIPTION_FEATURES.teamInvitesEnabled.key]: 'true'
  });
  const missingController = createFeatureController({});

  assert.equal(areTeamInvitesEnabledBySubscription(disabledController), false);
  assert.equal(areTeamInvitesEnabledBySubscription(enabledController), true);
  assert.equal(areTeamInvitesEnabledBySubscription(missingController), false);
});
