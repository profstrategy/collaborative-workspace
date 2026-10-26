import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppAction } from "./app.actions";
import {
	initialAppState,
	initialBoard,
	initialCard,
	initialColumn,
	initialTag,
} from "./app.initialState";
import { appReducer } from "./app.reducer";
import type {
	AppState,
	Board,
	BoardCard,
	BoardColumn,
	CardComment,
	Tag,
} from "./domain.types";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const OLD = "2025-01-01T00:00:00.000Z";
const NOW = "2026-01-01T00:00:00.000Z";

const PENDING = "Pending" as Tag["status"];
const ONGOING = "Ongoing" as Tag["status"];
const COMPLETED = "Completed" as Tag["status"];

const makeBoard = (overrides: Partial<Board> = {}): Board => ({
	...initialBoard,
	createdAt: OLD,
	updatedAt: OLD,
	...overrides,
});

const makeColumn = (overrides: Partial<BoardColumn> = {}): BoardColumn => ({
	...initialColumn,
	...overrides,
});

const makeCard = (overrides: Partial<BoardCard> = {}): BoardCard => ({
	...initialCard,
	createdAt: OLD,
	updatedAt: OLD,
	...overrides,
});

const makeTag = (overrides: Partial<Tag> = {}): Tag => ({
	...initialTag,
	color: "#000000",
	...overrides,
});

const makeComment = (overrides: Partial<CardComment> = {}): CardComment => ({
	id: "comment-1",
	cardId: "k1",
	parentCommentId: null,
	body: "A comment",
	authorName: "Demo user",
	createdAt: OLD,
	updatedAt: OLD,
	...overrides,
});

/**
 * Seed layout:
 *
 *  board b1
 *    column c1 -> cards k1 (tags t1, t2), k2 (tag t3), k3
 *    column c2 -> card  k4 (tag t4)
 *  board b2
 *    column c3 -> card  k5 (tag t5)
 */
function seedState(): AppState {
	return {
		boards: {
			b1: makeBoard({ id: "b1", title: "Board 1", columnIds: ["c1", "c2"] }),
			b2: makeBoard({ id: "b2", title: "Board 2", columnIds: ["c3"] }),
		},
		columns: {
			c1: makeColumn({
				id: "c1",
				boardId: "b1",
				title: "Todo",
				cardIds: ["k1", "k2", "k3"],
			}),
			c2: makeColumn({
				id: "c2",
				boardId: "b1",
				title: "Done",
				cardIds: ["k4"],
			}),
			c3: makeColumn({
				id: "c3",
				boardId: "b2",
				title: "Other",
				cardIds: ["k5"],
			}),
		},
		cards: {
			k1: makeCard({
				id: "k1",
				boardId: "b1",
				columnId: "c1",
				title: "Card 1",
				tagIds: ["t1", "t2"],
				position: 0,
			}),
			k2: makeCard({
				id: "k2",
				boardId: "b1",
				columnId: "c1",
				title: "Card 2",
				tagIds: ["t3"],
				position: 1,
			}),
			k3: makeCard({
				id: "k3",
				boardId: "b1",
				columnId: "c1",
				title: "Card 3",
				position: 2,
			}),
			k4: makeCard({
				id: "k4",
				boardId: "b1",
				columnId: "c2",
				title: "Card 4",
				tagIds: ["t4"],
				position: 0,
			}),
			k5: makeCard({
				id: "k5",
				boardId: "b2",
				columnId: "c3",
				title: "Card 5",
				tagIds: ["t5"],
				position: 0,
			}),
		},
		tags: {
			t1: makeTag({ id: "t1", cardId: "k1", columnId: "c1", status: PENDING }),
			t2: makeTag({
				id: "t2",
				cardId: "k1",
				columnId: "c1",
				status: ONGOING,
			}),
			t3: makeTag({ id: "t3", cardId: "k2", columnId: "c1", status: PENDING }),
			t4: makeTag({ id: "t4", cardId: "k4", columnId: "c2", status: PENDING }),
			t5: makeTag({ id: "t5", cardId: "k5", columnId: "c3", status: PENDING }),
		},
		comments: {},
	};
}

const reduce = (state: AppState, action: AppAction) =>
	appReducer(state, action);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
	vi.useRealTimers();
});

/* -------------------------------------------------------------------------- */
/* General                                                                     */
/* -------------------------------------------------------------------------- */

describe("appReducer: general", () => {
	it("returns the same state for an unknown action", () => {
		const state = seedState();
		const result = reduce(state, { type: "nope" } as unknown as AppAction);

		expect(result).toBe(state);
	});

	it("ignores UI-only actions", () => {
		const state = seedState();

		expect(reduce(state, { type: "board/create-modal-opened" })).toBe(state);
		expect(reduce(state, { type: "board/create-modal-closed" })).toBe(state);
		expect(reduce(state, { type: "column/create-modal-opened" })).toBe(state);
		expect(reduce(state, { type: "column/create-modal-closed" })).toBe(state);
	});

	it("never mutates the previous state", () => {
		const state = seedState();
		const snapshot = structuredClone(state);

		const actions: AppAction[] = [
			{
				type: "board/created",
				payload: makeBoard({ id: "b3", title: "New" }),
			},
			{ type: "board/updated", payload: { id: "b1", changes: { title: "X" } } },
			{ type: "board/deleted", payload: { id: "b1" } },
			{
				type: "column/created",
				payload: makeColumn({ id: "c9", boardId: "b1", title: "New col" }),
			},
			{
				type: "column/updated",
				payload: { id: "c1", changes: { title: "Y" } },
			},
			{ type: "column/deleted", payload: { id: "c1" } },
			{
				type: "card/created",
				payload: makeCard({
					id: "k9",
					boardId: "b1",
					columnId: "c1",
					title: "New card",
				}),
			},
			{
				type: "card/updated",
				payload: { id: "k1", changes: { title: "Z", position: 2 } },
			},
			{
				type: "card/moved",
				payload: {
					cardId: "k1",
					sourceColumnId: "c1",
					destinationColumnId: "c2",
					destinationIndex: 0,
					movedAt: NOW,
				},
			},
			{
				type: "card/tags-updated",
				payload: {
					cardId: "k1",
					tags: [
						makeTag({
							id: "t9",
							cardId: "k1",
							columnId: "c1",
							status: COMPLETED,
						}),
					],
				},
			},
			{ type: "card/deleted", payload: { id: "k1" } },
		];

		for (const action of actions) {
			reduce(state, action);
			expect(state).toEqual(snapshot);
		}
	});
});

