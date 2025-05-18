import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { appQueryClient } from './api/api-library';
import { Toaster } from './components/ui/toaster';
import { WebSocketProvider } from './contexts/websocket-context';
import { ApplicationSideNavProvider } from './providers/application-side-nav-provider';
import { UserProvider } from './providers/user-provider';
import { AppRoutes } from './router/routes';

const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={appQueryClient}>
      <BrowserRouter>
        <UserProvider>
          <WebSocketProvider>
            <ApplicationSideNavProvider>
              <AppRoutes />
            </ApplicationSideNavProvider>
          </WebSocketProvider>
        </UserProvider>
      </BrowserRouter>
      <Toaster />
      {enableAnalytics && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
