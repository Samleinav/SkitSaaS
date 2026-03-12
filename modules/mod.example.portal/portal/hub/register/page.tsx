import Link from 'next/link';
import {
  BuildForm,
  DataTable,
  buildTableColumn,
  defineBuildTable,
} from '@skitsaas/sdk';
import { createHubRegisterFormDefinition } from './forms';

/**
 * Hub portal — registration page.
 * Public: no authentication required.
 * Served at: /hub/register
 *
 * Users with role 'hubrole' are redirected here after login
 * via redirectRoles in portal-init.ts.
 */

// ---------------------------------------------------------------------------
// Feature table — static demo data shown above the form
// ---------------------------------------------------------------------------

type HubFeatureRow = {
  feature: string;
  description: string;
  included: string;
};

const HUB_FEATURES: HubFeatureRow[] = [
  { feature: 'Member directory', description: 'Access the full member list',       included: '✓' },
  { feature: 'Member profiles',  description: 'View and edit individual profiles', included: '✓' },
  { feature: 'Announcements',    description: 'Receive hub-wide announcements',    included: '✓' },
  { feature: 'Events',           description: 'Browse and RSVP to hub events',     included: '✓' },
  { feature: 'Reports',          description: 'Export data and download reports',  included: 'Pro' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hubFeaturesTable = defineBuildTable<HubFeatureRow, any>({
  data: HUB_FEATURES,
  columns: [
    buildTableColumn.text<HubFeatureRow>({
      key: 'feature',
      header: 'Feature',
      cell: (row) => (
        <span className="font-medium text-slate-900">{row.feature}</span>
      ),
    }),
    buildTableColumn.text<HubFeatureRow>({
      key: 'description',
      header: 'What you get',
      cell: (row) => (
        <span className="text-sm text-slate-500">{row.description}</span>
      ),
    }),
    buildTableColumn.text<HubFeatureRow>({
      key: 'included',
      header: 'Included',
      cell: (row) => (
        <span
          className={
            row.included === '✓'
              ? 'text-sm font-semibold text-emerald-600'
              : 'text-sm font-medium text-amber-600'
          }
        >
          {row.included}
        </span>
      ),
    }),
  ],
  pagination: { pageSize: 10 },
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type PageProps = {
  slug: string[];
  params: Record<string, string>;
  searchParams: Record<string, string | string[] | undefined>;
};

export default function HubRegisterPage(_props: PageProps) {
  const form = createHubRegisterFormDefinition();

  return (
    <div className="mx-auto max-w-2xl space-y-10">

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Join the Hub
        </h1>
        <p className="text-sm text-slate-500">
          Create an account to get access to all Hub features.
        </p>
      </div>

      {/* What's included */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          What&apos;s included
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <DataTable
            definition={hubFeaturesTable}
            labels={{ empty: 'No features listed.' }}
          />
        </div>
      </section>

      {/* Registration form */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Create your account
        </h2>
        <BuildForm
          definition={form}
          area="frontend"
        />
      </section>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="font-medium text-slate-900 underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
