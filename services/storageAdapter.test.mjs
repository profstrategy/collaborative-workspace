import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { initialAppState } from "../state/app.initialState.ts";
import { appReducer } from "../state/app.reducer.ts";
import {
	clear,
	load,
	save,
	shouldPersistAfterHydration,
} from "./storageAdapter.ts";

const originalWindow = globalThis.window;
const originalWarn = console.warn;

function createState() {
	return {
		boards: {
			board1: {
				id: "board1",
				title: "Product",
				description: "Planning board",
				createdAt: "2026-10-15T10:00:00.000Z",
				updatedAt: "2026-10-16T10:00:00.000Z",
				columnIds: ["column1"],
			},
		},
		columns: {
			column1: {
				id: "column1",
				boardId: "board1",
				title: "In progress",
				cardIds: ["card1", "card2"],
				position: 0,
			},
		},
		cards: {
			card1: {
				id: "card1",
				boardId: "board1",
				columnId: "column1",
				title: "Write proposal",
				description: "Draft **project proposal**",
				tagIds: ["tag1"],
				dueDate: null,
				position: 0,
				createdAt: "2026-10-15T11:00:00.000Z",
				updatedAt: "2026-10-16T09:00:00.000Z",
			},
			card2: {
				id: "card2",
				boardId: "board1",
				columnId: "column1",
				title: "Review notes",
				description: "",
				tagIds: [],
				dueDate: "2026-10-20",
				position: 1,
				createdAt: "2026-10-15T12:00:00.000Z",
				updatedAt: "2026-10-15T12:00:00.000Z",
			},
		},
		tags: {
			tag1: {
				id: "tag1",
				cardId: "card1",
				columnId: "column1",
				status: "Ongoing",
				color: "#78716C",
			},
		},
		comments: {},
	};
}

function createStorage(initialValues = {}) {
	const values = new Map(Object.entries(initialValues));

	return {
		getItem(key) {
			return values.has(key) ? values.get(key) : null;
		},
		setItem(key, value) {
			values.set(key, value);
		},
		removeItem(key) {
			values.delete(key);
		},
		values,
	};
}

function setBrowserStorage(storage) {
	globalThis.window = { localStorage: storage };
}

function silenceWarnings(callback) {
	console.warn = () => {};
	try {
		callback();
	} finally {
		console.warn = originalWarn;
	}
}

afterEach(() => {
	if (originalWindow === undefined) {
		delete globalThis.window;
	} else {
		globalThis.window = originalWindow;
	}
	console.warn = originalWarn;
});

test("load reports empty storage without creating a value", () => {
	const storage = createStorage();
	setBrowserStorage(storage);

	assert.deepEqual(load(), { status: "empty" });
	assert.equal(storage.values.size, 0);
});

test("save stores all entity collections and load restores the full state", () => {
	const storage = createStorage();
	setBrowserStorage(storage);
	const state = createState();

	assert.equal(save(state), true);
	const result = load();

	assert.equal(result.status, "loaded");
	if (result.status !== "loaded") return;
	assert.deepEqual(result.state, state);
	assert.deepEqual(Object.keys(result.state.boards), ["board1"]);
	assert.deepEqual(Object.keys(result.state.columns), ["column1"]);
	assert.deepEqual(Object.keys(result.state.cards), ["card1", "card2"]);
	assert.deepEqual(Object.keys(result.state.tags), ["tag1"]);
	assert.equal(result.state.cards.card1.dueDate, null);
	assert.equal(result.state.cards.card2.dueDate, "2026-10-20");
	assert.equal(result.state.cards.card1.position, 0);
	assert.equal(result.state.cards.card2.position, 1);
});

test("load rejects malformed JSON and leaves the saved value untouched", () => {
	const storage = createStorage({ "talenvo:app-state": "{" });
	setBrowserStorage(storage);

	silenceWarnings(() => {
		assert.deepEqual(load(), { status: "invalid" });
	});
	assert.equal(storage.getItem("talenvo:app-state"), "{");
});

test("load rejects invalid entities and broken relationships", () => {
	const invalidState = createState();
	invalidState.cards.card1.tagIds = ["missing-tag"];
	const storage = createStorage({
		"talenvo:app-state": JSON.stringify(invalidState),
	});
	setBrowserStorage(storage);

	silenceWarnings(() => {
		assert.deepEqual(load(), { status: "invalid" });
	});
	assert.equal(
		storage.getItem("talenvo:app-state"),
		JSON.stringify(invalidState),
	);
});

