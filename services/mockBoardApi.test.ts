import { describe, expect, it } from "vitest";
import type {
	AppState,
	Board,
	BoardCard,
	BoardColumn,
} from "@/state/domain.types";
import { createMockBoardApi } from "./mockBoardApi";

const createState = (overrides: Partial<AppState> = {}): AppState => ({
	boards: {
		"board-1": {
			id: "board-1",
			title: "Board 1",
			description: "",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
			columnIds: ["column-1"],
		} satisfies Board,
	},
	columns: {
		"column-1": {
			id: "column-1",
			boardId: "board-1",
			title: "Todo",
			cardIds: ["card-1"],
		} satisfies BoardColumn,
	},
	cards: {
		"card-1": {
			id: "card-1",
			boardId: "board-1",
			columnId: "column-1",
			title: "Task 1",
			description: "",
			tagIds: [],
			dueDate: null,
			position: 0,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		} satisfies BoardCard,
	},
	tags: {},
	...overrides,
});

describe("createMockBoardApi", () => {
	it("loads the initial snapshot and advances the revision after a successful save", async () => {
		const api = createMockBoardApi({
			initialState: createState(),
			latencyMs: 0,
		});

		const loaded = await api.loadInitialState();
		const nextState = createState({
			boards: {
				"board-1": {
					...createState().boards["board-1"],
					title: "Board 2",
				},
			},
		});
		const result = await api.saveState(nextState);

		expect(loaded.status).toBe("loaded");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.revision).toBe(1);
		expect(api.getState().boards["board-1"].title).toBe("Board 2");
		const stored = await api.loadInitialState();
		expect(stored.state).toEqual(api.getState());
	});

	it("rejects stale writes and keeps the newer confirmed snapshot", async () => {
		const api = createMockBoardApi({ latencyMs: 0 });
		const stateA = createState();
		const stateB = createState({
			boards: {
				"board-1": {
					...stateA.boards["board-1"],
					title: "Board B",
				},
			},
		});
		const stateC = createState({
			boards: {
				"board-1": {
					...stateA.boards["board-1"],
					title: "Board C",
				},
			},
		});

		const first = await api.saveState(stateA);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const stale = await api.saveState(stateB, 0);
		expect(stale.ok).toBe(false);
		const accepted = await api.saveState(stateC, 1);
		expect(accepted.ok).toBe(true);
		if (!accepted.ok) return;
		expect(api.getState().boards["board-1"].title).toBe("Board C");
	});

	it("fails a configured save and recovers on a later retry", async () => {
		const api = createMockBoardApi({
			failNextSaveCount: 1,
			latencyMs: 0,
		});
		const nextState = createState();

		const failed = await api.saveState(nextState);
		expect(failed.ok).toBe(false);
		if (failed.ok) return;
		expect(api.getRevision()).toBe(0);

		const recovered = await api.saveState(nextState, 0);
		expect(recovered.ok).toBe(true);
		if (!recovered.ok) return;
		expect(recovered.revision).toBe(1);
	});

	it("does not mutate the caller-owned state when saving", async () => {
		const api = createMockBoardApi({ latencyMs: 0 });
		const state = createState();
		const before = structuredClone(state);

		state.boards["board-1"] = {
			...state.boards["board-1"],
			title: "Mutated caller state",
		};
		const saved = await api.saveState(before);
		expect(saved.ok).toBe(true);
		if (!saved.ok) return;
		expect(api.getState().boards["board-1"].title).toBe("Board 1");
	});
});
