import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  listings: [],
  loading: false,
  error: null,
};

const listingsSlice = createSlice({
  name: 'listings',
  initialState,
  reducers: {
    setListings: (state, action) => {
      state.listings = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setListings, setLoading, setError } = listingsSlice.actions;
export default listingsSlice.reducer;
