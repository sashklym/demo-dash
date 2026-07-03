import { createBrowserRouter } from 'react-router-dom';
import { BootstrapRoute } from '@/routes/BootstrapRoute';
import { DashboardPage } from '@/routes/DashboardPage';

export const router = createBrowserRouter([
  { path: '/', element: <BootstrapRoute /> },
  { path: '/d/:key', element: <DashboardPage /> },
  { path: '*', element: <BootstrapRoute /> },
]);