/* -------------------------------------------------------------------------- */
/* state/restored                                                              */
/* -------------------------------------------------------------------------- */

describe("state/restored", () => {
	it("replaces the whole state with the payload", () => {
		const restored = seedState();
		const result = reduce(initialAppState, {
			type: "state/restored",
			payload: restored,
		});
		expect(result).toBe(restored);
	});
});

/* -------------------------------------------------------------------------- */
/* comments                                                                    */
/* -------------------------------------------------------------------------- */

describe("comment actions", () => {
	it("creates top-level comments and nested replies with normalized parents", () => {
		const state = seedState();
		const topLevel = makeComment();
		const afterTopLevel = reduce(state, {
			type: "comment/created",
			payload: topLevel,
		});
		const reply = makeComment({
			id: "comment-2",
			parentCommentId: topLevel.id,
			body: "A reply",
		});
		const afterReply = reduce(afterTopLevel, {
			type: "comment/created",
			payload: reply,
		});
		const nestedReply = makeComment({
			id: "comment-3",
			parentCommentId: reply.id,
			body: "A reply to a reply",
		});
		const result = reduce(afterReply, {
			type: "comment/created",
			payload: nestedReply,
		});

		expect(result.comments).toEqual({
			[topLevel.id]: topLevel,
			[reply.id]: reply,
			[nestedReply.id]: nestedReply,
		});
		expect(state.comments).toEqual({});
		expect(result.cards).toBe(state.cards);
		expect(result.tags).toBe(state.tags);
	});

	it("trims and rejects blank comment bodies", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "comment/created",
			payload: makeComment({ body: "  keep trimmed  " }),
		});
		expect(result.comments["comment-1"]?.body).toBe("keep trimmed");
		expect(
			reduce(state, {
				type: "comment/created",
				payload: makeComment({ body: "   " }),
			}),
		).toBe(state);
	});

	it("edits the body without changing comment identity, parent, or creation time", () => {
		const state = seedState();
		state.comments.parent = makeComment({ id: "parent" });
		state.comments.child = makeComment({
			id: "child",
			parentCommentId: "parent",
		});
		const result = reduce(state, {
			type: "comment/updated",
			payload: { id: "child", body: "  Edited  ", updatedAt: NOW },
		});
		expect(result.comments.child).toEqual({
			...state.comments.child,
			body: "Edited",
			updatedAt: NOW,
		});
		expect(state.comments.child?.body).toBe("A comment");
	});

	it("cascades deletion across reply branches without deleting unrelated comments", () => {
		const state = seedState();
		state.comments.root = makeComment({ id: "root" });
		state.comments.replyA = makeComment({
			id: "replyA",
			parentCommentId: "root",
		});
		state.comments.nested = makeComment({
			id: "nested",
			parentCommentId: "replyA",
		});
		state.comments.replyB = makeComment({
			id: "replyB",
			parentCommentId: "root",
		});
		state.comments.unrelated = makeComment({
			id: "unrelated",
			cardId: "k2",
		});

		const result = reduce(state, {
			type: "comment/deleted",
			payload: { id: "root" },
		});

		expect(result.comments).toEqual({ unrelated: state.comments.unrelated });
		expect(state.comments.root).toBeDefined();
		expect(result.cards).toBe(state.cards);
	});

	it("removes comments when their card, column, or board is deleted", () => {
		const state = seedState();
		state.comments.first = makeComment({ id: "first", cardId: "k1" });
		state.comments.second = makeComment({ id: "second", cardId: "k2" });
		state.comments.otherColumn = makeComment({
			id: "otherColumn",
			cardId: "k4",
		});
		state.comments.otherBoard = makeComment({
			id: "otherBoard",
			cardId: "k5",
		});

		const afterCardDelete = reduce(state, {
			type: "card/deleted",
			payload: { id: "k1" },
		});
		expect(afterCardDelete.comments.first).toBeUndefined();
		expect(afterCardDelete.comments.second).toBe(state.comments.second);

		const afterColumnDelete = reduce(state, {
			type: "column/deleted",
			payload: { id: "c1" },
		});
		expect(afterColumnDelete.comments.first).toBeUndefined();
		expect(afterColumnDelete.comments.second).toBeUndefined();
		expect(afterColumnDelete.comments.otherColumn).toBe(
			state.comments.otherColumn,
		);

		const afterBoardDelete = reduce(state, {
			type: "board/deleted",
			payload: { id: "b1" },
		});
		expect(afterBoardDelete.comments.first).toBeUndefined();
		expect(afterBoardDelete.comments.second).toBeUndefined();
		expect(afterBoardDelete.comments.otherColumn).toBeUndefined();
		expect(afterBoardDelete.comments.otherBoard).toBe(
			state.comments.otherBoard,
		);
	});

	it.each([
		{
			name: "missing card",
			comment: makeComment({ cardId: "missing" }),
		},
		{
			name: "missing parent",
			comment: makeComment({ parentCommentId: "missing" }),
		},
		{
			name: "parent on another card",
			comment: makeComment({ parentCommentId: "parent" }),
			parentCardId: "k2",
		},
		{
			name: "empty body",
			comment: makeComment({ body: " " }),
		},
		{
			name: "overlong body",
			comment: makeComment({ body: "x".repeat(5001) }),
		},
		{
			name: "invalid creation timestamp",
			comment: makeComment({ createdAt: "not-a-timestamp" }),
		},
		{
			name: "blank author",
			comment: makeComment({ authorName: "  " }),
		},
	])("rejects an invalid comment relationship or body: $name", ({
		comment,
		parentCardId,
	}) => {
		const state = seedState();
		if (parentCardId) {
			state.comments.parent = makeComment({
				id: "parent",
				cardId: parentCardId,
			});
		}
		expect(reduce(state, { type: "comment/created", payload: comment })).toBe(
			state,
		);
	});

	it("rejects cyclic existing parent chains and replies deeper than five levels", () => {
		const state = seedState();
		state.comments.cycleA = makeComment({
			id: "cycleA",
			parentCommentId: "cycleB",
		});
		state.comments.cycleB = makeComment({
			id: "cycleB",
			parentCommentId: "cycleA",
		});
		expect(
			reduce(state, {
				type: "comment/created",
				payload: makeComment({
					id: "cycle-child",
					parentCommentId: "cycleA",
				}),
			}),
		).toBe(state);

		const deepState = seedState();
		for (let depth = 0; depth <= 5; depth += 1) {
			const id = `depth-${depth}`;
			deepState.comments[id] = makeComment({
				id,
				parentCommentId: depth === 0 ? null : `depth-${depth - 1}`,
			});
		}
		expect(
			reduce(deepState, {
				type: "comment/created",
				payload: makeComment({
					id: "depth-6",
					parentCommentId: "depth-5",
				}),
			}),
		).toBe(deepState);
	});

	it("rejects edits and deletes for missing targets", () => {
		const state = seedState();
		expect(
			reduce(state, {
				type: "comment/updated",
				payload: { id: "missing", body: "Updated", updatedAt: NOW },
			}),
		).toBe(state);
		expect(
			reduce(state, { type: "comment/deleted", payload: { id: "missing" } }),
		).toBe(state);
	});
});

