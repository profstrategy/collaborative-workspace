import type { AppAction } from "./app.actions";
import { appReducer } from "./app.reducer";
import type { AppState } from "./domain.types";
import {
	applyHistoryEntry,
	deriveHistoryEntry,
	emptyHistory,
	HISTORY_LIMIT,
	recordEntry,
} from "./history";
import type { HistoryEvent, HistoryState } from "./history.types";

export interface AppRootState {
	domain: AppState;
	history: HistoryState;
	lastHistoryEvent: HistoryEvent | null;
}

export type RootAction =
	| AppAction
	| { type: "history/undo"; payload: { at: string } }
	| { type: "history/redo"; payload: { at: string } };

export function createRootState(domain: AppState): AppRootState {
	return { domain, history: emptyHistory, lastHistoryEvent: null };
}

function runHistory(
	root: AppRootState,
	direction: "undo" | "redo",
	at: string,
): AppRootState {
	const stack = direction === "undo" ? root.history.undoStack : root.history.redoStack;
	const seq = (root.lastHistoryEvent?.seq ?? 0) + 1; // derived, so the reducer stays pure
	const entry = stack[stack.length - 1];

	if (!entry) {
		return { ...root, lastHistoryEvent: { seq, direction, outcome: "empty" } };
	}

	const remaining = stack.slice(0, -1);
	const result = applyHistoryEntry(root.domain, entry, direction, at);

	if (!result.ok) {
		// Drop the unusable entry so the user is never stuck on it.
		return {
			...root,
			history:
				direction === "undo"
					? { ...root.history, undoStack: remaining }
					: { ...root.history, redoStack: remaining },
			lastHistoryEvent: {
				seq, direction, outcome: "failed", entryKind: entry.kind, reason: result.reason,
			},
		};
	}

	const history: HistoryState =
		direction === "undo"
			? { undoStack: remaining, redoStack: [...root.history.redoStack, result.counterpart] }
			: {
					undoStack: [...root.history.undoStack, result.counterpart].slice(-HISTORY_LIMIT),
					redoStack: remaining,
				};

	return {
		domain: result.state,
		history,
		lastHistoryEvent: { seq, direction, outcome: "applied", entryKind: entry.kind },
	};
}

export function rootReducer(root: AppRootState, action: RootAction): AppRootState {
	switch (action.type) {
		case "history/undo":
			return runHistory(root, "undo", action.payload.at);
		case "history/redo":
			return runHistory(root, "redo", action.payload.at);
		case "state/restored":
			// Hydration is never undoable and resets history.
			return createRootState(action.payload);
		default: {
			const domain = appReducer(root.domain, action);
			if (domain === root.domain) return root; // rejected action: no change, no entry
			const entry = deriveHistoryEntry(root.domain, domain, action);
			return entry
				? { ...root, domain, history: recordEntry(root.history, entry) }
				: { ...root, domain };
		}
	}
}