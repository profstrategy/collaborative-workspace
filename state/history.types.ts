import type { BoardCard, CardComment, EntityId, Tag } from "./domain.types";

export interface CardSnapshot {
	card: BoardCard;
	columnId: EntityId;
	index: number;
	tags: readonly Tag[];
	comments: readonly CardComment[];
}

export type HistoryEntry =
	| { kind: "card-created"; snapshot: CardSnapshot }
	| { kind: "card-deleted"; snapshot: CardSnapshot }
	| {
			kind: "card-moved";
			cardId: EntityId;
			sourceColumnId: EntityId;
			destinationColumnId: EntityId;
			fromIndex: number;
			toIndex: number;
	  };

export interface HistoryState {
	undoStack: readonly HistoryEntry[];
	redoStack: readonly HistoryEntry[];
}

export type HistoryFailureReason =
	| "card-missing"
	| "card-exists"
	| "column-missing"
	| "location-mismatch"
	| "card-has-comments"
	| "restore-rejected";

export interface HistoryEvent {
	seq: number; // increments per undo/redo attempt; lets the UI react to repeats
	direction: "undo" | "redo";
	outcome: "applied" | "empty" | "failed";
	entryKind?: HistoryEntry["kind"];
	reason?: HistoryFailureReason;
}