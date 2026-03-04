export type DashboardContextType =
  | 'system_admin'
  | 'team_member'
  | 'standalone'
  | 'public';

export function resolveDashboardNavItemsForContext<TNavItem>({
  contextType,
  teamMemberItems,
  standaloneItems
}: {
  contextType: DashboardContextType;
  teamMemberItems: TNavItem[];
  standaloneItems: TNavItem[];
}) {
  if (contextType === 'team_member') {
    return [...teamMemberItems];
  }

  if (contextType === 'standalone') {
    return [...standaloneItems];
  }

  return [] as TNavItem[];
}
