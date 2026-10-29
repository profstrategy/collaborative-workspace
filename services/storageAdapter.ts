import type {
	AppState,
	Board,
	BoardCard,
	BoardColumn,
	CardComment,
	EntityId,
	Tag,
} from "@/state/domain.types";

const STORAGE_KEY = "talenvo:app-state";
const TAG_STATUSES = ["Pending", "Ongoing", "Completed", "Bugs"] as const;
const MAX_COMMENT_DEPTH = 5;
const MAX_COMMENT_BODY_LENGTH = 5000;

export type StorageLoadResult =
	| { status: "loaded"; state: AppState }
	| { status: "empty" | "invalid" | "unavailable" };

export function shouldPersistAfterHydration(
	status: StorageLoadResult["status"],
	currentState: AppState,
	restoredState: AppState,
) {
	return status === "empty" || currentState !== restoredState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}

function hasUniqueStrings(values: string[]) {
	return new Set(values).size === values.length;
}

function isBoard(value: unknown, id: EntityId): value is Board {
	if (!isRecord(value)) return false;

	return (
		value.id === id &&
		typeof value.title === "string" &&
		typeof value.description === "string" &&
		typeof value.createdAt === "string" &&
		typeof value.updatedAt === "string" &&
		isStringArray(value.columnIds) &&
		hasUniqueStrings(value.columnIds)
	);
}

function isBoardColumn(value: unknown, id: EntityId): value is BoardColumn {
	if (!isRecord(value)) return false;

	return (
		value.id === id &&
		typeof value.boardId === "string" &&
		typeof value.title === "string" &&
		isStringArray(value.cardIds) &&
		hasUniqueStrings(value.cardIds) &&
		(value.position === undefined ||
			(typeof value.position === "number" && Number.isFinite(value.position)))
	);
}

function isBoardCard(value: unknown, id: EntityId): value is BoardCard {
	if (!isRecord(value)) return false;

	return (
		value.id === id &&
		typeof value.boardId === "string" &&
		typeof value.columnId === "string" &&
		typeof value.title === "string" &&
		typeof value.description === "string" &&
		isStringArray(value.tagIds) &&
		hasUniqueStrings(value.tagIds) &&
		(typeof value.dueDate === "string" || value.dueDate === null) &&
		(typeof value.position === "number" || value.position === null) &&
		(value.position === null || Number.isFinite(value.position)) &&
		typeof value.createdAt === "string" &&
		typeof value.updatedAt === "string"
	);
}

function isTag(value: unknown, id: EntityId): value is Tag {
	if (!isRecord(value)) return false;

	return (
		value.id === id &&
		typeof value.cardId === "string" &&
		typeof value.columnId === "string" &&
		typeof value.status === "string" &&
		TAG_STATUSES.some((status) => status === value.status) &&
		typeof value.color === "string"
	);
}

function isValidTimestamp(value: string) {
	const timestamp = Date.parse(value);
	return (
		value.length > 0 &&
		Number.isFinite(timestamp) &&
		new Date(timestamp).toISOString() === value
	);
}

function isComment(value: unknown, id: EntityId): value is CardComment {
	if (!isRecord(value)) return false;
	if (
		value.id !== id ||
		typeof value.cardId !== "string" ||
		!(
			value.parentCommentId === null ||
			typeof value.parentCommentId === "string"
		) ||
		typeof value.body !== "string" ||
		value.body.length === 0 ||
		value.body !== value.body.trim() ||
		value.body.length > MAX_COMMENT_BODY_LENGTH ||
		typeof value.authorName !== "string" ||
		value.authorName.length === 0 ||
		value.authorName !== value.authorName.trim() ||
		value.authorName.length > 80 ||
		typeof value.createdAt !== "string" ||
		typeof value.updatedAt !== "string" ||
		!isValidTimestamp(value.createdAt) ||
		!isValidTimestamp(value.updatedAt) ||
		Date.parse(value.updatedAt) < Date.parse(value.createdAt)
	) {
		return false;
	}

	return true;
}