/* -------------------------------------------------------------------------- */
/* board/created                                                               */
/* -------------------------------------------------------------------------- */

describe("board/created", () => {
	it("adds a board and trims its title and description", () => {
		const result = reduce(initialAppState, {
			type: "board/created",
			payload: makeBoard({
				id: "b1",
				title: "  Roadmap  ",
				description: "  Q1 plans  ",
			}),
		});

		expect(result.boards.b1).toMatchObject({
			id: "b1",
			title: "Roadmap",
			description: "Q1 plans",
		});
	});

	it("preserves existing boards", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "board/created",
			payload: makeBoard({ id: "b3", title: "Third" }),
		});

		expect(Object.keys(result.boards).sort()).toEqual(["b1", "b2", "b3"]);
		expect(result.boards.b1).toBe(state.boards.b1);
	});

	it.each(["", "   "])("rejects an empty title (%j)", (title) => {
		const state = seedState();
		const result = reduce(state, {
			type: "board/created",
			payload: makeBoard({ id: "b3", title }),
		});

		expect(result).toBe(state);
	});

	it("rejects a duplicate board id", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "board/created",
			payload: makeBoard({ id: "b1", title: "Duplicate" }),
		});

		expect(result).toBe(state);
		expect(result.boards.b1?.title).toBe("Board 1");
	});
});

/* -------------------------------------------------------------------------- */
/* board/updated                                                               */
/* -------------------------------------------------------------------------- */

describe("board/updated", () => {
	it("updates and trims the title and refreshes updatedAt", () => {
		const result = reduce(seedState(), {
			type: "board/updated",
			payload: { id: "b1", changes: { title: "  Renamed  " } },
		});

		expect(result.boards.b1?.title).toBe("Renamed");
		expect(result.boards.b1?.updatedAt).toBe(NOW);
	});

	it("updates only the description and keeps the title", () => {
		const result = reduce(seedState(), {
			type: "board/updated",
			payload: { id: "b1", changes: { description: "  New description " } },
		});

		expect(result.boards.b1?.title).toBe("Board 1");
		expect(result.boards.b1?.description).toBe("New description");
	});

	it("allows clearing the description", () => {
		const state = seedState();
		state.boards.b1 = makeBoard({
			...state.boards.b1,
			description: "Something",
		});
		const result = reduce(state, {
			type: "board/updated",
			payload: { id: "b1", changes: { description: "" } },
		});

		expect(result.boards.b1?.description).toBe("");
	});

	it("rejects an empty title", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "board/updated",
			payload: { id: "b1", changes: { title: "   " } },
		});

		expect(result).toBe(state);
	});

	it("ignores an unknown board", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "board/updated",
			payload: { id: "missing", changes: { title: "X" } },
		});

		expect(result).toBe(state);
	});

	it("does not touch other boards", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "board/updated",
			payload: { id: "b1", changes: { title: "Renamed" } },
		});

		expect(result.boards.b2).toBe(state.boards.b2);
	});
});

/* -------------------------------------------------------------------------- */
/* board/deleted                                                               */
/* -------------------------------------------------------------------------- */

