import { createSlice } from "@reduxjs/toolkit";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  profilePicture: string;
}

interface UserState {
  currentUser: User | null;
  error: string | null;
  loading: boolean;
}

const initialState: UserState = {
  currentUser: null,
  error: null,
  loading: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    signInStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    signInSuccess: (state, action) => {
      state.currentUser = action.payload;
      state.loading = false;
      state.error = null;
    },
    signInFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    deleteUserStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    deleteUserSuccess: (state) => {
      state.currentUser = null;
      state.loading = false;
      state.error = null;
    },
    deleteUserFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    signoutSuccess: (state) => {
      state.currentUser = null;
      state.error = null;
      state.loading = false;
    },
    updateStart: (state) => {
      state.error = null;
      state.loading = true;
    },
    updateSuccess: (state, action) => {
      state.currentUser = action.payload;
      state.error = null;
      state.loading = false;
    },
    updateFailure: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  signInStart,
  signInSuccess,
  signInFailure,
  deleteUserFailure,
  deleteUserStart,
  deleteUserSuccess,
  signoutSuccess,
  updateFailure,
  updateStart,
  updateSuccess,
} = userSlice.actions;

export default userSlice.reducer;

export const selectCurrentUser = (state: { user: UserState }) => state.user.currentUser;