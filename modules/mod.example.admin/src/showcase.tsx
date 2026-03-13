import {
  TemplateBuildForm,
  composeBuildFormDefinition,
} from '@skitsaas/sdk';
import { submitExampleAdminBroadcastAction } from './actions';
import { ExampleAdminShowcaseTable } from './admin-showcase-table';
import { createExampleAdminBroadcastFormDefinition } from './forms';

const EXAMPLE_ADMIN_STYLES = `
.example-admin-shell {
  display: grid;
  gap: 1.25rem;
  color: #111827;
}

.example-admin-hero {
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 1rem;
  padding: 1.35rem;
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.2), transparent 40%),
    linear-gradient(135deg, rgba(255, 251, 235, 0.96), rgba(255, 255, 255, 0.92));
  box-shadow: 0 22px 48px rgba(120, 53, 15, 0.08);
}

.example-admin-kicker {
  margin: 0 0 0.45rem;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #b45309;
}

.example-admin-title {
  margin: 0;
  font-size: 1.9rem;
  line-height: 1.1;
}

.example-admin-copy {
  margin: 0.65rem 0 0;
  max-width: 58rem;
  color: rgba(17, 24, 39, 0.74);
}

.example-admin-grid {
  display: grid;
  gap: 1rem;
}

@media (min-width: 1080px) {
  .example-admin-grid {
    grid-template-columns: 1.1fr 1fr;
    align-items: start;
  }
}

.example-admin-card {
  overflow: hidden;
  border: 1px solid rgba(217, 119, 6, 0.18);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 42px rgba(120, 53, 15, 0.08);
}

.example-admin-card__header {
  padding: 1rem 1.1rem 0.5rem;
}

.example-admin-card__eyebrow {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c2410c;
}

.example-admin-card__title {
  margin: 0.2rem 0 0;
  font-size: 1.05rem;
}

.example-admin-card__description {
  margin: 0.35rem 0 0;
  font-size: 0.92rem;
  color: rgba(17, 24, 39, 0.72);
}

.example-admin-card__body {
  padding: 0.5rem 1.1rem 1.1rem;
}

.example-admin-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1rem;
}

.example-admin-chip {
  border-radius: 999px;
  padding: 0.42rem 0.8rem;
  font-size: 0.78rem;
  font-weight: 600;
  background: rgba(255, 247, 237, 0.9);
  color: #9a3412;
}

.example-admin-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.example-admin-pill--ready {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.example-admin-pill--pilot {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.example-admin-pill--active {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}
`;

export async function renderExampleAdminPage() {
  const form = composeBuildFormDefinition(
    createExampleAdminBroadcastFormDefinition(),
    {
      request: {
        action: submitExampleAdminBroadcastAction,
        method: 'post',
      },
      submit: {
        idleLabel: 'Validate Example',
        pendingLabel: 'Validating...',
        successLabel: 'Validated',
        align: 'start',
      },
      values: {
        campaignName: 'Module refresh preview',
        targetScope: 'admins',
        reviewWindowMinutes: 20,
        includeChecklist: true,
      },
    }
  );

  return (
    <div className="example-admin-shell">
      <style>{EXAMPLE_ADMIN_STYLES}</style>

      <section className="example-admin-hero">
        <p className="example-admin-kicker">SDK-first module surface</p>
        <h1 className="example-admin-title">Example Admin is now a real showcase</h1>
        <p className="example-admin-copy">
          This source-host example now demonstrates the recommended module path:
          SDK `TemplateBuildForm`, SDK `DataTable`, and a module-owned visual shell
          instead of a plain string response.
        </p>
        <div className="example-admin-chip-row">
          <span className="example-admin-chip">Local DataTable</span>
          <span className="example-admin-chip">Validated action</span>
          <span className="example-admin-chip">Module-owned CSS</span>
        </div>
      </section>

      <div className="example-admin-grid">
        <article className="example-admin-card">
          <header className="example-admin-card__header">
            <p className="example-admin-card__eyebrow">Local Table</p>
            <h2 className="example-admin-card__title">Example matrix</h2>
            <p className="example-admin-card__description">
              A small local table that compares the updated examples in this repo.
            </p>
          </header>
          <div className="example-admin-card__body">
            <ExampleAdminShowcaseTable />
          </div>
        </article>

        <article className="example-admin-card">
          <header className="example-admin-card__header">
            <p className="example-admin-card__eyebrow">FormBuilder</p>
            <h2 className="example-admin-card__title">Validation-only admin form</h2>
            <p className="example-admin-card__description">
              Shows the modern module pattern without touching host-only form imports.
            </p>
          </header>
          <div className="example-admin-card__body">
            <TemplateBuildForm
              definition={form}
              area="admin"
              route="/admin/custom/example-admin"
              moduleId="mod.example.admin"
            />
          </div>
        </article>
      </div>
    </div>
  );
}
