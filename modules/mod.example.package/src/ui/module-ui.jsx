import React from 'react';

const MODULE_STYLE = `
.example-package-layout { display: grid; gap: 1rem; color: var(--color-foreground, inherit); }
.example-package-hero { border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 70%, transparent); border-radius: .75rem; padding: 1rem; background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary, #0f766e) 10%, transparent), transparent); }
.example-package-hero-title { margin: 0; font-size: 1.25rem; font-weight: 700; }
.example-package-hero-description { margin: .35rem 0 0; font-size: .9rem; color: color-mix(in srgb, var(--color-foreground, #111827) 72%, transparent); }
.example-package-content { display: grid; gap: 1rem; }
.example-package-card { border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 70%, transparent); border-radius: .75rem; overflow: hidden; background: var(--color-background, #fff); }
.example-package-card-header { border-bottom: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 55%, transparent); padding: .9rem 1rem; display: grid; gap: .35rem; }
.example-package-card-title { margin: 0; font-size: 1rem; font-weight: 700; }
.example-package-card-description { margin: 0; font-size: .86rem; color: color-mix(in srgb, var(--color-foreground, #111827) 72%, transparent); }
.example-package-card-body { display: grid; gap: .85rem; padding: 1rem; }
.example-package-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
.example-package-button { display: inline-flex; align-items: center; justify-content: center; gap: .35rem; height: 2rem; padding: 0 .75rem; border-radius: .5rem; border: 1px solid transparent; font-size: .84rem; text-decoration: none; cursor: pointer; }
.example-package-button-primary { background: var(--color-primary, #0f766e); color: var(--color-primary-foreground, #f8fafc); }
.example-package-button-secondary { border-color: color-mix(in srgb, var(--color-border, #d5d7db) 85%, transparent); background: var(--color-background, #fff); color: var(--color-foreground, #111827); }
.example-package-button-danger { background: #b91c1c; color: #fef2f2; }
.example-package-info-text { margin: 0; font-size: .9rem; }
.example-package-badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid transparent; font-size: .72rem; line-height: 1; padding: .2rem .45rem; text-transform: lowercase; }
.example-package-badge-active { border-color: color-mix(in srgb, #059669 60%, transparent); background: color-mix(in srgb, #059669 12%, transparent); color: color-mix(in srgb, #059669 82%, var(--color-foreground, #111827)); }
.example-package-badge-archived { border-color: color-mix(in srgb, #64748b 60%, transparent); background: color-mix(in srgb, #64748b 12%, transparent); color: color-mix(in srgb, #64748b 82%, var(--color-foreground, #111827)); }
.example-package-badge-draft { border-color: color-mix(in srgb, #d97706 60%, transparent); background: color-mix(in srgb, #d97706 12%, transparent); color: color-mix(in srgb, #d97706 82%, var(--color-foreground, #111827)); }
.example-package-label { display: block; font-size: .84rem; font-weight: 600; margin: 0 0 .25rem; }
.example-package-input, .example-package-textarea, .example-package-select { width: 100%; border-radius: .5rem; border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 85%, transparent); background: var(--color-background, #fff); color: var(--color-foreground, #111827); padding: .45rem .6rem; font-size: .88rem; }
.example-package-textarea { min-height: 6rem; resize: vertical; }
.example-package-data-table { display: grid; gap: .85rem; }
`;

function joinClassNames(...values) {
  return values.filter(Boolean).join(' ');
}

function asChildren(value) {
  if (Array.isArray(value)) {
    return value.filter((entry) => entry !== undefined && entry !== null);
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

function ModuleStyleTag() {
  return <style>{MODULE_STYLE}</style>;
}

export function ModuleLayout({ title, description, children }) {
  return (
    <div className="example-package-layout">
      <ModuleStyleTag />
      <section className="example-package-hero">
        <h1 className="example-package-hero-title">{title}</h1>
        {description ? (
          <p className="example-package-hero-description">{description}</p>
        ) : null}
      </section>
      <section className="example-package-content">{asChildren(children)}</section>
    </div>
  );
}

export function ModuleCard({ title, description, children, actions }) {
  return (
    <article className="example-package-card">
      <header className="example-package-card-header">
        <h2 className="example-package-card-title">{title}</h2>
        {description ? (
          <p className="example-package-card-description">{description}</p>
        ) : null}
        {actions ? (
          <div className="example-package-actions">{asChildren(actions)}</div>
        ) : null}
      </header>
      <div className="example-package-card-body">{asChildren(children)}</div>
    </article>
  );
}

export function ActionLink({ href, label }) {
  return (
    <a
      href={href}
      className={joinClassNames(
        'example-package-button',
        'example-package-button-secondary'
      )}
    >
      {label}
    </a>
  );
}

export function SubmitButton({ label, tone = 'primary' }) {
  return (
    <button
      type="submit"
      className={joinClassNames(
        'example-package-button',
        tone === 'danger'
          ? 'example-package-button-danger'
          : 'example-package-button-primary'
      )}
    >
      {label}
    </button>
  );
}

export function InfoText({ children }) {
  return <p className="example-package-info-text">{children}</p>;
}

export function Badge({ value }) {
  const normalized = String(value).trim().toLowerCase();
  let toneClass = 'example-package-badge-draft';

  if (normalized === 'active') {
    toneClass = 'example-package-badge-active';
  } else if (normalized === 'archived') {
    toneClass = 'example-package-badge-archived';
  }

  return (
    <span className={joinClassNames('example-package-badge', toneClass)}>
      {normalized}
    </span>
  );
}

export function FieldLabel({ htmlFor, label }) {
  return (
    <label htmlFor={htmlFor} className="example-package-label">
      {label}
    </label>
  );
}

export function TextInput({ className, ...props }) {
  return (
    <input
      {...props}
      className={joinClassNames('example-package-input', className)}
    />
  );
}

export function TextArea({ className, ...props }) {
  return (
    <textarea
      {...props}
      className={joinClassNames('example-package-textarea', className)}
    />
  );
}

export function SelectInput({ className, children, ...props }) {
  return (
    <select
      {...props}
      className={joinClassNames('example-package-select', className)}
    >
      {children}
    </select>
  );
}

export function FormActions({ children }) {
  return <div className="example-package-actions">{asChildren(children)}</div>;
}