describe("board/deleted", () => {
	it("removes the board with its columns, cards and tags", () => {
		const result = reduce(seedState(), {
			type: "board/deleted",
			payload: { id: "b1" },
		});

		expect(Object.keys(result.boards)).toEqual(["b2"]);
		expect(Object.keys(result.columns)).toEqual(["c3"]);
		expect(Object.keys(result.cards)).toEqual(["k5"]);
		expect(Object.keys(result.tags)).toEqual(["t5"]);
	});

	it("also removes orphaned columns that reference the board", () => {
		const state = seedState();
		state.columns.orphan = makeColumn({
			id: "orphan",
			boardId: "b1",
			cardIds: ["kOrphan"],
		});
		state.cards.kOrphan = makeCard({
			id: "kOrphan",
			boardId: "b1",
			columnId: "orphan",
			title: "Orphan card",
			tagIds: ["tOrphan"],
		});
		state.tags.tOrphan = makeTag({
			id: "tOrphan",
			cardId: "kOrphan",
			columnId: "orphan",
		});

		const result = reduce(state, {
			type: "board/deleted",
			payload: { id: "b1" },
		});

		expect(result.columns.orphan).toBeUndefined();
		expect(result.cards.kOrphan).toBeUndefined();
		expect(result.tags.tOrphan).toBeUndefined();
	});

	it("removes tags listed on a card even if the tag record points elsewhere", () => {
		const state = seedState();
		// t2 is listed on k1 but its record points to another card.
		state.tags.t2 = makeTag({
			id: "t2",
			cardId: "someone-else",
			columnId: "c1",
			status: ONGOING,
		});

		const result = reduce(state, {
			type: "board/deleted",
			payload: { id: "b1" },
		});

		expect(result.tags.t2).toBeUndefined();
	});

	it("leaves other boards untouched", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "board/deleted",
			payload: { id: "b1" },
		});

		expect(result.boards.b2).toBe(state.boards.b2);
		expect(result.columns.c3).toBe(state.columns.c3);
		expect(result.cards.k5).toBe(state.cards.k5);
		expect(result.tags.t5).toBe(state.tags.t5);
	});

	it("ignores an unknown or empty board id", () => {
		const state = seedState();

		expect(
			reduce(state, { type: "board/deleted", payload: { id: "missing" } }),
		).toBe(state);
		expect(reduce(state, { type: "board/deleted", payload: { id: "" } })).toBe(
			state,
		);
	});
});

/* -------------------------------------------------------------------------- */
/* column/created                                                              */
/* -------------------------------------------------------------------------- */

describe("column/created", () => {
	it("adds a column, trims the title and registers it on the board", () => {
		const result = reduce(seedState(), {
			type: "column/created",
			payload: makeColumn({ id: "c9", boardId: "b1", title: "  Review  " }),
		});

		expect(result.columns.c9?.title).toBe("Review");
		expect(result.boards.b1?.columnIds).toEqual(["c1", "c2", "c9"]);
	});

	it("sets position to the end of the board's columns", () => {
		const result = reduce(seedState(), {
			type: "column/created",
			payload: makeColumn({ id: "c9", boardId: "b1", title: "Review" }),
		});

		expect(result.columns.c9).toMatchObject({ position: 2 });
	});

	it("does not change other boards", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "column/created",
			payload: makeColumn({ id: "c9", boardId: "b1", title: "Review" }),
		});

		expect(result.boards.b2).toBe(state.boards.b2);
	});

	it.each(["", "   "])("rejects an empty title (%j)", (title) => {
		const state = seedState();
		const result = reduce(state, {
			type: "column/created",
			payload: makeColumn({ id: "c9", boardId: "b1", title }),
		});

		expect(result).toBe(state);
	});

	it("rejects a duplicate column id", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "column/created",
			payload: makeColumn({ id: "c1", boardId: "b1", title: "Duplicate" }),
		});

		expect(result).toBe(state);
	});

	it("rejects a column for a missing board", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "column/created",
			payload: makeColumn({ id: "c9", boardId: "missing", title: "Review" }),
		});

		expect(result).toBe(state);
	});
});

/* -------------------------------------------------------------------------- */
/* column/updated                                                              */
/* -------------------------------------------------------------------------- */

describe("column/updated", () => {
	it("updates and trims the title and refreshes the board's updatedAt", () => {
		const result = reduce(seedState(), {
			type: "column/updated",
			payload: { id: "c1", changes: { title: "  Backlog  " } },
		});

		expect(result.columns.c1?.title).toBe("Backlog");
		expect(result.boards.b1?.updatedAt).toBe(NOW);
	});

	it("applies a position change and keeps the title", () => {
		const result = reduce(seedState(), {
			type: "column/updated",
			payload: { id: "c1", changes: { position: 3 } },
		});

		expect(result.columns.c1).toMatchObject({ title: "Todo", position: 3 });
	});

	it("rejects an empty title", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "column/updated",
			payload: { id: "c1", changes: { title: "  " } },
		});

		expect(result).toBe(state);
	});

	it("ignores an unknown column", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "column/updated",
			payload: { id: "missing", changes: { title: "X" } },
		});

		expect(result).toBe(state);
	});

	it("does not touch other columns or boards", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "column/updated",
			payload: { id: "c1", changes: { title: "Backlog" } },
		});

		expect(result.columns.c2).toBe(state.columns.c2);
		expect(result.boards.b2).toBe(state.boards.b2);
	});
});

/* -------------------------------------------------------------------------- */
/* column/deleted                                                              */
/* -------------------------------------------------------------------------- */

