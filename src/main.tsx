import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/app/App';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { DemoDataProvider } from '@/lib/demo/store';
import '@/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root was not found.');

createRoot(container).render(
  <React.StrictMode>
    <AuthProvider>
      <DemoDataProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DemoDataProvider>
    </AuthProvider>
  </React.StrictMode>,
);
