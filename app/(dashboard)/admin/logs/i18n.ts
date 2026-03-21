import type { DataTableLabels } from '@/components/ui/data-table';
import type { Translator } from '@/lib/i18n/translator';

export type AdminLogsCopy = {
  title: string;
  description: string;
  tabs: {
    system: string;
    email: string;
  };
  filterPlaceholder: string;
  table: {
    createdHeader: string;
    eventHeader: string;
    categoryHeader: string;
    actionHeader: string;
    statusHeader: string;
    actorHeader: string;
    targetHeader: string;
    teamHeader: string;
    entityHeader: string;
    sourceHeader: string;
    ipHeader: string;
    messageHeader: string;
    noActor: string;
    noTarget: string;
    noTeam: string;
    noEntity: string;
    noSource: string;
    info: string;
    success: string;
    warning: string;
    failed: string;
  };
  email: {
    logsEmpty: string;
    status: {
      queued: string;
      sent: string;
      failed: string;
      skipped: string;
    };
    logsHeaders: {
      created: string;
      status: string;
      event: string;
      recipient: string;
      subject: string;
      source: string;
      message: string;
      details: string;
    };
  };
  dataTable: DataTableLabels;
};

export function createAdminLogsCopy(t: Translator): AdminLogsCopy {
  return {
    title: t('Logs'),
    description: t(
      'Centralized view for system audit events and email delivery records.'
    ),
    tabs: {
      system: t('System logs'),
      email: t('Email logs')
    },
    filterPlaceholder: t('Filter by event...'),
    table: {
      createdHeader: t('Created'),
      eventHeader: t('Event'),
      categoryHeader: t('Category'),
      actionHeader: t('Action'),
      statusHeader: t('Status'),
      actorHeader: t('Actor'),
      targetHeader: t('Target'),
      teamHeader: t('Team'),
      entityHeader: t('Entity'),
      sourceHeader: t('Source'),
      ipHeader: t('IP'),
      messageHeader: t('Message'),
      noActor: t('System'),
      noTarget: t('N/A'),
      noTeam: t('No team'),
      noEntity: t('-'),
      noSource: t('-'),
      info: t('info'),
      success: t('success'),
      warning: t('warning'),
      failed: t('error')
    },
    email: {
      logsEmpty: t('No email logs recorded yet.'),
      status: {
        queued: t('Queued'),
        sent: t('Sent'),
        failed: t('Failed'),
        skipped: t('Skipped')
      },
      logsHeaders: {
        created: t('Created'),
        status: t('Status'),
        event: t('Event'),
        recipient: t('Recipient'),
        subject: t('Subject'),
        source: t('Source'),
        message: t('Message'),
        details: t('Details')
      }
    },
    dataTable: {
      filterPlaceholder: t('Filter...'),
      columns: t('Columns'),
      noResults: t('No results.'),
      showingRows: t('Showing {shown} of {filtered} row(s).'),
      previous: t('Previous'),
      next: t('Next')
    }
  };
}
