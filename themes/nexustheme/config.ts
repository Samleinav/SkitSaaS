import { defineThemeConfig } from '@skitsaas/sdk';

export default defineThemeConfig({
  additionalLocales: ['fr'],
  head: {
    fonts: [
      'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap'
    ]
  },
  assets: {
    globalCssByArea: {
      admin: 'global.css',
      dashboard: 'global.css'
    },
    ignoreCoreCssByArea: {
      admin: true,
      dashboard: true
    },
    faviconByArea: {
      admin: 'assets/favicon-admin.svg',
      dashboard: 'assets/favicon-dashboard.svg'
    },
    loginThemeAreaByPath: {
      '/admin/login': 'admin',
      '/login': 'dashboard',
      '/sign-up': 'dashboard'
    },
    notFoundTemplateByArea: {
      admin: 'system.not-found',
      dashboard: 'system.not-found'
    }
  }
});
