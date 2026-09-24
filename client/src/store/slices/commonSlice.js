import { createSlice } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../../constants';

const initialState = {
  theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'light',
  sidebarCollapsed: true,
  filters: {},
};

const commonSlice = createSlice({
  name: 'common',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem(STORAGE_KEYS.THEME, action.payload);
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
});

export const { setTheme, toggleSidebar, setFilters, clearFilters } = commonSlice.actions;
export default commonSlice.reducer;
