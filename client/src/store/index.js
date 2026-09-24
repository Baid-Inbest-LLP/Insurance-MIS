import { configureStore } from '@reduxjs/toolkit';
import commonReducer from './slices/commonSlice';

// Redux now holds only pure UI state (theme, sidebar, filters).
// All server state is managed by React Query (see src/hooks/*).
export const store = configureStore({
  reducer: {
    common: commonReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});
