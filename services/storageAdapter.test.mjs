import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
	clear,
	load,
	save,
	shouldPersistAfterHydration,
} from "./storageAdapter.ts";
import { initialAppState } from "../state/app.initialState.ts";
import { appReducer } from "../state/app.reducer.ts";

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

function useStorage(storage) {
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
	useStorage(storage);

	assert.deepEqual(load(), { status: "empty" });
	assert.equal(storage.values.size, 0);
});

test("save stores all entity collections and load restores the full state", () => {
	const storage = createStorage();
	useStorage(storage);
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
	useStorage(storage);

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
	useStorage(storage);

	silenceWarnings(() => {
		assert.deepEqual(load(), { status: "invalid" });
	});
	assert.equal(
		storage.getItem("talenvo:app-state"),
		JSON.stringify(invalidState),
	);
});

test("storage read, write, and clear failures do not throw", () => {
	useStorage({
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
	useStorage(storage);
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
