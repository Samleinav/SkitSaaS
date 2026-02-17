import { emitEvent } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import type { AppConfigSectionExtraItem } from './section-nav.client';
import { AppConfigSectionNavClient } from './section-nav.client';

export async function AppConfigSectionNav() {
  const payload: { items: AppConfigSectionExtraItem[] } = { items: [] };

  await emitEvent(
    EVENT_HOOKS.adminAppConfigSectionsCompose,
    payload,
    { source: '/admin/app-config' }
  );

  return <AppConfigSectionNavClient extraItems={payload.items} />;
}