test("load rejects inconsistent card ordering and leaves stored data untouched", () => {
	const invalidStates = [
		{
			name: "a card position that differs from its array index",
			mutate(state) {
				state.cards.card1.position = 1;
			},
		},
		{
			name: "a non-contiguous card position",
			mutate(state) {
				state.cards.card2.position = 3;
			},
		},
		{
			name: "a card listed more than once",
			mutate(state) {
				state.columns.column1.cardIds = ["card1", "card1", "card2"];
			},
		},
		{
			name: "a card missing from its column ordering",
			mutate(state) {
				state.columns.column1.cardIds = ["card1"];
			},
		},
	];

	for (const { name, mutate } of invalidStates) {
		const state = createState();
		mutate(state);
		const serializedState = JSON.stringify(state);
		const storage = createStorage({ "talenvo:app-state": serializedState });
		setBrowserStorage(storage);

		silenceWarnings(() => {
			assert.deepEqual(load(), { status: "invalid" }, name);
		});
		assert.equal(storage.getItem("talenvo:app-state"), serializedState, name);
	}
});

test("restores normalized comments with valid parent relationships", () => {
	const storage = createStorage();
	setBrowserStorage(storage);
	const state = createState();
	state.comments = {
		root: {
			id: "root",
			cardId: "card1",
			parentCommentId: null,
			body: "Top-level comment",
			authorName: "Demo user",
			createdAt: "2026-10-17T10:00:00.000Z",
			updatedAt: "2026-10-17T10:00:00.000Z",
		},
		reply: {
			id: "reply",
			cardId: "card1",
			parentCommentId: "root",
			body: "Nested reply",
			authorName: "Demo user",
			createdAt: "2026-10-17T10:01:00.000Z",
			updatedAt: "2026-10-17T10:01:00.000Z",
		},
	};

	assert.equal(save(state), true);
	const result = load();
	assert.equal(result.status, "loaded");
	if (result.status !== "loaded") return;
	assert.deepEqual(result.state.comments, state.comments);
});

test("rejects malformed comments, invalid references, cycles, and excessive depth", () => {
	const invalidStates = [
		{
			name: "comment record key mismatch",
			mutate(state) {
				state.comments.wrong = {
					id: "comment",
					cardId: "card1",
					parentCommentId: null,
					body: "Valid body",
					authorName: "Demo user",
					createdAt: "2026-10-17T10:00:00.000Z",
					updatedAt: "2026-10-17T10:00:00.000Z",
				};
			},
		},
		{
			name: "missing card",
			mutate(state) {
				state.comments.orphan = {
					id: "orphan",
					cardId: "missing-card",
					parentCommentId: null,
					body: "Orphan",
					authorName: "Demo user",
					createdAt: "2026-10-17T10:00:00.000Z",
					updatedAt: "2026-10-17T10:00:00.000Z",
				};
			},
		},
		{
			name: "invalid comment body and timestamp",
			mutate(state) {
				state.comments.invalid = {
					id: "invalid",
					cardId: "card1",
					parentCommentId: null,
					body: " ",
					authorName: "Demo user",
					createdAt: "invalid-date",
					updatedAt: "invalid-date",
				};
			},
		},
		{
			name: "missing parent",
			mutate(state) {
				state.comments.reply = {
					id: "reply",
					cardId: "card1",
					parentCommentId: "missing",
					body: "Reply",
					authorName: "Demo user",
					createdAt: "2026-10-17T10:00:00.000Z",
					updatedAt: "2026-10-17T10:00:00.000Z",
				};
			},
		},
		{
			name: "cross-card parent",
			mutate(state) {
				state.comments.root = {
					id: "root",
					cardId: "card1",
					parentCommentId: null,
					body: "Root",
					authorName: "Demo user",
					createdAt: "2026-10-17T10:00:00.000Z",
					updatedAt: "2026-10-17T10:00:00.000Z",
				};
				state.comments.reply = {
					id: "reply",
					cardId: "card2",
					parentCommentId: "root",
					body: "Reply",
					authorName: "Demo user",
					createdAt: "2026-10-17T10:01:00.000Z",
					updatedAt: "2026-10-17T10:01:00.000Z",
				};
			},
		},
		{
			name: "cycle",
			mutate(state) {
				for (const [id, parentCommentId] of [
					["first", "second"],
					["second", "first"],
				]) {
					state.comments[id] = {
						id,
						cardId: "card1",
						parentCommentId,
						body: id,
						authorName: "Demo user",
						createdAt: "2026-10-17T10:00:00.000Z",
						updatedAt: "2026-10-17T10:00:00.000Z",
					};
				}
			},
		},
		{
			name: "excessive depth",
			mutate(state) {
				for (let depth = 0; depth <= 6; depth += 1) {
					const id = `depth-${depth}`;
					state.comments[id] = {
						id,
						cardId: "card1",
						parentCommentId: depth === 0 ? null : `depth-${depth - 1}`,
						body: id,
						authorName: "Demo user",
						createdAt: "2026-10-17T10:00:00.000Z",
						updatedAt: "2026-10-17T10:00:00.000Z",
					};
				}
			},
		},
	];

	for (const { name, mutate } of invalidStates) {
		const state = createState();
		state.comments = {};
		mutate(state);
		const serializedState = JSON.stringify(state);
		setBrowserStorage(createStorage({ "talenvo:app-state": serializedState }));
		silenceWarnings(() => {
			assert.deepEqual(load(), { status: "invalid" }, name);
		});
	}
});

