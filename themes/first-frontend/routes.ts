const routes = [
  {
    path: '/__layout',
    loader: () => import('./templates/layout.frontend.shell')
  },
  {
    path: '/',
    loader: () => import('./templates/page.frontend.home')
  },
  {
    path: '/pricing',
    loader: () => import('./templates/page.frontend.pricing')
  },
  {
    path: '/packs',
    loader: () => import('./templates/page.frontend.packs')
  },
  {
    path: '/404',
    loader: () => import('./templates/system.not-found')
  }
];

export default routes;
