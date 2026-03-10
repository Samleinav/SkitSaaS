import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSdkNotificationsUrl,
  normalizeSdkNotificationIds,
  resolveSdkNotificationAreaFromPath
} from '../../app/sdk/src';

test('SDK notifications helpers resolve private areas from pathnames', () => {
  assert.equal(resolveSdkNotificationAreaFromPath('/admin'), 'admin');
  assert.equal(resolveSdkNotificationAreaFromPath('/admin/users'), 'admin');
  assert.equal(resolveSdkNotificationAreaFromPath('/dashboard'), 'dashboard');
  assert.equal(
    resolveSdkNotificationAreaFromPath('/dashboard/security'),
    'dashboard'
  );
  assert.equal(resolveSdkNotificationAreaFromPath('/pricing'), null);
});

test('SDK notifications helpers normalize ids and build query URLs', () => {
  assert.deepEqual(normalizeSdkNotificationIds([9, 3, 9, 0, -1, 4]), [3, 4, 9]);
  assert.deepEqual(normalizeSdkNotificationIds(7), [7]);

  assert.equal(
    buildSdkNotificationsUrl({
      area: 'admin',
      includeRead: true,
      limit: 80
    }),
    '/api/notifications?area=admin&includeRead=1&limit=80'
  );
  assert.equal(
    buildSdkNotificationsUrl({
      area: 'dashboard',
      includeRead: false,
      limit: 0
    }),
    '/api/notifications?area=dashboard'
  );
});
