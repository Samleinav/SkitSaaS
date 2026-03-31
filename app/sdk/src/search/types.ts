export type SearchArea = 'admin' | 'dashboard' | 'frontend' | 'portal';
export type SearchAudience = 'public' | 'user' | 'admin';
export type SearchContextTag = string;
export type SearchPortalRouteArea = 'standalone' | 'dashboard';
export type SearchDashboardContextType =
  | 'system_admin'
  | 'team_member'
  | 'standalone'
  | 'public';

export type SearchResultSourceType = 'core' | 'module' | 'theme' | 'provider';

export type SearchContext = {
  query: string;
  area: SearchArea;
  pathname: string;
  portalName?: string | null;
  portalRouteArea?: SearchPortalRouteArea | null;
  themeId?: string | null;
  audience: SearchAudience;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userId?: number | null;
  userRole?: string | null;
  teamId?: number | null;
  dashboardContextType?: SearchDashboardContextType | null;
  contextTags: SearchContextTag[];
  limit?: number;
};

export type SearchResultItem = {
  id: string;
  title: string;
  href: string;
  description?: string;
  keywords?: string[];
  group?: string;
  icon?: string;
  areas?: SearchArea[];
  contextTags?: SearchContextTag[];
  portalNames?: string[];
  audience?: SearchAudience;
  order?: number;
  sourceId?: string;
  sourceType?: SearchResultSourceType;
};

export type SearchStaticEntry = SearchResultItem;
export type SearchProviderResult = SearchResultItem;

export type SearchProvider = {
  providerId: string;
  areas?: SearchArea[];
  contextTags?: SearchContextTag[];
  portalNames?: string[];
  audience?: SearchAudience;
  enabled?: (context: SearchContext) => boolean | Promise<boolean>;
  search:
    | ((
        context: SearchContext
      ) =>
        | SearchProviderResult
        | SearchProviderResult[]
        | Promise<SearchProviderResult | SearchProviderResult[]>)
    | ((
        context: SearchContext
      ) => Promise<SearchProviderResult[] | SearchProviderResult>);
};
