import Link from 'next/link';
import { TemplateBuildForm } from '@skitsaas/sdk';
import { HubFeaturesDataTable } from '../data-tables';
import { createHubRegisterFormDefinition } from './forms';

/**
 * Hub portal — registration page.
 * Public: no authentication required.
 * Served at: /hub/register
 *
 * Users with role 'hubrole' are redirected here after login
 * via redirectRoles in portal-init.ts.
 */

type PageProps = {
  slug: string[];
  params: Record<string, string>;
  searchParams: Record<string, string | string[] | undefined>;
};

export default function HubRegisterPage(_props: PageProps) {
  const form = createHubRegisterFormDefinition();

  return (
    <div className="hub-shell">
      <section className="hub-hero">
        <p className="hub-kicker">Public onboarding</p>
        <h1 className="hub-title">Join the Hub</h1>
        <p className="hub-copy">
          Create an account to get access to all Hub features and inspect the
          portal-side SDK form/table examples.
        </p>
      </section>

      <section className="hub-grid hub-grid--two">
        <article className="hub-card">
          <header className="hub-card__header">
            <p className="hub-card__eyebrow">Included</p>
            <h2 className="hub-card__title">What&apos;s included</h2>
            <p className="hub-card__description">
              This table is rendered from a client component so the example stays
              correct across the server/client boundary.
            </p>
          </header>
          <div className="hub-card__body">
            <HubFeaturesDataTable />
          </div>
        </article>

        <article className="hub-card">
          <header className="hub-card__header">
            <p className="hub-card__eyebrow">SDK form</p>
            <h2 className="hub-card__title">Create your account</h2>
            <p className="hub-card__description">
              Uses `TemplateBuildForm` directly from the SDK.
            </p>
          </header>
          <div className="hub-card__body">
            <TemplateBuildForm definition={form} area="frontend" />
          </div>
        </article>
      </section>

      <p className="text-center text-sm text-slate-500">
        Already have an account? <Link href="/sign-in" className="hub-link">Sign in</Link>
      </p>
    </div>
  );
}