test("migrates older valid snapshots without a comments collection", () => {
	const state = createState();
	delete state.comments;
	const storage = createStorage({
		"talenvo:app-state": JSON.stringify(state),
	});
	setBrowserStorage(storage);

	const result = load();
	assert.equal(result.status, "loaded");
	if (result.status !== "loaded") return;
	assert.deepEqual(result.state.comments, {});
	assert.deepEqual(result.state.boards, state.boards);
	assert.deepEqual(result.state.columns, state.columns);
	assert.deepEqual(result.state.cards, state.cards);
	assert.deepEqual(result.state.tags, state.tags);
});

test("storage read, write, and clear failures do not throw", () => {
	setBrowserStorage({
		getItem() {
			throw new Error("blocked");
		},
		setItem() {
			throw new Error("quota");
		},
		removeItem() {
			throw new Error("blocked");
		},
	});

	silenceWarnings(() => {
		assert.deepEqual(load(), { status: "unavailable" });
		assert.equal(save(createState()), false);
		assert.equal(clear(), false);
	});
});

test("adapter is safe when browser storage is unavailable", () => {
	delete globalThis.window;
	assert.deepEqual(load(), { status: "unavailable" });
	assert.equal(save(createState()), false);
	assert.equal(clear(), false);
});

test("hydration does not overwrite invalid or unavailable saved data", () => {
	const defaultState = initialAppState;
	const changedState = {
		...defaultState,
		boards: { board1: createState().boards.board1 },
	};

	assert.equal(
		shouldPersistAfterHydration("loaded", defaultState, defaultState),
		false,
	);
	assert.equal(
		shouldPersistAfterHydration("invalid", defaultState, defaultState),
		false,
	);
	assert.equal(
		shouldPersistAfterHydration("unavailable", defaultState, defaultState),
		false,
	);
	assert.equal(
		shouldPersistAfterHydration("invalid", changedState, defaultState),
		true,
	);
	assert.equal(
		shouldPersistAfterHydration("empty", defaultState, defaultState),
		true,
	);
});

test("reducer state changes can be saved and restored", () => {
	const storage = createStorage();
	setBrowserStorage(storage);
	const board = { ...createState().boards.board1, columnIds: [] };
	const nextState = appReducer(initialAppState, {
		type: "board/created",
		payload: board,
	});

	assert.equal(save(nextState), true);
	const result = load();
	assert.equal(result.status, "loaded");
	if (result.status !== "loaded") return;
	assert.deepEqual(result.state.boards.board1, board);
});

test("moved cards and their tags remain valid when saved and restored", () => {
	const storage = createStorage();
	setBrowserStorage(storage);
	const state = createState();
	const destinationColumn = {
		id: "column2",
		boardId: "board1",
		title: "Done",
		cardIds: [],
		position: 1,
	};
	state.boards.board1.columnIds.push(destinationColumn.id);
	state.columns[destinationColumn.id] = destinationColumn;

	const movedState = appReducer(state, {
		type: "card/moved",
		payload: {
			cardId: "card1",
			sourceColumnId: "column1",
			destinationColumnId: destinationColumn.id,
			destinationIndex: 0,
			movedAt: "2026-10-17T10:00:00.000Z",
		},
	});

	assert.equal(save(movedState), true);
	const result = load();
	assert.equal(result.status, "loaded");
	if (result.status !== "loaded") return;
	assert.deepEqual(result.state.columns.column1.cardIds, ["card2"]);
	assert.deepEqual(result.state.columns.column2.cardIds, ["card1"]);
	assert.equal(result.state.cards.card1.columnId, "column2");
	assert.equal(result.state.cards.card1.position, 0);
	assert.equal(result.state.tags.tag1.columnId, "column2");
});
