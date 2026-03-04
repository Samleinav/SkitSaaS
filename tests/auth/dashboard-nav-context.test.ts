import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDashboardNavItemsForContext } from '../../app/(dashboard)/dashboard/nav-context';

test('dashboard nav context returns team member items for team_member users', () => {
  const items = resolveDashboardNavItemsForContext({
    contextType: 'team_member',
    teamMemberItems: ['team', 'team-module'],
    standaloneItems: ['standalone-module']
  });

  assert.deepEqual(items, ['team', 'team-module']);
});

test('dashboard nav context returns standalone items for standalone users', () => {
  const items = resolveDashboardNavItemsForContext({
    contextType: 'standalone',
    teamMemberItems: ['team', 'team-module'],
    standaloneItems: ['standalone-module']
  });

  assert.deepEqual(items, ['standalone-module']);
});

test('dashboard nav context returns empty nav for admin/public users', () => {
  const adminItems = resolveDashboardNavItemsForContext({
    contextType: 'system_admin',
    teamMemberItems: ['team', 'team-module'],
    standaloneItems: ['standalone-module']
  });
  const publicItems = resolveDashboardNavItemsForContext({
    contextType: 'public',
    teamMemberItems: ['team', 'team-module'],
    standaloneItems: ['standalone-module']
  });

  assert.deepEqual(adminItems, []);
  assert.deepEqual(publicItems, []);
});
