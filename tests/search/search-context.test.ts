import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSearchContextTags,
  normalizeSearchPath,
  resolveSearchSurfaceFromPath
} from '../../lib/search/context';
import { dashboardPortalSet, portalPrefixSet } from '@skitsaas/sdk';

test('normalizeSearchPath strips origin, query, and hash noise', () => {
  assert.equal(
    normalizeSearchPath('https://example.com/dashboard/general?tab=profile#x'),
    '/dashboard/general'
  );
  assert.equal(normalizeSearchPath('dashboard/general'), '/dashboard/general');
  assert.equal(normalizeSearchPath(null), '/');
});

test('resolveSearchSurfaceFromPath detects core areas', () => {
  assert.deepEqual(resolveSearchSurfaceFromPath('/admin/users'), {
    area: 'admin',
    pathname: '/admin/users',
    portalName: null,
    portalRouteArea: null
  });

  assert.deepEqual(resolveSearchSurfaceFromPath('/dashboard/security'), {
    area: 'dashboard',
    pathname: '/dashboard/security',
    portalName: null,
    portalRouteArea: null
  });

  assert.deepEqual(resolveSearchSurfaceFromPath('/pricing'), {
    area: 'frontend',
    pathname: '/pricing',
    portalName: null,
    portalRouteArea: null
  });
});

test('resolveSearchSurfaceFromPath detects standalone and dashboard portals', () => {
  portalPrefixSet.add('hub');
  dashboardPortalSet.add('workspace');

  assert.deepEqual(resolveSearchSurfaceFromPath('/hub/members'), {
    area: 'portal',
    pathname: '/hub/members',
    portalName: 'hub',
    portalRouteArea: 'standalone'
  });

  assert.deepEqual(resolveSearchSurfaceFromPath('/dashboard/workspace/reports'), {
    area: 'portal',
    pathname: '/dashboard/workspace/reports',
    portalName: 'workspace',
    portalRouteArea: 'dashboard'
  });
});

test('buildSearchContextTags adds dashboard and portal scoping tags', () => {
  assert.deepEqual(
    buildSearchContextTags({
      area: 'dashboard',
      dashboardContextType: 'team_member'
    }).sort(),
    ['area.dashboard', 'dashboard.team', 'dashboard.team_member'].sort()
  );

  assert.deepEqual(
    buildSearchContextTags({
      area: 'portal',
      portalName: 'hub',
      portalRouteArea: 'dashboard',
      dashboardContextType: 'standalone'
    }).sort(),
    [
      'area.portal',
      'dashboard.portal',
      'dashboard.portal.hub',
      'dashboard.standalone',
      'portal.dashboard',
      'portal.dashboard.hub',
      'portal.hub'
    ].sort()
  );
});
