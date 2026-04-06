'use client';

import {
  DataTable,
  buildTableAction,
  buildTableColumn,
  buildTableFilter,
  defineBuildTable
} from '@skitsaas/sdk';
import { CONTACT_ADMIN_ALIAS } from './constants';
import {
  createContactMessagePreview,
  formatContactTimestamp,
  getContactSubmissionSubject
} from './presentation';
import type { ContactSubmissionRecord } from './types';

type ContactSubmissionsTableProps = {
  submissions: ContactSubmissionRecord[];
  selectedSubmissionId?: number | null;
};

function getContactMessageHref(messageId: number) {
  return `${CONTACT_ADMIN_ALIAS}?messageId=${messageId}`;
}

function createContactSubmissionsTable({
  submissions,
  selectedSubmissionId
}: ContactSubmissionsTableProps) {
  const sourceOptions = Array.from(
    new Set(
      submissions
        .map((submission) => submission.sourcePath)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  )
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({
      value,
      label: value
    }));

  return defineBuildTable<ContactSubmissionRecord, any>({
    data: submissions,
    className: 'contact-admin-table',
    columns: [
      buildTableColumn.custom<ContactSubmissionRecord>({
        key: 'sender',
        header: 'Sender',
        searchable: true,
        sortable: true,
        filterValue: (submission) =>
          [
            submission.name,
            submission.email,
            submission.subject ?? '',
            submission.message
          ].join(' '),
        sortValue: (submission) => submission.name,
        cell: (submission) => {
          const isSelected = submission.id === selectedSubmissionId;
          return (
            <div className="contact-admin-table__sender">
              <div className="contact-admin-table__sender-row">
                <a
                  className="contact-admin-table__sender-link"
                  href={getContactMessageHref(submission.id)}
                >
                  {submission.name}
                </a>
                {isSelected ? (
                  <span className="contact-admin-table__selected-pill">Selected</span>
                ) : null}
              </div>
              <a
                className="contact-admin-table__email"
                href={`mailto:${submission.email}`}
              >
                {submission.email}
              </a>
              <p className="contact-admin-table__subject">
                {getContactSubmissionSubject(submission)}
              </p>
            </div>
          );
        }
      }),
      buildTableColumn.custom<ContactSubmissionRecord>({
        key: 'messagePreview',
        header: 'Message',
        searchable: true,
        filterValue: (submission) => submission.message,
        cell: (submission) => (
          <p className="contact-admin-table__preview">
            {createContactMessagePreview(submission.message, 150)}
          </p>
        )
      }),
      buildTableColumn.custom<ContactSubmissionRecord>({
        key: 'sourcePath',
        header: 'Source',
        sortable: true,
        sortValue: (submission) => submission.sourcePath ?? '',
        cell: (submission) => (
          <span className="contact-admin-table__source">
            {submission.sourcePath ?? 'Unknown source'}
          </span>
        )
      }),
      buildTableColumn.custom<ContactSubmissionRecord>({
        key: 'createdAt',
        header: 'Received',
        sortable: true,
        sortValue: (submission) => submission.createdAt,
        cell: (submission) => (
          <time
            className="contact-admin-table__received"
            dateTime={submission.createdAt.toISOString()}
          >
            {formatContactTimestamp(submission.createdAt)}
          </time>
        )
      }),
      buildTableColumn.actions<ContactSubmissionRecord>({
        key: 'actions',
        header: 'Actions',
        actions: (submission) => [
          buildTableAction.link({
            label: submission.id === selectedSubmissionId ? 'Selected' : 'Open',
            href: getContactMessageHref(submission.id)
          })
        ]
      })
    ],
    toolbar: {
      search: {
        enabled: true,
        placeholder: 'Search sender, subject, or message',
        columns: ['sender', 'messagePreview']
      },
      filters: sourceOptions.length
        ? [
            buildTableFilter.select<ContactSubmissionRecord>({
              id: 'sourcePath',
              label: 'Source',
              column: 'sourcePath',
              placeholder: 'All sources',
              options: sourceOptions
            })
          ]
        : []
    },
    pagination: {
      pageSize: 8,
      pageSizeOptions: [8, 16, 24]
    },
    emptyState: (
      <div className="contact-admin-empty-state">
        <p className="contact-admin-empty-state__title">No submissions yet</p>
        <p className="contact-admin-empty-state__copy">
          Messages sent from <code>/contact-us</code> will appear here as soon as
          the public form is used.
        </p>
      </div>
    )
  });
}

export function ContactSubmissionsTable(props: ContactSubmissionsTableProps) {
  return <DataTable definition={createContactSubmissionsTable(props)} />;
}