describe("column/deleted", () => {
	it("removes the column with its cards and tags", () => {
		const result = reduce(seedState(), {
			type: "column/deleted",
			payload: { id: "c1" },
		});

		expect(Object.keys(result.columns).sort()).toEqual(["c2", "c3"]);
		expect(Object.keys(result.cards).sort()).toEqual(["k4", "k5"]);
		expect(Object.keys(result.tags).sort()).toEqual(["t4", "t5"]);
	});

	it("removes the column id from its board and refreshes updatedAt", () => {
		const result = reduce(seedState(), {
			type: "column/deleted",
			payload: { id: "c1" },
		});

		expect(result.boards.b1?.columnIds).toEqual(["c2"]);
		expect(result.boards.b1?.updatedAt).toBe(NOW);
	});

	it("also removes cards that reference the column but are not in cardIds", () => {
		const state = seedState();
		state.cards.stray = makeCard({
			id: "stray",
			boardId: "b1",
			columnId: "c1",
			title: "Stray",
		});

		const result = reduce(state, {
			type: "column/deleted",
			payload: { id: "c1" },
		});

		expect(result.cards.stray).toBeUndefined();
	});

	it("leaves other boards untouched", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "column/deleted",
			payload: { id: "c1" },
		});

		expect(result.boards.b2).toBe(state.boards.b2);
	});

	it("still removes the column when its board is missing", () => {
		const state = seedState();
		delete state.boards.b1;

		const result = reduce(state, {
			type: "column/deleted",
			payload: { id: "c1" },
		});

		expect(result.columns.c1).toBeUndefined();
		expect(result.boards.b1).toBeUndefined();
	});

	it("ignores an unknown column", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "column/deleted",
			payload: { id: "missing" },
		});

		expect(result).toBe(state);
	});
});

/* -------------------------------------------------------------------------- */
/* card/created                                                                */
/* -------------------------------------------------------------------------- */

describe("card/created", () => {
	const newCard = (overrides: Partial<BoardCard> = {}) =>
		makeCard({
			id: "k9",
			boardId: "b1",
			columnId: "c1",
			title: "  New card  ",
			description: "  Details  ",
			updatedAt: NOW,
			...overrides,
		});

	it("adds the card, trims text and registers it on the column", () => {
		const result = reduce(seedState(), {
			type: "card/created",
			payload: newCard(),
		});

		expect(result.cards.k9).toMatchObject({
			title: "New card",
			description: "Details",
		});
		expect(result.columns.c1?.cardIds).toEqual(["k1", "k2", "k3", "k9"]);
	});

	it("sets position to the end of the column", () => {
		const result = reduce(seedState(), {
			type: "card/created",
			payload: newCard(),
		});

		expect(result.cards.k9?.position).toBe(3);
	});

	it("updates the parent board's updatedAt to the card's updatedAt", () => {
		const result = reduce(seedState(), {
			type: "card/created",
			payload: newCard({ updatedAt: "2026-05-05T10:00:00.000Z" }),
		});

		expect(result.boards.b1?.updatedAt).toBe("2026-05-05T10:00:00.000Z");
	});

	it.each(["", "   "])("rejects an empty title (%j)", (title) => {
		const state = seedState();

		expect(
			reduce(state, { type: "card/created", payload: newCard({ title }) }),
		).toBe(state);
	});

	it("rejects a card for a missing column", () => {
		const state = seedState();

		expect(
			reduce(state, {
				type: "card/created",
				payload: newCard({ columnId: "missing" }),
			}),
		).toBe(state);
	});

	it("rejects a card for a missing board", () => {
		const state = seedState();

		expect(
			reduce(state, {
				type: "card/created",
				payload: newCard({ boardId: "missing" }),
			}),
		).toBe(state);
	});

	it("rejects a card whose column belongs to a different board", () => {
		const state = seedState();

		expect(
			reduce(state, {
				type: "card/created",
				payload: newCard({ boardId: "b2", columnId: "c1" }),
			}),
		).toBe(state);
	});

	it("rejects a duplicate card id", () => {
		const state = seedState();

		expect(
			reduce(state, { type: "card/created", payload: newCard({ id: "k1" }) }),
		).toBe(state);
	});
});

/* -------------------------------------------------------------------------- */
/* card/updated                                                                */
/* -------------------------------------------------------------------------- */

