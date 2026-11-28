import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MantineProvider } from '@mantine/core';
import { lightTheme, darkTheme } from '../../theme';

export default function ThemeProvider({ children }) {
  const theme = useSelector((state) => state.common.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <MantineProvider
      theme={theme === 'dark' ? darkTheme : lightTheme}
      forceColorScheme={theme}
    >
      {children}
    </MantineProvider>
  );
}
