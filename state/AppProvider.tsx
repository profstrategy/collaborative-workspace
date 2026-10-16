'use client'
import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { AppState } from "./domain.types";
import { AppAction } from "./app.actions";
import { appReducer } from "./app.reducer";
import { initialAppState } from "./app.initialState";

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    appReducer,
    initialAppState
  );

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppProvider() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      "useAppProvider must be used inside AppProvider"
    );
  }

  return context;
}