import { defineThemeConfig } from '@skitsaas/sdk';

export default defineThemeConfig({
  head: {
    fonts: [
      'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap'
    ]
  },
  assets: {
    globalCssByArea: {
      frontend: 'global.css'
    },
    faviconByArea: {
      frontend: 'assets/favicon-frontend.svg'
    },
    notFoundTemplateByArea: {
      frontend: 'system.not-found'
    }
  }
});