describe("card/updated", () => {
	it("updates and trims title and description", () => {
		const result = reduce(seedState(), {
			type: "card/updated",
			payload: {
				id: "k1",
				changes: { title: "  Renamed  ", description: "  Notes  " },
			},
		});

		expect(result.cards.k1).toMatchObject({
			title: "Renamed",
			description: "Notes",
		});
	});

	it("keeps untouched fields when only one field changes", () => {
		const result = reduce(seedState(), {
			type: "card/updated",
			payload: { id: "k1", changes: { description: "Only this" } },
		});

		expect(result.cards.k1).toMatchObject({
			title: "Card 1",
			description: "Only this",
			dueDate: null,
		});
	});

	it("rejects an empty title", () => {
		const state = seedState();

		expect(
			reduce(state, {
				type: "card/updated",
				payload: { id: "k1", changes: { title: "  " } },
			}),
		).toBe(state);
	});

	it("ignores an unknown card", () => {
		const state = seedState();

		expect(
			reduce(state, {
				type: "card/updated",
				payload: { id: "missing", changes: { title: "X" } },
			}),
		).toBe(state);
	});

	it("ignores a card whose column is missing", () => {
		const state = seedState();
		delete state.columns.c1;

		expect(
			reduce(state, {
				type: "card/updated",
				payload: { id: "k1", changes: { title: "X" } },
			}),
		).toBe(state);
	});

	it("ignores a card that is not listed in its column", () => {
		const state = seedState();
		state.columns.c1 = makeColumn({
			...state.columns.c1,
			cardIds: ["k2", "k3"],
		});

		expect(
			reduce(state, {
				type: "card/updated",
				payload: { id: "k1", changes: { title: "X" } },
			}),
		).toBe(state);
	});

	describe("position", () => {
		it("moves a card down and renormalizes positions", () => {
			const result = reduce(seedState(), {
				type: "card/updated",
				payload: { id: "k1", changes: { position: 2 } },
			});

			expect(result.columns.c1?.cardIds).toEqual(["k2", "k3", "k1"]);
			expect(result.cards.k2?.position).toBe(0);
			expect(result.cards.k3?.position).toBe(1);
			expect(result.cards.k1?.position).toBe(2);
		});

		it("moves a card up and renormalizes positions", () => {
			const result = reduce(seedState(), {
				type: "card/updated",
				payload: { id: "k3", changes: { position: 0 } },
			});

			expect(result.columns.c1?.cardIds).toEqual(["k3", "k1", "k2"]);
			expect(result.cards.k3?.position).toBe(0);
			expect(result.cards.k1?.position).toBe(1);
			expect(result.cards.k2?.position).toBe(2);
		});

		it("clamps a position beyond the end to the last slot", () => {
			const result = reduce(seedState(), {
				type: "card/updated",
				payload: { id: "k1", changes: { position: 99 } },
			});

			expect(result.columns.c1?.cardIds).toEqual(["k2", "k3", "k1"]);
			expect(result.cards.k1?.position).toBe(2);
		});

		it("does not reorder when position is not provided", () => {
			const result = reduce(seedState(), {
				type: "card/updated",
				payload: { id: "k1", changes: { title: "Renamed" } },
			});

			expect(result.columns.c1?.cardIds).toEqual(["k1", "k2", "k3"]);
		});

		it("keeps the canonical position when null is supplied without reordering", () => {
			const result = reduce(seedState(), {
				type: "card/updated",
				payload: { id: "k1", changes: { position: null } },
			});

			expect(result.cards.k1?.position).toBe(0);
			expect(result.columns.c1?.cardIds).toEqual(["k1", "k2", "k3"]);
		});

		it.each([
			-1,
			1.5,
			Number.NaN,
		])("rejects an invalid position (%s)", (position) => {
			const state = seedState();

			expect(
				reduce(state, {
					type: "card/updated",
					payload: { id: "k1", changes: { position } },
				}),
			).toBe(state);
		});

		it("does not touch cards in other columns", () => {
			const state = seedState();
			const result = reduce(state, {
				type: "card/updated",
				payload: { id: "k1", changes: { position: 2 } },
			});

			expect(result.cards.k4).toBe(state.cards.k4);
			expect(result.cards.k5).toBe(state.cards.k5);
		});
	});

	describe("dueDate", () => {
		it("sets a valid due date", () => {
			const result = reduce(seedState(), {
				type: "card/updated",
				payload: { id: "k1", changes: { dueDate: "2026-12-31" } },
			});

			expect(result.cards.k1?.dueDate).toBe("2026-12-31");
		});

		it("clears the due date with null", () => {
			const state = seedState();
			state.cards.k1 = makeCard({ ...state.cards.k1, dueDate: "2026-12-31" });

			const result = reduce(state, {
				type: "card/updated",
				payload: { id: "k1", changes: { dueDate: null } },
			});

			expect(result.cards.k1?.dueDate).toBeNull();
		});

		it("keeps the existing due date when dueDate is not provided", () => {
			const state = seedState();
			state.cards.k1 = makeCard({ ...state.cards.k1, dueDate: "2026-12-31" });

			const result = reduce(state, {
				type: "card/updated",
				payload: { id: "k1", changes: { title: "Renamed" } },
			});

			expect(result.cards.k1?.dueDate).toBe("2026-12-31");
		});

		it("rejects an unparseable due date", () => {
			const state = seedState();

			expect(
				reduce(state, {
					type: "card/updated",
					payload: { id: "k1", changes: { dueDate: "not-a-date" } },
				}),
			).toBe(state);
		});
	});
});

/* -------------------------------------------------------------------------- */
/* card/tags-updated                                                           */
/* -------------------------------------------------------------------------- */

