"use client";
import {
	createContext,
	type Dispatch,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useReducer,
	useRef,
	useState,
} from "react";
import {
	createMockBoardApi,
	type MockBoardApi,
	type MockPersistenceStatus,
} from "@/services/mockBoardApi";
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

export interface PersistenceStatusState {
	status: MockPersistenceStatus;
	message: string;
	canRetry: boolean;
}

interface AppContextValue {
	state: AppState;
	dispatch: Dispatch<AppAction>;
	isHydrated: boolean;
	persistence: PersistenceStatusState;
	retrySave: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
	children,
	mockApi = createMockBoardApi(),
}: {
	children: ReactNode;
	mockApi?: MockBoardApi;
}) {
	const [state, dispatch] = useReducer(appReducer, initialAppState);
	const [isHydrated, setIsHydrated] = useState(false);
	const [storageStatus, setStorageStatus] = useState<
		StorageLoadResult["status"] | "pending"
	>("pending");
	const [persistence, setPersistence] = useState<PersistenceStatusState>({
		status: "saving",
		message: "Loading workspace...",
		canRetry: false,
	});
	const restoredStateRef = useRef(initialAppState);
	const latestStateRef = useRef(initialAppState);
	const latestRequestRef = useRef(0);
	const persistedRevisionRef = useRef(0);
	const retryInProgressRef = useRef(false);
	const apiRef = useRef(mockApi);

	const persistState = useCallback(
		async (nextState: AppState, mode: MockPersistenceStatus = "saving") => {
			if (mode === "retrying" && retryInProgressRef.current) return;
			if (mode === "retrying") retryInProgressRef.current = true;

			const requestId = ++latestRequestRef.current;
			latestStateRef.current = nextState;
			setPersistence({
				status: mode,
				message: mode === "retrying" ? "Retrying save..." : "Saving changes...",
				canRetry: false,
			});

			try {
				const result = await apiRef.current.saveState(
					nextState,
					persistedRevisionRef.current,
				);

				persistedRevisionRef.current = Math.max(
					persistedRevisionRef.current,
					result.revision,
				);

				if (requestId !== latestRequestRef.current) return;

				if (!result.ok) {
					setPersistence({
						status: "unsaved",
						message: result.error,
						canRetry: true,
					});
					return;
				}

				setPersistence({
					status: "saved",
					message: "All changes saved.",
					canRetry: false,
				});
			} finally {
				if (mode === "retrying") retryInProgressRef.current = false;
			}
		},
		[],
	);

	const retrySave = useCallback(() => {
		void persistState(latestStateRef.current, "retrying");
	}, [persistState]);

	useEffect(() => {
		let isMounted = true;

		const initialize = async () => {
			const result = load();

			if (result.status === "loaded") {
				restoredStateRef.current = result.state;
				dispatch({ type: "state/restored", payload: result.state });
			} else {
				restoredStateRef.current = initialAppState;
			}

			const apiSnapshot = await apiRef.current.loadInitialState();
			if (!isMounted) return;

			if (apiSnapshot.status === "loaded") {
				persistedRevisionRef.current = apiSnapshot.revision;
				if (result.status !== "loaded") {
					restoredStateRef.current = apiSnapshot.state;
					dispatch({ type: "state/restored", payload: apiSnapshot.state });
				}
			}

			setStorageStatus(result.status);
			setPersistence({
				status: "saved",
				message: "All changes saved.",
				canRetry: false,
			});
			setIsHydrated(true);
		};

		void initialize();
		return () => {
			isMounted = false;
		};
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

	useEffect(() => {
		if (!isHydrated) return;
		if (state === restoredStateRef.current) return;
		void persistState(state, "saving");
	}, [isHydrated, state, persistState]);

	return (
		<AppContext.Provider
			value={{ state, dispatch, isHydrated, persistence, retrySave }}
		>
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
