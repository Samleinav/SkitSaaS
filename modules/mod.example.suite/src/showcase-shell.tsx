import Link from 'next/link';
import type { ReactNode } from 'react';

const EXAMPLE_SUITE_SHOWCASE_STYLES = `
.example-suite-shell {
  display: grid;
  gap: 1.2rem;
  color: #0f172a;
}

.example-suite-hero {
  border: 1px solid rgba(168, 85, 247, 0.18);
  border-radius: 1rem;
  padding: 1.3rem;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.18), transparent 38%),
    linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(245, 243, 255, 0.94));
  box-shadow: 0 24px 52px rgba(76, 29, 149, 0.08);
}

.example-suite-kicker {
  margin: 0 0 0.45rem;
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7c3aed;
  font-weight: 700;
}

.example-suite-title {
  margin: 0;
  font-size: 1.85rem;
  line-height: 1.08;
}

.example-suite-copy {
  margin: 0.65rem 0 0;
  max-width: 62rem;
  color: rgba(15, 23, 42, 0.72);
}

.example-suite-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1rem;
}

.example-suite-chip {
  border-radius: 999px;
  padding: 0.42rem 0.78rem;
  background: rgba(124, 58, 237, 0.1);
  color: #6d28d9;
  font-size: 0.78rem;
  font-weight: 700;
}

.example-suite-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1rem;
}

.example-suite-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.35rem;
  border-radius: 999px;
  padding: 0 0.95rem;
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 700;
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.example-suite-action:hover {
  transform: translateY(-1px);
}

.example-suite-action--primary {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  color: #f8fafc;
  box-shadow: 0 16px 34px rgba(99, 102, 241, 0.18);
}

.example-suite-action--secondary {
  border: 1px solid rgba(148, 163, 184, 0.36);
  background: rgba(255, 255, 255, 0.86);
  color: #0f172a;
}

.example-suite-grid {
  display: grid;
  gap: 1rem;
}

@media (min-width: 1080px) {
  .example-suite-grid--two {
    grid-template-columns: 1.1fr 1fr;
    align-items: start;
  }
}

.example-suite-panel {
  overflow: hidden;
  border: 1px solid rgba(99, 102, 241, 0.16);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 40px rgba(99, 102, 241, 0.08);
}

.example-suite-panel__header {
  padding: 1rem 1.1rem 0.55rem;
}

.example-suite-panel__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6366f1;
}

.example-suite-panel__title {
  margin: 0.2rem 0 0;
  font-size: 1.04rem;
}

.example-suite-panel__description {
  margin: 0.34rem 0 0;
  font-size: 0.91rem;
  color: rgba(15, 23, 42, 0.72);
}

.example-suite-panel__body {
  padding: 0.55rem 1.1rem 1.1rem;
}

.example-suite-summary {
  display: grid;
  gap: 0.75rem;
}

@media (min-width: 740px) {
  .example-suite-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.example-suite-summary-item {
  border-radius: 0.9rem;
  padding: 0.85rem 0.95rem;
  background: rgba(244, 244, 255, 0.86);
}

.example-suite-summary-label {
  display: block;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #6366f1;
  font-weight: 700;
}

.example-suite-summary-value {
  display: block;
  margin-top: 0.35rem;
  font-size: 1rem;
  font-weight: 700;
}

.example-suite-empty {
  margin: 0;
  color: rgba(15, 23, 42, 0.72);
}

.example-suite-detail-list {
  display: grid;
  gap: 0.85rem;
}

.example-suite-detail-item {
  border-radius: 0.9rem;
  padding: 0.9rem 1rem;
  background: rgba(248, 250, 252, 0.9);
}

.example-suite-detail-label {
  display: block;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  font-weight: 700;
}

.example-suite-detail-value {
  display: block;
  margin-top: 0.32rem;
  font-size: 0.96rem;
}

.example-suite-status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.2rem 0.58rem;
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
}

.example-suite-status-pill--emerald {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.example-suite-status-pill--slate {
  background: rgba(100, 116, 139, 0.12);
  color: #334155;
}

.example-suite-status-pill--amber {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}
`;

export function ExampleSuiteShell({
  eyebrow,
  title,
  description,
  chips = [],
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  chips?: string[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="example-suite-shell">
      <style>{EXAMPLE_SUITE_SHOWCASE_STYLES}</style>

      <section className="example-suite-hero">
        <p className="example-suite-kicker">{eyebrow}</p>
        <h1 className="example-suite-title">{title}</h1>
        <p className="example-suite-copy">{description}</p>
        {chips.length ? (
          <div className="example-suite-chip-row">
            {chips.map((chip) => (
              <span key={chip} className="example-suite-chip">
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        {actions ? <div className="example-suite-actions">{actions}</div> : null}
      </section>

      {children}
    </div>
  );
}

export function ExampleSuitePanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <article className="example-suite-panel">
      <header className="example-suite-panel__header">
        <p className="example-suite-panel__eyebrow">{eyebrow}</p>
        <h2 className="example-suite-panel__title">{title}</h2>
        {description ? (
          <p className="example-suite-panel__description">{description}</p>
        ) : null}
      </header>
      <div className="example-suite-panel__body">{children}</div>
    </article>
  );
}

export function ExampleSuiteActionLink({
  href,
  label,
  tone = 'secondary',
}: {
  href: string;
  label: string;
  tone?: 'primary' | 'secondary';
}) {
  return (
    <Link
      href={href}
      className={`example-suite-action example-suite-action--${tone}`}
    >
      {label}
    </Link>
  );
}

export function ExampleSuiteSummary({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="example-suite-summary">
      {items.map((item) => (
        <div key={item.label} className="example-suite-summary-item">
          <span className="example-suite-summary-label">{item.label}</span>
          <span className="example-suite-summary-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ExampleSuiteDetailList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="example-suite-detail-list">
      {items.map((item) => (
        <div key={item.label} className="example-suite-detail-item">
          <span className="example-suite-detail-label">{item.label}</span>
          <span className="example-suite-detail-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
