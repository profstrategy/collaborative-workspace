"use client";
import {
	createContext,
	type Dispatch,
	type ReactNode,
	useContext,
	useEffect,
	useReducer,
	useRef,
	useState,
} from "react";
import {
	load,
	type StorageLoadResult,
	save,
	shouldPersistAfterHydration,
} from "@/services/storageAdapter";
import type { AppAction } from "./app.actions";
import { initialAppState } from "./app.initialState";
import { appReducer } from "./app.reducer";
import type { AppState } from "./domain.types";

interface AppContextValue {
	state: AppState;
	dispatch: Dispatch<AppAction>;
	isHydrated: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(appReducer, initialAppState);
	const [isHydrated, setIsHydrated] = useState(false);
	const [storageStatus, setStorageStatus] = useState<
		StorageLoadResult["status"] | "pending"
	>("pending");
	const restoredStateRef = useRef(initialAppState);

	useEffect(() => {
		const result = load();

		if (result.status === "loaded") {
			restoredStateRef.current = result.state;
			dispatch({ type: "state/restored", payload: result.state });
		} else {
			restoredStateRef.current = initialAppState;
		}

		setStorageStatus(result.status);
		setIsHydrated(true);
	}, []);

	useEffect(() => {
		if (!isHydrated || storageStatus === "pending") return;

		if (
			shouldPersistAfterHydration(
				storageStatus,
				state,
				restoredStateRef.current,
			)
		) {
			save(state);
		}
	}, [isHydrated, state, storageStatus]);

	return (
		<AppContext.Provider value={{ state, dispatch, isHydrated }}>
			{isHydrated ? (
				children
			) : (
				<div className="flex min-h-screen items-center justify-center text-sm text-[#4B5563]">
					Loading workspace...
				</div>
			)}
		</AppContext.Provider>
	);
}

export function useAppProvider() {
	const context = useContext(AppContext);

	if (!context) {
		throw new Error("useAppProvider must be used inside AppProvider");
	}

	return context;
}
