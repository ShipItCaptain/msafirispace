import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

import './index.css';
import App from './App';
import { store } from './store';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            containerStyle={{ top: 80, right: 16, zIndex: 100 }}
            toastOptions={{
              duration: 4500,
              style: {
                background: '#ffffff',
                color: '#111827',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                padding: '12px 14px',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
                fontSize: '13px',
                lineHeight: '1.4',
                maxWidth: '360px',
              },
              success: {
                iconTheme: {
                  primary: '#16a34a',
                  secondary: '#ffffff',
                },
                style: {
                  borderColor: '#bbf7d0',
                  background: '#f0fdf4',
                  color: '#14532d',
                },
              },
              error: {
                iconTheme: {
                  primary: '#dc2626',
                  secondary: '#ffffff',
                },
                style: {
                  borderColor: '#fecaca',
                  background: '#fef2f2',
                  color: '#7f1d1d',
                },
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
