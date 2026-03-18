import type { AppConfig } from '@/lib/runtime-config/types';

const appConfig: AppConfig = {
  projectName: 'S-Kit-SaaS',
  // Keep DB-backed modules working while force-enabling selected modules from config.
  moduleRuntimeMode: 'hybrid',
  modules: {},

  // ---------------------------------------------------------------------------
  // Role definitions — customize to match your SaaS user model.
  //
  // adminArea:     roles that can access /admin (default: ['admin', 'owner'])
  // dashboardArea: roles that can access /dashboard (default: ['member'])
  //
  // contextAffinity: force a role to always resolve to a specific UserContext,
  // overriding the default team-membership detection in getUserContext().
  //
  // Example for a school SaaS with staff, teacher and guardian roles:
  //   contextAffinity: {
  //     teacher:  'team_member',   // teachers always use a school team context
  //     staff:    'team_member',   // staff always use a school team context
  //     guardian: 'standalone',    // guardians always use a standalone context
  //   }
  // ---------------------------------------------------------------------------
  roles: {
    adminArea: ['admin', ],
    dashboardArea: ['member', 'owner'],
    // contextAffinity: {}
  }
};

export default appConfig;
