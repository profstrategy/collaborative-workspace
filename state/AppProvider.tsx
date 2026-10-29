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
import { useToast } from "@/components/ui/ToastProvider";
import {
	createSimulatedCollaborationClient,
	type SimulatedCollaborationClient,
} from "@/services/collaboration/simulatedCollaboration";
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
import type { AppState } from "./domain.types";
import type { HistoryEvent, HistoryState } from "./history.types";
import { createRootState, rootReducer } from "./root.reducer";

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
	undo: () => void;
	redo: () => void;
	canUndo: boolean;
	canRedo: boolean;
	history: HistoryState;
	lastHistoryEvent: HistoryEvent | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
	children,
	mockApi = createMockBoardApi(),
}: {
	children: ReactNode;
	mockApi?: MockBoardApi;
}) {
	const [root, reducerDispatch] = useReducer(
		rootReducer,
		initialAppState,
		createRootState,
	);
	const state = root.domain; // every existing effect keeps working on this reference
	const { showToast } = useToast();
	const currentStateRef = useRef(state);
	currentStateRef.current = state;
	const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
	const collaborationClientRef = useRef<SimulatedCollaborationClient | null>(
		null,
	);
	const remoteSnapshotRef = useRef<AppState | null>(null);
	const dispatch = useCallback(
		(action: AppAction) => {
			const current = currentStateRef.current;
			let notification: { title: string; description?: string } | null = null;

			switch (action.type) {
				case "board/created":
					notification = {
						title: "Board created",
						description: `“${action.payload.title}” is ready to use.`,
					};
					break;
				case "board/updated":
					notification = {
						title: "Board updated",
						description: "Your board details have been updated.",
					};
					break;
				case "board/deleted": {
					const title = current.boards[action.payload.id]?.title;
					notification = {
						title: "Board deleted",
						description: title
							? `“${title}” was removed from this workspace.`
							: "The board was removed from this workspace.",
					};
					break;
				}
				case "column/created":
					notification = {
						title: "Division added",
						description: `“${action.payload.title}” was added to the board.`,
					};
					break;
				case "column/updated":
					notification = {
						title: "Division updated",
						description: "Your division changes have been applied.",
					};
					break;
				case "column/deleted": {
					const title = current.columns[action.payload.id]?.title;
					notification = {
						title: "Division deleted",
						description: title
							? `“${title}” and its contents were removed.`
							: "The division and its contents were removed.",
					};
					break;
				}
				case "card/created":
					notification = {
						title: "Card created",
						description: `“${action.payload.title}” was added to the board.`,
					};
					break;
				case "card/updated":
					notification = {
						title: "Card updated",
						description: "Your card changes have been applied.",
					};
					break;
				case "card/tags-updated":
					notification = {
						title: "Card labels updated",
						description: "The card's status labels have been updated.",
					};
					break;
				case "card/deleted": {
					const title = current.cards[action.payload.id]?.title;
					notification = {
						title: "Card deleted",
						description: title
							? `“${title}” and its comments were removed.`
							: "The card and its comments were removed.",
					};
					break;
				}
				case "card/moved":
					notification = {
						title: "Card moved",
						description: "The card has been moved to its new position.",
					};
					break;
				case "comment/created":
					notification = {
						title: "Comment added",
						description: "Your comment is now part of the discussion.",
					};
					break;
				case "comment/updated":
					notification = {
						title: "Comment updated",
						description: "Your changes to the comment have been saved locally.",
					};
					break;
				case "comment/deleted":
					notification = {
						title: "Comment deleted",
						description: "The comment was removed from the discussion.",
					};
					break;
				case "card/restored":
					notification = {
						title: "Card restored",
						description: "The card has been restored.",
					};
					break;
				case "state/restored":
				case "board/create-modal-opened":
				case "board/create-modal-closed":
				case "column/create-modal-opened":
				case "column/create-modal-closed":
					break;
			}

			reducerDispatch(action);
			if (notification) showToast({ ...notification, kind: "success" });
		},
		[showToast],
	);

	const undo = useCallback(() => {
		if (root.history.undoStack.length === 0) {
			showToast({
				title: "Nothing to undo",
				description: "There are no earlier changes in this session.",
				kind: "info",
			});
			return;
		}
		reducerDispatch({
			type: "history/undo",
			payload: { at: new Date().toISOString() },
		});
		showToast({
			title: "Last action undone",
			description: "Your previous workspace state was restored.",
			kind: "info",
		});
	}, [root.history.undoStack.length, showToast]);
	const redo = useCallback(() => {
		if (root.history.redoStack.length === 0) {
			showToast({
				title: "Nothing to redo",
				description: "There are no undone changes to reapply.",
				kind: "info",
			});
			return;
		}
		reducerDispatch({
			type: "history/redo",
			payload: { at: new Date().toISOString() },
		});
		showToast({
			title: "Action redone",
			description: "Your workspace change has been reapplied.",
			kind: "info",
		});
	}, [root.history.redoStack.length, showToast]);

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
					if (saveToastTimerRef.current)
						clearTimeout(saveToastTimerRef.current);
					setPersistence({
						status: "unsaved",
						message: result.error,
						canRetry: true,
					});
					showToast({
						title: "Changes not saved",
						description: result.error,
						kind: "error",
						duration: 6500,
					});
					return;
				}

				setPersistence({
					status: "saved",
					message: "All changes saved.",
					canRetry: false,
				});
				if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
				saveToastTimerRef.current = setTimeout(() => {
					showToast({
						title: "Changes saved",
						description:
							"Your latest workspace changes are saved in the mock API.",
						kind: "success",
						duration: 2600,
					});
				}, 450);
			} catch (error) {
				if (requestId === latestRequestRef.current) {
					if (saveToastTimerRef.current)
						clearTimeout(saveToastTimerRef.current);
					const message =
						error instanceof Error
							? error.message
							: "An unexpected persistence error occurred.";
					setPersistence({ status: "unsaved", message, canRetry: true });
					showToast({
						title: "Changes not saved",
						description: message,
						kind: "error",
						duration: 6500,
					});
				}
			} finally {
				if (mode === "retrying") retryInProgressRef.current = false;
			}
		},
		[showToast],
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
	}, [dispatch]);

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
		const client = createSimulatedCollaborationClient({
			onRemoteSnapshot: (remoteState) => {
				remoteSnapshotRef.current = remoteState;
				dispatch({ type: "state/restored", payload: remoteState });
			},
		});
		collaborationClientRef.current = client;
		return () => {
			client?.close();
			collaborationClientRef.current = null;
			if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
		};
	}, [dispatch]);

	useEffect(() => {
		if (!isHydrated) return;
		const isRemoteSnapshot = state === remoteSnapshotRef.current;
		if (isRemoteSnapshot) remoteSnapshotRef.current = null;
		if (state === restoredStateRef.current) return;
		void persistState(state, "saving");
		if (!isRemoteSnapshot)
			collaborationClientRef.current?.publishSnapshot(state);
	}, [isHydrated, state, persistState]);

	return (
		<AppContext.Provider
			value={{
				state,
				dispatch,
				isHydrated,
				persistence,
				retrySave,
				undo,
				redo,
				canUndo: root.history.undoStack.length > 0,
				canRedo: root.history.redoStack.length > 0,
				history: root.history,
				lastHistoryEvent: root.lastHistoryEvent,
			}}
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
