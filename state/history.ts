import type { AppAction } from "./app.actions";
import { appReducer } from "./app.reducer";
import type { AppState, EntityId } from "./domain.types";
import type {
	CardSnapshot,
	HistoryEntry,
	HistoryFailureReason,
	HistoryState,
} from "./history.types";

export const HISTORY_LIMIT = 100;
export const emptyHistory: HistoryState = { undoStack: [], redoStack: [] };

export type ApplyResult =
	| { ok: true; state: AppState; counterpart: HistoryEntry }
	| { ok: false; reason: HistoryFailureReason };

const fail = (reason: HistoryFailureReason): ApplyResult => ({
	ok: false,
	reason,
});

export function captureCardSnapshot(
	state: AppState,
	cardId: EntityId,
): CardSnapshot | null {
	const card = state.cards[cardId];
	const column = card && state.columns[card.columnId];
	if (!card || !column) return null;
	const index = column.cardIds.indexOf(cardId);
	if (index < 0) return null;

	// isAppState guarantees every tag appears in its card's tagIds, so no tag scan.
	const tags = card.tagIds.flatMap((id) => {
		const tag = state.tags[id];
		return tag ? [tag] : [];
	});
	const comments = Object.values(state.comments).filter(
		(comment) => comment.cardId === cardId,
	);
	return { card, columnId: column.id, index, tags, comments };
}

export function deriveHistoryEntry(
	before: AppState,
	after: AppState,
	action: AppAction,
): HistoryEntry | null {
	switch (action.type) {
		case "card/created": {
			const id = action.payload.id;
			if (before.cards[id] || !after.cards[id]) return null;
			const snapshot = captureCardSnapshot(after, id);
			return snapshot ? { kind: "card-created", snapshot } : null;
		}
		case "card/deleted": {
			const id = action.payload.id;
			if (!before.cards[id] || after.cards[id]) return null;
			const snapshot = captureCardSnapshot(before, id);
			return snapshot ? { kind: "card-deleted", snapshot } : null;
		}
		case "card/moved": {
			const { cardId, sourceColumnId, destinationColumnId } = action.payload;
			const fromIndex =
				before.columns[sourceColumnId]?.cardIds.indexOf(cardId) ?? -1;
			const toIndex =
				after.columns[destinationColumnId]?.cardIds.indexOf(cardId) ?? -1;
			if (fromIndex < 0 || toIndex < 0) return null;
			if (sourceColumnId === destinationColumnId && fromIndex === toIndex) {
				return null; // no-op
			}
			return {
				kind: "card-moved",
				cardId,
				sourceColumnId,
				destinationColumnId,
				fromIndex,
				toIndex,
			};
		}
		default:
			return null;
	}
}

export function recordEntry(
	history: HistoryState,
	entry: HistoryEntry,
): HistoryState {
	return {
		undoStack: [...history.undoStack, entry].slice(-HISTORY_LIMIT),
		redoStack: [], // a new supported operation invalidates redo
	};
}

function removeCard(
	state: AppState,
	entry: Extract<HistoryEntry, { snapshot: CardSnapshot }>,
): ApplyResult {
	const id = entry.snapshot.card.id;
	const current = captureCardSnapshot(state, id);
	if (!current) return fail("card-missing");

	const owned = new Set(entry.snapshot.comments.map((comment) => comment.id));
	if (current.comments.some((comment) => !owned.has(comment.id))) {
		return fail("card-has-comments");
	}

	const next = appReducer(state, { type: "card/deleted", payload: { id } });
	if (next === state) return fail("restore-rejected");
	// Counterpart is captured from CURRENT data so the opposite step restores exactly this.
	return {
		ok: true,
		state: next,
		counterpart: { kind: entry.kind, snapshot: current },
	};
}

function restoreCard(
	state: AppState,
	entry: Extract<HistoryEntry, { snapshot: CardSnapshot }>,
): ApplyResult {
	const { snapshot } = entry;
	const next = appReducer(state, { type: "card/restored", payload: snapshot });
	if (next === state) {
		if (state.cards[snapshot.card.id]) return fail("card-exists");
		if (!state.columns[snapshot.columnId]) return fail("column-missing");
		return fail("restore-rejected");
	}
	const restored = captureCardSnapshot(next, snapshot.card.id) ?? snapshot;
	return {
		ok: true,
		state: next,
		counterpart: { kind: entry.kind, snapshot: restored },
	};
}

function applyMove(
	state: AppState,
	entry: Extract<HistoryEntry, { kind: "card-moved" }>,
	direction: "undo" | "redo",
	at: string,
): ApplyResult {
	const forward = direction === "redo";
	const fromColumnId = forward
		? entry.sourceColumnId
		: entry.destinationColumnId;
	const toColumnId = forward ? entry.destinationColumnId : entry.sourceColumnId;
	const fromIndex = forward ? entry.fromIndex : entry.toIndex;
	const toIndex = forward ? entry.toIndex : entry.fromIndex;

	const card = state.cards[entry.cardId];
	if (!card) return fail("card-missing");
	const fromColumn = state.columns[fromColumnId];
	if (!fromColumn || !state.columns[toColumnId]) return fail("column-missing");

	// The card must be exactly where this entry expects it, otherwise state drifted.
	if (
		card.columnId !== fromColumnId ||
		fromColumn.cardIds[fromIndex] !== entry.cardId
	) {
		return fail("location-mismatch");
	}

	const next = appReducer(state, {
		type: "card/moved",
		payload: {
			cardId: entry.cardId,
			sourceColumnId: fromColumnId,
			destinationColumnId: toColumnId,
			destinationIndex: toIndex,
			movedAt: at,
		},
	});
	if (next === state) return fail("restore-rejected");
	return { ok: true, state: next, counterpart: entry };
}

export function applyHistoryEntry(
	state: AppState,
	entry: HistoryEntry,
	direction: "undo" | "redo",
	at: string,
): ApplyResult {
	switch (entry.kind) {
		case "card-created":
			return direction === "undo"
				? removeCard(state, entry)
				: restoreCard(state, entry);
		case "card-deleted":
			return direction === "undo"
				? restoreCard(state, entry)
				: removeCard(state, entry);
		case "card-moved":
			return applyMove(state, entry, direction, at);
	}
}
