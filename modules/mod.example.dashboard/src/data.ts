export type ExampleDashboardMilestoneRow = {
  id: string;
  milestone: string;
  pattern: string;
  area: string;
  owner: string;
};

export type ExampleDashboardPlaybookRow = {
  id: string;
  title: string;
  stage: string;
  owner: string;
  cadence: string;
  visibility: string;
};

const EXAMPLE_DASHBOARD_MILESTONES: ExampleDashboardMilestoneRow[] = [
  {
    id: 'sdk-form-shell',
    milestone: 'SDK-only form rendering',
    pattern: 'TemplateBuildForm',
    area: 'dashboard',
    owner: 'Platform',
  },
  {
    id: 'module-slot-branding',
    milestone: 'Module slot branding',
    pattern: 'frontend slot',
    area: 'frontend',
    owner: 'Modules',
  },
  {
    id: 'portal-contrast',
    milestone: 'Portal-specific styling',
    pattern: 'module css',
    area: 'portal',
    owner: 'UX',
  },
];

const EXAMPLE_DASHBOARD_PLAYBOOKS: ExampleDashboardPlaybookRow[] = [
  {
    id: 'playbook-01',
    title: 'Remote onboarding checklist',
    stage: 'pilot',
    owner: 'Solutions',
    cadence: 'weekly',
    visibility: 'public',
  },
  {
    id: 'playbook-02',
    title: 'Renewal opportunity board',
    stage: 'live',
    owner: 'Success',
    cadence: 'daily',
    visibility: 'team',
  },
  {
    id: 'playbook-03',
    title: 'Module-first design review',
    stage: 'draft',
    owner: 'UX',
    cadence: 'biweekly',
    visibility: 'public',
  },
  {
    id: 'playbook-04',
    title: 'Source-package release drill',
    stage: 'live',
    owner: 'Platform',
    cadence: 'monthly',
    visibility: 'team',
  },
];

export function listExampleDashboardMilestones() {
  return EXAMPLE_DASHBOARD_MILESTONES;
}

export function listExampleDashboardPlaybooks() {
  return EXAMPLE_DASHBOARD_PLAYBOOKS;
}