function isEntityRecord<T>(
	value: unknown,
	guard: (entity: unknown, id: EntityId) => entity is T,
): value is Record<EntityId, T> {
	return (
		isRecord(value) &&
		Object.entries(value).every(([id, entity]) => guard(entity, id))
	);
}

export function isAppState(value: unknown): value is AppState {
	if (!isRecord(value)) return false;

	const { boards, columns, cards, tags, comments } = value;
	if (
		!isEntityRecord(boards, isBoard) ||
		!isEntityRecord(columns, isBoardColumn) ||
		!isEntityRecord(cards, isBoardCard) ||
		!isEntityRecord(tags, isTag) ||
		!isEntityRecord(comments, isComment)
	) {
		return false;
	}

	for (const board of Object.values(boards)) {
		if (
			board.columnIds.some(
				(columnId) => columns[columnId]?.boardId !== board.id,
			)
		) {
			return false;
		}
	}

	const orderedCardIds = new Set<EntityId>();
	for (const column of Object.values(columns)) {
		const board = boards[column.boardId];
		if (!board || !board.columnIds.includes(column.id)) return false;

		for (const [position, cardId] of column.cardIds.entries()) {
			const card = cards[cardId];
			if (
				!card ||
				orderedCardIds.has(cardId) ||
				card.boardId !== column.boardId ||
				card.columnId !== column.id ||
				card.position !== position
			) {
				return false;
			}
			orderedCardIds.add(cardId);
		}
	}

	for (const card of Object.values(cards)) {
		const board = boards[card.boardId];
		const column = columns[card.columnId];
		if (
			!board ||
			!column ||
			column.boardId !== board.id ||
			!orderedCardIds.has(card.id)
		) {
			return false;
		}

		if (
			card.tagIds.some(
				(tagId) =>
					tags[tagId]?.cardId !== card.id ||
					tags[tagId]?.columnId !== column.id,
			)
		) {
			return false;
		}
	}

	for (const tag of Object.values(tags)) {
		const card = cards[tag.cardId];
		if (
			!card ||
			card.columnId !== tag.columnId ||
			!card.tagIds.includes(tag.id)
		) {
			return false;
		}
	}

	for (const comment of Object.values(comments)) {
		if (!cards[comment.cardId]) return false;
		let currentId: EntityId | null = comment.id;
		let depth = 0;
		const visited = new Set<EntityId>();
		while (currentId !== null) {
			if (visited.has(currentId)) return false;
			visited.add(currentId);
			const current: CardComment | undefined = comments[currentId];
			if (!current || current.cardId !== comment.cardId) return false;
			if (current.parentCommentId === null) break;
			depth += 1;
			if (depth > MAX_COMMENT_DEPTH) return false;
			currentId = current.parentCommentId;
		}
	}

	return true;
}

export function load(): StorageLoadResult {
	if (typeof window === "undefined") {
		return { status: "unavailable" };
	}

	try {
		const storedValue = window.localStorage.getItem(STORAGE_KEY);
		if (storedValue === null) return { status: "empty" };

		let parsedValue: unknown;
		try {
			parsedValue = JSON.parse(storedValue);
		} catch {
			console.warn("[storageAdapter] Stored app state is not valid JSON.");
			return { status: "invalid" };
		}

		if (isRecord(parsedValue) && !("comments" in parsedValue)) {
			parsedValue = { ...parsedValue, comments: {} };
		}

		if (!isAppState(parsedValue)) {
			console.warn(
				"[storageAdapter] Stored app state does not match the current schema.",
			);
			return { status: "invalid" };
		}

		return { status: "loaded", state: parsedValue };
	} catch {
		console.warn("[storageAdapter] Browser storage could not be read.");
		return { status: "unavailable" };
	}
}

export function save(state: AppState): boolean {
	if (typeof window === "undefined") return false;

	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		return true;
	} catch {
		console.warn("[storageAdapter] App state could not be saved.");
		return false;
	}
}

export function clear(): boolean {
	if (typeof window === "undefined") return false;

	try {
		window.localStorage.removeItem(STORAGE_KEY);
		return true;
	} catch {
		console.warn("[storageAdapter] Stored app state could not be cleared.");
		return false;
	}
}
