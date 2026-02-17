export type PrivateLayoutStyle = 'layout_basic' | 'layout_pro';
export type PrivateLayoutMode = 'compact' | 'adjusted';

// Switch density for private areas. "adjusted" keeps more breathing room.
export const PRIVATE_LAYOUT_MODE: PrivateLayoutMode = 'adjusted';

// Keep /admin and /dashboard independent so each area can pick a different style.
export const ADMIN_LAYOUT_STYLE: PrivateLayoutStyle = 'layout_pro';
export const DASHBOARD_LAYOUT_STYLE: PrivateLayoutStyle = 'layout_pro';
