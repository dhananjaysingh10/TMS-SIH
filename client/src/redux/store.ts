import { combineReducers, configureStore } from '@reduxjs/toolkit';
import userReducer from './user/userSlice';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

interface RootState {
  user: {
    currentUser: { _id: string; name: string; email: string; role: string; department: string; profilePicture: string;} | null;
    error: string | null;
    loading: boolean;
  };
}

const rootReducer = combineReducers({
  user: userReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  version: 1,
  whitelist: ['user'], 
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['user.currentUser'],
      },
    }),
});

export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
export type RootStateType = RootState; 

export const persistor = persistStore(store);