describe("card/tags-updated", () => {
	const tagFor = (overrides: Partial<Tag> = {}) =>
		makeTag({
			id: "t9",
			cardId: "k1",
			columnId: "c1",
			status: COMPLETED,
			...overrides,
		});

	it("replaces the card's tags with the new ones", () => {
		const result = reduce(seedState(), {
			type: "card/tags-updated",
			payload: { cardId: "k1", tags: [tagFor()] },
		});

		expect(result.tags.t1).toBeUndefined();
		expect(result.tags.t2).toBeUndefined();
		expect(result.tags.t9).toBeDefined();
		expect(result.cards.k1?.tagIds).toEqual(["t9"]);
	});

	it("keeps existing tag ids that are re-submitted", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "card/tags-updated",
			payload: {
				cardId: "k1",
				tags: [state.tags.t1 as Tag, tagFor()],
			},
		});

		expect(result.cards.k1?.tagIds).toEqual(["t1", "t9"]);
		expect(result.tags.t1).toBeDefined();
		expect(result.tags.t2).toBeUndefined();
	});

	it("clears all tags when given an empty list", () => {
		const result = reduce(seedState(), {
			type: "card/tags-updated",
			payload: { cardId: "k1", tags: [] },
		});

		expect(result.cards.k1?.tagIds).toEqual([]);
		expect(result.tags.t1).toBeUndefined();
		expect(result.tags.t2).toBeUndefined();
	});

	it("refreshes updatedAt on the card and its board", () => {
		const result = reduce(seedState(), {
			type: "card/tags-updated",
			payload: { cardId: "k1", tags: [tagFor()] },
		});

		expect(result.cards.k1?.updatedAt).toBe(NOW);
		expect(result.boards.b1?.updatedAt).toBe(NOW);
	});

	it("does not touch tags that belong to other cards", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "card/tags-updated",
			payload: { cardId: "k1", tags: [tagFor()] },
		});

		expect(result.tags.t3).toBe(state.tags.t3);
		expect(result.tags.t4).toBe(state.tags.t4);
		expect(result.tags.t5).toBe(state.tags.t5);
	});

	it("ignores an unknown card", () => {
		const state = seedState();

		expect(
			reduce(state, {
				type: "card/tags-updated",
				payload: { cardId: "missing", tags: [tagFor({ cardId: "missing" })] },
			}),
		).toBe(state);
	});

	it("ignores a card whose column is missing", () => {
		const state = seedState();
		delete state.columns.c1;

		expect(
			reduce(state, {
				type: "card/tags-updated",
				payload: { cardId: "k1", tags: [tagFor()] },
			}),
		).toBe(state);
	});

	it("rejects duplicate tag ids", () => {
		const state = seedState();

		expect(
			reduce(state, {
				type: "card/tags-updated",
				payload: {
					cardId: "k1",
					tags: [tagFor({ status: COMPLETED }), tagFor({ status: ONGOING })],
				},
			}),
		).toBe(state);
	});

	it("rejects two tags with the same status", () => {
		const state = seedState();

		expect(
			reduce(state, {
				type: "card/tags-updated",
				payload: {
					cardId: "k1",
					tags: [tagFor({ id: "t8" }), tagFor({ id: "t9" })],
				},
			}),
		).toBe(state);
	});

	it("rejects a tag with an empty id", () => {
		const state = seedState();

		expect(
			reduce(state, {
				type: "card/tags-updated",
				payload: { cardId: "k1", tags: [tagFor({ id: "" })] },
			}),
		).toBe(state);
	});

	it("rejects a tag that points to a different card", () => {
		const state = seedState();

		expect(
			reduce(state, {
				type: "card/tags-updated",
				payload: { cardId: "k1", tags: [tagFor({ cardId: "k2" })] },
			}),
		).toBe(state);
	});

	it("rejects a tag that points to a different column", () => {
		const state = seedState();

		expect(
			reduce(state, {
				type: "card/tags-updated",
				payload: { cardId: "k1", tags: [tagFor({ columnId: "c2" })] },
			}),
		).toBe(state);
	});

	it("rejects reusing a tag id that already belongs to another card", () => {
		const state = seedState();

		// t4 currently belongs to k4.
		expect(
			reduce(state, {
				type: "card/tags-updated",
				payload: { cardId: "k1", tags: [tagFor({ id: "t4" })] },
			}),
		).toBe(state);
	});
});

/* -------------------------------------------------------------------------- */
/* card/moved                                                                  */
/* -------------------------------------------------------------------------- */

