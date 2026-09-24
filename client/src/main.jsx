import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import './index.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import { store } from './store';
import { queryClient } from './lib/queryClient';
import { lightTheme, darkTheme } from './theme';
import ThemeProvider from './components/providers/ThemeProvider';
import { STORAGE_KEYS } from './constants';
import App from './App';

const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider
          theme={savedTheme === 'dark' ? darkTheme : lightTheme}
          defaultColorScheme={savedTheme}
        >
          <ThemeProvider>
            <Notifications position="top-right" />
            <App />
          </ThemeProvider>
        </MantineProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);
