import type { DataTableLabels } from '@/components/ui/data-table';
import type { Translator } from '@/lib/i18n/translator';

export type AdminLogsCopy = {
  title: string;
  description: string;
  tabs: {
    system: string;
    checkout: string;
    email: string;
  };
  filterPlaceholder: string;
  categoryFilterPlaceholder: string;
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
    requestIdHeader: string;
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
  checkout: {
    filterPlaceholder: string;
    table: {
      createdHeader: string;
      outcomeHeader: string;
      eventHeader: string;
      methodHeader: string;
      providerHeader: string;
      orderTypeHeader: string;
      ownerHeader: string;
      targetHeader: string;
      sourceHeader: string;
      checkoutHeader: string;
      providerIdsHeader: string;
      messageHeader: string;
      replayed: string;
      providerPending: string;
      failed: string;
      ignored: string;
      succeeded: string;
      unknown: string;
      orderTypeOneTime: string;
      orderTypeSubscription: string;
      ownerCore: string;
      ownerModule: string;
      ownerUnknown: string;
      none: string;
      unknownTarget: string;
    };
  };
  dataTable: DataTableLabels;
};

export function createAdminLogsCopy(t: Translator): AdminLogsCopy {
  return {
    title: t('Logs'),
    description: t(
      'Choose which audit table to inspect across system, checkout, and email logs.'
    ),
    tabs: {
      system: t('System logs'),
      checkout: t('Checkout logs'),
      email: t('Email logs')
    },
    filterPlaceholder: t('Filter by event, request, source, or message...'),
    categoryFilterPlaceholder: t('Category'),
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
      requestIdHeader: t('Request ID'),
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
    checkout: {
      filterPlaceholder: t(
        'Filter by checkout, payment method, provider, target, or message...'
      ),
      table: {
        createdHeader: t('Created'),
        outcomeHeader: t('Outcome'),
        eventHeader: t('Event'),
        methodHeader: t('Payment method'),
        providerHeader: t('Provider'),
        orderTypeHeader: t('Order type'),
        ownerHeader: t('Owner'),
        targetHeader: t('Target'),
        sourceHeader: t('Source'),
        checkoutHeader: t('Checkout'),
        providerIdsHeader: t('Provider IDs'),
        messageHeader: t('Message'),
        replayed: t('Replayed'),
        providerPending: t('Provider pending'),
        failed: t('Failed'),
        ignored: t('Ignored'),
        succeeded: t('Succeeded'),
        unknown: t('Unknown'),
        orderTypeOneTime: t('One-time'),
        orderTypeSubscription: t('Subscription'),
        ownerCore: t('Core'),
        ownerModule: t('Module'),
        ownerUnknown: t('Unknown'),
        none: t('None'),
        unknownTarget: t('Unknown target')
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