describe("card/moved", () => {
	it.each([
		{
			cardId: "k3",
			destinationIndex: 0,
			cardIds: ["k3", "k1", "k2"],
		},
		{
			cardId: "k1",
			destinationIndex: 1,
			cardIds: ["k2", "k1", "k3"],
		},
		{
			cardId: "k1",
			destinationIndex: 2,
			cardIds: ["k2", "k3", "k1"],
		},
	])("moves a card to same-column index $destinationIndex and synchronizes positions", ({
		cardId,
		destinationIndex,
		cardIds,
	}) => {
		const state = seedState();
		const result = reduce(state, {
			type: "card/moved",
			payload: {
				cardId,
				sourceColumnId: "c1",
				destinationColumnId: "c1",
				destinationIndex,
				movedAt: NOW,
			},
		});

		expect(result.columns.c1?.cardIds).toEqual(cardIds);
		cardIds.forEach((cardId, index) => {
			expect(result.cards[cardId]?.position).toBe(index);
		});
		expect(result.cards[cardId]?.updatedAt).toBe(NOW);
		expect(result.columns.c2).toBe(state.columns.c2);
	});

	it("returns the same state for a same-position move", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "card/moved",
			payload: {
				cardId: "k2",
				sourceColumnId: "c1",
				destinationColumnId: "c1",
				destinationIndex: 1,
				movedAt: NOW,
			},
		});

		expect(result).toBe(state);
	});

	it.each([
		{ destinationIndex: 0, cardIds: ["k1", "k4", "k6", "k7"] },
		{ destinationIndex: 2, cardIds: ["k4", "k6", "k1", "k7"] },
		{ destinationIndex: 3, cardIds: ["k4", "k6", "k7", "k1"] },
	])("moves a card to destination index $destinationIndex", ({
		destinationIndex,
		cardIds,
	}) => {
		const state = seedState();
		state.columns.c2.cardIds = ["k4", "k6", "k7"];
		state.cards.k6 = makeCard({
			id: "k6",
			boardId: "b1",
			columnId: "c2",
			position: 1,
		});
		state.cards.k7 = makeCard({
			id: "k7",
			boardId: "b1",
			columnId: "c2",
			position: 2,
		});
		const result = reduce(state, {
			type: "card/moved",
			payload: {
				cardId: "k1",
				sourceColumnId: "c1",
				destinationColumnId: "c2",
				destinationIndex,
				movedAt: NOW,
			},
		});

		expect(result.columns.c1?.cardIds).toEqual(["k2", "k3"]);
		expect(result.columns.c2?.cardIds).toEqual(cardIds);
		expect(result.cards.k1?.columnId).toBe("c2");
		expect(result.cards.k2?.position).toBe(0);
		expect(result.cards.k3?.position).toBe(1);
		cardIds.forEach((cardId, index) => {
			expect(result.cards[cardId]?.position).toBe(index);
		});
		expect(result.cards.k1?.updatedAt).toBe(NOW);
		expect(result.tags.t1?.columnId).toBe("c2");
		expect(result.tags.t2?.columnId).toBe("c2");
		expect(state.columns.c1?.cardIds).toEqual(["k1", "k2", "k3"]);
		expect(state.tags.t1?.columnId).toBe("c1");
		expect(result.tags.t3).toBe(state.tags.t3);
		expect(result.cards.k5).toBe(state.cards.k5);
	});

	it("moves a card into an empty destination column", () => {
		const state = seedState();
		state.boards.b1?.columnIds.push("c4");
		state.columns.c4 = makeColumn({
			id: "c4",
			boardId: "b1",
			title: "New",
			cardIds: [],
		});
		const result = reduce(state, {
			type: "card/moved",
			payload: {
				cardId: "k1",
				sourceColumnId: "c1",
				destinationColumnId: "c4",
				destinationIndex: 0,
				movedAt: NOW,
			},
		});

		expect(result.columns.c1?.cardIds).toEqual(["k2", "k3"]);
		expect(result.columns.c4?.cardIds).toEqual(["k1"]);
		expect(result.cards.k1?.columnId).toBe("c4");
		expect(result.cards.k1?.position).toBe(0);
		expect(result.cards.k2?.position).toBe(0);
		expect(result.cards.k3?.position).toBe(1);
		expect(result.cards.k1?.updatedAt).toBe(NOW);
		expect(result.tags.t1?.columnId).toBe("c4");
	});

	it("rejects invalid indexes, missing entities, stale sources, and cross-board moves", () => {
		const state = seedState();
		const basePayload = {
			cardId: "k1",
			sourceColumnId: "c1",
			destinationColumnId: "c2",
			destinationIndex: 0,
			movedAt: NOW,
		};

		expect(
			reduce(state, {
				type: "card/moved",
				payload: { ...basePayload, sourceColumnId: "c2" },
			}),
		).toBe(state);
		expect(
			reduce(state, {
				type: "card/moved",
				payload: { ...basePayload, destinationColumnId: "c3" },
			}),
		).toBe(state);
		expect(
			reduce(state, {
				type: "card/moved",
				payload: { ...basePayload, destinationIndex: -1 },
			}),
		).toBe(state);
		expect(
			reduce(state, {
				type: "card/moved",
				payload: { ...basePayload, destinationIndex: 1.5 },
			}),
		).toBe(state);
		expect(
			reduce(state, {
				type: "card/moved",
				payload: { ...basePayload, destinationIndex: 2 },
			}),
		).toBe(state);
		expect(
			reduce(state, {
				type: "card/moved",
				payload: { ...basePayload, cardId: "missing" },
			}),
		).toBe(state);
		expect(
			reduce(state, {
				type: "card/moved",
				payload: { ...basePayload, sourceColumnId: "missing" },
			}),
		).toBe(state);
		expect(
			reduce(state, {
				type: "card/moved",
				payload: { ...basePayload, destinationColumnId: "missing" },
			}),
		).toBe(state);
	});

	it("rejects a move when an affected column has inconsistent membership", () => {
		const state = seedState();
		state.columns.c1?.cardIds.push("k1");

		expect(
			reduce(state, {
				type: "card/moved",
				payload: {
					cardId: "k1",
					sourceColumnId: "c1",
					destinationColumnId: "c2",
					destinationIndex: 0,
					movedAt: NOW,
				},
			}),
		).toBe(state);
	});
});

/* -------------------------------------------------------------------------- */
/* card/deleted                                                                */
/* -------------------------------------------------------------------------- */

describe("card/deleted", () => {
	it("removes the card and its tags", () => {
		const result = reduce(seedState(), {
			type: "card/deleted",
			payload: { id: "k1" },
		});

		expect(result.cards.k1).toBeUndefined();
		expect(result.tags.t1).toBeUndefined();
		expect(result.tags.t2).toBeUndefined();
	});

	it("removes the card id from its column and renormalizes positions", () => {
		const result = reduce(seedState(), {
			type: "card/deleted",
			payload: { id: "k1" },
		});

		expect(result.columns.c1?.cardIds).toEqual(["k2", "k3"]);
		expect(result.cards.k2?.position).toBe(0);
		expect(result.cards.k3?.position).toBe(1);
	});

	it("leaves other cards, tags and columns untouched", () => {
		const state = seedState();
		const result = reduce(state, {
			type: "card/deleted",
			payload: { id: "k1" },
		});

		expect(result.cards.k4).toBe(state.cards.k4);
		expect(result.cards.k5).toBe(state.cards.k5);
		expect(result.tags.t3).toBe(state.tags.t3);
		expect(result.tags.t4).toBe(state.tags.t4);
		expect(result.columns.c2).toBe(state.columns.c2);
	});

	it("still removes the card when its column is missing", () => {
		const state = seedState();
		delete state.columns.c1;

		const result = reduce(state, {
			type: "card/deleted",
			payload: { id: "k1" },
		});

		expect(result.cards.k1).toBeUndefined();
		expect(result.tags.t1).toBeUndefined();
		expect(result.columns.c1).toBeUndefined();
	});

	it("ignores an unknown or empty card id", () => {
		const state = seedState();

		expect(
			reduce(state, { type: "card/deleted", payload: { id: "missing" } }),
		).toBe(state);
		expect(reduce(state, { type: "card/deleted", payload: { id: "" } })).toBe(
			state,
		);
	});
});
