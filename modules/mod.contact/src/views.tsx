import {
  TemplateBuildForm,
  composeBuildFormDefinition
} from '@skitsaas/sdk';
import { submitContactSubmissionAction } from './actions';
import { CONTACT_MODULE_ID } from './constants';
import { listContactSubmissions } from './data';
import { createContactSubmissionFormDefinition } from './forms';

const contactFrontendStyles = `
.contact-module-slot {
  border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 76%, transparent);
  border-radius: 1.5rem;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--color-primary, #0f766e) 7%, var(--color-background, #fff)),
      var(--color-background, #fff)
    );
  box-shadow: 0 24px 60px color-mix(in srgb, var(--color-primary, #0f766e) 14%, transparent);
  padding: 1.25rem;
}

.contact-module-slot__eyebrow,
.contact-admin-shell__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-primary, #0f766e) 82%, var(--color-foreground, #0f172a));
}

.contact-module-slot__title,
.contact-admin-shell__title {
  margin: 0.35rem 0 0;
  font-size: 1.5rem;
  line-height: 1.1;
}

.contact-module-slot__copy,
.contact-admin-shell__copy,
.contact-admin-empty {
  margin: 0.6rem 0 0;
  color: color-mix(in srgb, var(--color-foreground, #0f172a) 70%, transparent);
}

.contact-module-slot__note {
  margin-top: 0.95rem;
  font-size: 0.9rem;
  color: color-mix(in srgb, var(--color-foreground, #0f172a) 66%, transparent);
}

.contact-module-slot__form {
  margin-top: 1.15rem;
}

.contact-admin-shell {
  display: grid;
  gap: 1rem;
  color: var(--color-foreground, #0f172a);
}

.contact-admin-summary {
  border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 76%, transparent);
  border-radius: 1.25rem;
  background: color-mix(in srgb, var(--color-background, #fff) 92%, var(--color-primary, #0f766e) 8%);
  padding: 1.25rem;
}

.contact-admin-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary, #0f766e) 12%, transparent);
  color: color-mix(in srgb, var(--color-primary, #0f766e) 86%, var(--color-foreground, #0f172a));
  padding: 0.4rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.contact-admin-list {
  display: grid;
  gap: 1rem;
}

.contact-admin-card {
  border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 76%, transparent);
  border-radius: 1.25rem;
  background: var(--color-background, #fff);
  padding: 1rem 1.1rem;
}

.contact-admin-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}

.contact-admin-card__identity {
  display: grid;
  gap: 0.22rem;
}

.contact-admin-card__name {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.contact-admin-card__email {
  color: color-mix(in srgb, var(--color-primary, #0f766e) 82%, var(--color-foreground, #0f172a));
  text-decoration: none;
}

.contact-admin-card__meta {
  font-size: 0.84rem;
  color: color-mix(in srgb, var(--color-foreground, #0f172a) 65%, transparent);
}

.contact-admin-card__subject {
  margin: 0.9rem 0 0;
  font-size: 0.92rem;
  font-weight: 700;
}

.contact-admin-card__route {
  display: inline-flex;
  margin-top: 0.75rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary, #0f766e) 10%, transparent);
  padding: 0.24rem 0.58rem;
  font-size: 0.78rem;
  color: color-mix(in srgb, var(--color-primary, #0f766e) 80%, var(--color-foreground, #0f172a));
}

.contact-admin-card__message {
  margin: 0.8rem 0 0;
  white-space: pre-wrap;
  line-height: 1.55;
}
`;

function formatContactTimestamp(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(value);
}

export function renderContactFrontendSlot(route?: string | null) {
  const resolvedRoute = route || '/contact-us';
  const definition = composeBuildFormDefinition(
    createContactSubmissionFormDefinition(),
    {
      request: {
        action: submitContactSubmissionAction,
        method: 'post'
      },
      submit: {
        idleLabel: 'Send message',
        pendingLabel: 'Sending...',
        successLabel: 'Sent',
        align: 'start'
      },
      values: {
        sourcePath: resolvedRoute
      }
    }
  );

  return (
    <section className="contact-module-slot">
      <style>{contactFrontendStyles}</style>
      <p className="contact-module-slot__eyebrow">Contact inbox</p>
      <h2 className="contact-module-slot__title">Send us a message</h2>
      <p className="contact-module-slot__copy">
        This form stores messages in the contact module so your team can review
        them from the admin area.
      </p>
      <p className="contact-module-slot__note">
        We usually reply by email, so make sure the address is correct.
      </p>

      <div className="contact-module-slot__form">
        <TemplateBuildForm
          definition={definition}
          area="frontend"
          route={resolvedRoute}
          moduleId={CONTACT_MODULE_ID}
          slot="mod.contact.frontend.contact-form"
        />
      </div>
    </section>
  );
}

export async function renderContactAdminPage() {
  const submissions = await listContactSubmissions();

  return (
    <div className="contact-admin-shell">
      <style>{contactFrontendStyles}</style>

      <section className="contact-admin-summary">
        <p className="contact-admin-shell__eyebrow">Contact module</p>
        <h1 className="contact-admin-shell__title">Contact submissions</h1>
        <p className="contact-admin-shell__copy">
          Messages sent from the public contact form are stored here. Open the
          newest submissions first and reply using the sender email.
        </p>
        <p className="contact-admin-chip">
          {submissions.length} recent submission{submissions.length === 1 ? '' : 's'}
        </p>
      </section>

      {submissions.length === 0 ? (
        <section className="contact-admin-card">
          <p className="contact-admin-empty">
            No contact messages yet. Submit one from <code>/contact-us</code> to
            populate the inbox.
          </p>
        </section>
      ) : (
        <section className="contact-admin-list">
          {submissions.map((submission) => (
            <article key={submission.id} className="contact-admin-card">
              <header className="contact-admin-card__header">
                <div className="contact-admin-card__identity">
                  <h2 className="contact-admin-card__name">{submission.name}</h2>
                  <a
                    className="contact-admin-card__email"
                    href={`mailto:${submission.email}`}
                  >
                    {submission.email}
                  </a>
                </div>
                <div className="contact-admin-card__meta">
                  {formatContactTimestamp(submission.createdAt)}
                </div>
              </header>

              {submission.subject ? (
                <p className="contact-admin-card__subject">{submission.subject}</p>
              ) : null}

              {submission.sourcePath ? (
                <div className="contact-admin-card__route">
                  Source: {submission.sourcePath}
                </div>
              ) : null}

              <p className="contact-admin-card__message">{submission.message}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
