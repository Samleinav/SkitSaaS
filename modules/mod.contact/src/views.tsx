import {
  TemplateBuildForm,
  composeBuildFormDefinition
} from '@skitsaas/sdk';
import { submitContactSubmissionAction } from './actions';
import { ContactSubmissionsTable } from './contact-submissions-table';
import { CONTACT_MODULE_ID } from './constants';
import { listContactSubmissions } from './data';
import { createContactSubmissionFormDefinition } from './forms';
import {
  formatContactTimestamp,
  getContactSubmissionSubject,
  parseSelectedContactSubmissionId
} from './presentation';
import type { ContactSubmissionRecord } from './types';

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
  gap: 1.25rem;
  color: var(--color-foreground, #0f172a);
}

.contact-admin-summary {
  display: grid;
  gap: 1rem;
  border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 76%, transparent);
  border-radius: 1.5rem;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--color-background, #fff) 92%, var(--color-primary, #0f766e) 8%),
      color-mix(in srgb, var(--color-background, #fff) 96%, var(--color-primary, #0f766e) 4%)
    );
  padding: 1.25rem;
}

.contact-admin-summary__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
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

.contact-admin-chip--muted {
  background: color-mix(in srgb, var(--color-foreground, #0f172a) 8%, transparent);
  color: color-mix(in srgb, var(--color-foreground, #0f172a) 78%, transparent);
}

.contact-admin-workspace {
  display: grid;
  gap: 1rem;
}

.contact-admin-panel,
.contact-admin-detail {
  border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 76%, transparent);
  border-radius: 1.5rem;
  background: var(--color-background, #fff);
  padding: 1.15rem;
}

.contact-admin-panel__eyebrow,
.contact-admin-detail__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-primary, #0f766e) 82%, var(--color-foreground, #0f172a));
}

.contact-admin-panel__title,
.contact-admin-detail__title {
  margin: 0.35rem 0 0;
  font-size: 1.2rem;
  line-height: 1.15;
}

.contact-admin-panel__copy,
.contact-admin-detail__copy {
  margin: 0.6rem 0 0;
  color: color-mix(in srgb, var(--color-foreground, #0f172a) 68%, transparent);
}

.contact-admin-detail {
  display: grid;
  gap: 1rem;
}

.contact-admin-detail__header {
  display: grid;
  gap: 0.75rem;
}

.contact-admin-detail__header-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.contact-admin-detail__title-group {
  display: grid;
  gap: 0.35rem;
}

.contact-admin-detail__from {
  margin: 0;
  font-size: 0.95rem;
  color: color-mix(in srgb, var(--color-foreground, #0f172a) 72%, transparent);
}

.contact-admin-detail__email {
  color: color-mix(in srgb, var(--color-primary, #0f766e) 82%, var(--color-foreground, #0f172a));
  text-decoration: none;
}

.contact-admin-detail__meta-grid {
  display: grid;
  gap: 0.85rem;
}

.contact-admin-detail__meta-card {
  border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 70%, transparent);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--color-background, #fff) 94%, var(--color-primary, #0f766e) 6%);
  padding: 0.9rem 1rem;
}

.contact-admin-detail__meta-label {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-foreground, #0f172a) 60%, transparent);
}

.contact-admin-detail__meta-value {
  margin: 0.45rem 0 0;
  font-weight: 600;
}

.contact-admin-detail__meta-value--muted {
  color: color-mix(in srgb, var(--color-foreground, #0f172a) 68%, transparent);
}

.contact-admin-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.contact-admin-detail__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  text-decoration: none;
}

.contact-admin-detail__action--primary {
  background: color-mix(in srgb, var(--color-primary, #0f766e) 18%, transparent);
  color: color-mix(in srgb, var(--color-primary, #0f766e) 86%, var(--color-foreground, #0f172a));
}

.contact-admin-detail__action--secondary {
  border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 80%, transparent);
  color: inherit;
}

.contact-admin-detail__message-card {
  border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 74%, transparent);
  border-radius: 1.1rem;
  background: color-mix(in srgb, var(--color-background, #fff) 96%, var(--color-primary, #0f766e) 4%);
  padding: 1rem;
}

.contact-admin-detail__message-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
}

.contact-admin-detail__message-body {
  margin: 0.75rem 0 0;
  white-space: pre-wrap;
  line-height: 1.65;
}

.contact-admin-detail__note {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--color-primary, #0f766e) 10%, transparent);
  color: color-mix(in srgb, var(--color-foreground, #0f172a) 76%, transparent);
}

.contact-admin-table__sender {
  display: grid;
  gap: 0.3rem;
}

.contact-admin-table__sender-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.contact-admin-table__sender-link {
  color: inherit;
  font-weight: 700;
  text-decoration: none;
}

.contact-admin-table__selected-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.16rem 0.5rem;
  background: color-mix(in srgb, var(--color-primary, #0f766e) 12%, transparent);
  color: color-mix(in srgb, var(--color-primary, #0f766e) 86%, var(--color-foreground, #0f172a));
  font-size: 0.72rem;
  font-weight: 700;
}

.contact-admin-table__email {
  color: color-mix(in srgb, var(--color-primary, #0f766e) 82%, var(--color-foreground, #0f172a));
  text-decoration: none;
  word-break: break-word;
}

.contact-admin-table__subject,
.contact-admin-table__preview {
  margin: 0;
  color: color-mix(in srgb, var(--color-foreground, #0f172a) 72%, transparent);
  line-height: 1.45;
}

.contact-admin-table__source {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.58rem;
  background: color-mix(in srgb, var(--color-primary, #0f766e) 10%, transparent);
  color: color-mix(in srgb, var(--color-primary, #0f766e) 80%, var(--color-foreground, #0f172a));
  font-size: 0.78rem;
  font-weight: 700;
}

.contact-admin-table__received {
  color: color-mix(in srgb, var(--color-foreground, #0f172a) 72%, transparent);
  white-space: nowrap;
}

.contact-admin-empty-state {
  display: grid;
  gap: 0.55rem;
  padding: 1rem 0;
  text-align: center;
}

.contact-admin-empty-state__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.contact-admin-empty-state__copy {
  margin: 0;
  color: color-mix(in srgb, var(--color-foreground, #0f172a) 68%, transparent);
}

@media (min-width: 1100px) {
  .contact-admin-summary {
    grid-template-columns: minmax(0, 1.8fr) minmax(280px, 0.9fr);
    align-items: end;
  }

  .contact-admin-summary__chips {
    justify-content: flex-end;
  }

  .contact-admin-workspace {
    grid-template-columns: minmax(0, 1.35fr) minmax(340px, 0.85fr);
    align-items: start;
  }

  .contact-admin-detail {
    position: sticky;
    top: 1rem;
  }

  .contact-admin-detail__meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;

function resolveSelectedContactSubmission(
  submissions: ContactSubmissionRecord[],
  selectedSubmissionId: number | null
) {
  if (selectedSubmissionId != null) {
    const matched = submissions.find(
      (submission) => submission.id === selectedSubmissionId
    );
    if (matched) {
      return matched;
    }
  }

  return submissions[0] ?? null;
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

export async function renderContactAdminPage(
  searchParams?: Record<string, string | string[] | undefined>
) {
  const submissions = await listContactSubmissions(200);
  const requestedSubmissionId = parseSelectedContactSubmissionId(searchParams);
  const selectedSubmission = resolveSelectedContactSubmission(
    submissions,
    requestedSubmissionId
  );
  const selectedSubject = selectedSubmission
    ? getContactSubmissionSubject(selectedSubmission)
    : null;
  const selectedReplyHref = selectedSubmission
    ? `mailto:${selectedSubmission.email}?subject=${encodeURIComponent(`Re: ${selectedSubject}`)}`
    : null;
  const showingFallbackSelection =
    requestedSubmissionId != null &&
    selectedSubmission != null &&
    selectedSubmission.id !== requestedSubmissionId;

  return (
    <div className="contact-admin-shell">
      <style>{contactFrontendStyles}</style>

      <section className="contact-admin-summary">
        <div>
          <p className="contact-admin-shell__eyebrow">Contact module</p>
          <h1 className="contact-admin-shell__title">Contact inbox</h1>
          <p className="contact-admin-shell__copy">
            The public form is live. Use the inbox queue to triage messages fast,
            then open one submission to read the full context and reply from the
            sender email.
          </p>
        </div>
        <div className="contact-admin-summary__chips">
          <p className="contact-admin-chip">
            {submissions.length} recent submission{submissions.length === 1 ? '' : 's'}
          </p>
          <p className="contact-admin-chip contact-admin-chip--muted">
            {selectedSubmission ? `Viewing #${selectedSubmission.id}` : 'Waiting for first message'}
          </p>
        </div>
      </section>

      <div className="contact-admin-workspace">
        <section className="contact-admin-panel">
          <p className="contact-admin-panel__eyebrow">Inbox queue</p>
          <h2 className="contact-admin-panel__title">Recent submissions</h2>
          <p className="contact-admin-panel__copy">
            Search by sender, subject, or message body. Open one row to keep the
            full message visible while you continue triaging the queue.
          </p>
          <ContactSubmissionsTable
            submissions={submissions}
            selectedSubmissionId={selectedSubmission?.id ?? null}
          />
        </section>

        <aside className="contact-admin-detail">
          {selectedSubmission ? (
            <>
              <header className="contact-admin-detail__header">
                <div className="contact-admin-detail__header-row">
                  <div className="contact-admin-detail__title-group">
                    <p className="contact-admin-detail__eyebrow">
                      Message #{selectedSubmission.id}
                    </p>
                    <h2 className="contact-admin-detail__title">
                      {selectedSubject}
                    </h2>
                    <p className="contact-admin-detail__from">
                      From <strong>{selectedSubmission.name}</strong>{' '}
                      <a
                        className="contact-admin-detail__email"
                        href={`mailto:${selectedSubmission.email}`}
                      >
                        {selectedSubmission.email}
                      </a>
                    </p>
                  </div>

                  <p className="contact-admin-chip contact-admin-chip--muted">
                    {formatContactTimestamp(selectedSubmission.createdAt)}
                  </p>
                </div>

                {showingFallbackSelection ? (
                  <p className="contact-admin-detail__note">
                    Message #{requestedSubmissionId} is not in the recent queue, so
                    the newest available submission is shown instead.
                  </p>
                ) : null}
              </header>

              <div className="contact-admin-detail__meta-grid">
                <section className="contact-admin-detail__meta-card">
                  <p className="contact-admin-detail__meta-label">Sender</p>
                  <p className="contact-admin-detail__meta-value">
                    {selectedSubmission.name}
                  </p>
                </section>

                <section className="contact-admin-detail__meta-card">
                  <p className="contact-admin-detail__meta-label">Reply to</p>
                  <p className="contact-admin-detail__meta-value">
                    <a
                      className="contact-admin-detail__email"
                      href={`mailto:${selectedSubmission.email}`}
                    >
                      {selectedSubmission.email}
                    </a>
                  </p>
                </section>

                <section className="contact-admin-detail__meta-card">
                  <p className="contact-admin-detail__meta-label">Source</p>
                  <p className="contact-admin-detail__meta-value contact-admin-detail__meta-value--muted">
                    {selectedSubmission.sourcePath ?? 'Unknown source'}
                  </p>
                </section>

                <section className="contact-admin-detail__meta-card">
                  <p className="contact-admin-detail__meta-label">Received</p>
                  <p className="contact-admin-detail__meta-value contact-admin-detail__meta-value--muted">
                    {formatContactTimestamp(selectedSubmission.createdAt)}
                  </p>
                </section>
              </div>

              <div className="contact-admin-detail__actions">
                {selectedReplyHref ? (
                  <a
                    className="contact-admin-detail__action contact-admin-detail__action--primary"
                    href={selectedReplyHref}
                  >
                    Reply by email
                  </a>
                ) : null}
                {selectedSubmission.sourcePath ? (
                  <a
                    className="contact-admin-detail__action contact-admin-detail__action--secondary"
                    href={selectedSubmission.sourcePath}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open source page
                  </a>
                ) : null}
              </div>

              <article className="contact-admin-detail__message-card">
                <h3 className="contact-admin-detail__message-title">
                  Message body
                </h3>
                <p className="contact-admin-detail__message-body">
                  {selectedSubmission.message}
                </p>
              </article>
            </>
          ) : (
            <>
              <p className="contact-admin-detail__eyebrow">Detail view</p>
              <h2 className="contact-admin-detail__title">No messages yet</h2>
              <p className="contact-admin-detail__copy">
                Submit a message from <code>/contact-us</code> and it will appear
                here with sender metadata and the full body ready for review.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
