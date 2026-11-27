import { createSlice } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../../constants';

const initialState = {
  theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'light',
};

const commonSlice = createSlice({
  name: 'common',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem(STORAGE_KEYS.THEME, action.payload);
    },
  },
});

export const { setTheme } = commonSlice.actions;
export default commonSlice.reducer;
