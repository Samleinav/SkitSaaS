import type { ReactNode } from 'react';
import {
  TemplateBuildForm,
  composeBuildFormDefinition,
} from '@skitsaas/sdk';
import { submitExampleDashboardIntakeAction } from './actions';
import { createExampleDashboardIntakeFormDefinition } from './forms';
import {
  ExampleDashboardMilestonesTable,
  ExampleDashboardPlaybooksTable,
} from './showcase-tables';

const dashboardShowcaseStyles = `
.example-dashboard-shell {
  display: grid;
  gap: 1.25rem;
  color: #0f172a;
}

.example-dashboard-hero,
.example-dashboard-card,
.example-dashboard-slot {
  border: 1px solid rgba(14, 116, 144, 0.18);
  border-radius: 1rem;
  background:
    linear-gradient(135deg, rgba(236, 254, 255, 0.96), rgba(255, 255, 255, 0.94));
  box-shadow: 0 20px 48px rgba(14, 116, 144, 0.08);
}

.example-dashboard-hero {
  padding: 1.35rem;
}

.example-dashboard-title {
  margin: 0;
  font-size: 1.9rem;
  line-height: 1.1;
}

.example-dashboard-copy {
  margin: 0.7rem 0 0;
  max-width: 58rem;
  color: rgba(15, 23, 42, 0.72);
}

.example-dashboard-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1rem;
}

.example-dashboard-chip {
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.12);
  color: #0f766e;
  padding: 0.42rem 0.76rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.example-dashboard-grid {
  display: grid;
  gap: 1rem;
}

@media (min-width: 1080px) {
  .example-dashboard-grid {
    grid-template-columns: 1.05fr 1fr;
    align-items: start;
  }
}

.example-dashboard-card {
  overflow: hidden;
}

.example-dashboard-card__header {
  padding: 1rem 1.1rem 0.55rem;
}

.example-dashboard-card__eyebrow {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0f766e;
}

.example-dashboard-card__title {
  margin: 0.2rem 0 0;
  font-size: 1.04rem;
}

.example-dashboard-card__description {
  margin: 0.35rem 0 0;
  font-size: 0.92rem;
  color: rgba(15, 23, 42, 0.72);
}

.example-dashboard-card__body {
  padding: 0.5rem 1.1rem 1.1rem;
}

.example-dashboard-stage {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.2rem 0.58rem;
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
}

.example-dashboard-stage--draft {
  background: rgba(148, 163, 184, 0.16);
  color: #334155;
}

.example-dashboard-stage--pilot {
  background: rgba(59, 130, 246, 0.14);
  color: #1d4ed8;
}

.example-dashboard-stage--live {
  background: rgba(16, 185, 129, 0.14);
  color: #047857;
}

.example-dashboard-slot {
  padding: 1rem 1.1rem;
}

.example-dashboard-slot__title {
  margin: 0;
  font-size: 0.98rem;
}

.example-dashboard-slot__copy {
  margin: 0.4rem 0 0;
  color: rgba(15, 23, 42, 0.72);
  font-size: 0.9rem;
}
`;

function ExampleDashboardShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="example-dashboard-shell">
      <style>{dashboardShowcaseStyles}</style>
      <section className="example-dashboard-hero">
        <h1 className="example-dashboard-title">{title}</h1>
        <p className="example-dashboard-copy">{description}</p>
        <div className="example-dashboard-chip-row">
          <span className="example-dashboard-chip">Local table</span>
          <span className="example-dashboard-chip">Remote source.url</span>
          <span className="example-dashboard-chip">Module CSS</span>
        </div>
      </section>
      {children}
    </div>
  );
}

export async function renderExampleDashboardPage() {
  const form = composeBuildFormDefinition(
    createExampleDashboardIntakeFormDefinition(),
    {
      request: {
        action: submitExampleDashboardIntakeAction,
        method: 'post',
      },
      submit: {
        idleLabel: 'Validate Intake',
        pendingLabel: 'Validating...',
        successLabel: 'Validated',
        align: 'start',
      },
      values: {
        requestName: 'Dashboard showcase refresh',
        priorityBand: 'growth',
        deliveryArea: 'dashboard',
        needsRemoteTable: true,
      },
    }
  );

  return (
    <ExampleDashboardShell
      title="Example Dashboard"
      description="This source-host example now shows both module-authoring modes of the SDK table runtime: a local dashboard table and a separate frontend table backed by source.url."
    >
      <div className="example-dashboard-grid">
        <article className="example-dashboard-card">
          <header className="example-dashboard-card__header">
            <p className="example-dashboard-card__eyebrow">Local DataTable</p>
            <h2 className="example-dashboard-card__title">Milestones visible in-dashboard</h2>
            <p className="example-dashboard-card__description">
              Use this as the smallest useful module DataTable example.
            </p>
          </header>
          <div className="example-dashboard-card__body">
            <ExampleDashboardMilestonesTable />
          </div>
        </article>

        <article className="example-dashboard-card">
          <header className="example-dashboard-card__header">
            <p className="example-dashboard-card__eyebrow">TemplateBuildForm</p>
            <h2 className="example-dashboard-card__title">Private intake example</h2>
            <p className="example-dashboard-card__description">
              Authenticated dashboard form using SDK validation and the host bridge.
            </p>
          </header>
          <div className="example-dashboard-card__body">
            <TemplateBuildForm
              definition={form}
              area="dashboard"
              route="/dashboard/custom/example-dashboard"
              moduleId="mod.example.dashboard"
            />
          </div>
        </article>
      </div>
    </ExampleDashboardShell>
  );
}

export async function renderExampleDashboardFrontendPage() {
  return (
    <ExampleDashboardShell
      title="Example Frontend Showcase"
      description="This frontend alias intentionally renders a remote module DataTable so the example set covers source.url alongside local-only tables."
    >
      <article className="example-dashboard-card">
        <header className="example-dashboard-card__header">
          <p className="example-dashboard-card__eyebrow">Remote DataTable</p>
          <h2 className="example-dashboard-card__title">Playbooks fetched from module API</h2>
          <p className="example-dashboard-card__description">
            Search, filter and pagination are driven by the module endpoint under
            <code> /api/modules/mod.example.dashboard/showcase-playbooks</code>.
          </p>
        </header>
        <div className="example-dashboard-card__body">
          <ExampleDashboardPlaybooksTable />
        </div>
      </article>
    </ExampleDashboardShell>
  );
}

export function renderExampleDashboardSlot() {
  return (
    <div className="example-dashboard-shell">
      <style>{dashboardShowcaseStyles}</style>
      <div className="example-dashboard-slot">
        <h3 className="example-dashboard-slot__title">Module-owned frontend slot</h3>
        <p className="example-dashboard-slot__copy">
          This content is injected from <code>mod.example.dashboard</code> and carries its
          own module styling instead of inheriting the marketing page layout blindly.
        </p>
      </div>
    </div>
  );
}
