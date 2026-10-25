import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockBoardApi, type MockBoardApi } from "@/services/mockBoardApi";
import { AppProvider, useAppProvider } from "./AppProvider";
import { initialAppState } from "./app.initialState";
import type { Board } from "./domain.types";

const makeBoard = (id: string, title: string): Board => ({
	id,
	title,
	description: "",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	columnIds: [],
});

function TestConsumer() {
	const { state, dispatch, persistence, retrySave } = useAppProvider();

	return (
		<div>
			<div data-testid="state-reading">{persistence.message}</div>
			{persistence.canRetry ? (
				<button type="button" aria-label="Retry save" onClick={retrySave}>
					Retry save
				</button>
			) : null}
			<button
				type="button"
				onClick={() =>
					dispatch({
						type: "board/created",
						payload: makeBoard("board-1", "Board 1"),
					})
				}
			>
				Create board
			</button>
			<span>{state.boards["board-1"]?.title ?? "no-board"}</span>
		</div>
	);
}

describe("AppProvider persistence", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("shows saved state after hydration and persists optimistic changes", async () => {
		const mockApi = createMockBoardApi({ latencyMs: 0 });
		const { rerender } = render(
			<AppProvider mockApi={mockApi}>
				<TestConsumer />
			</AppProvider>,
		);

		await waitFor(() => {
			expect(screen.getByText("All changes saved.")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: "Create board" }));

		await waitFor(() => {
			expect(screen.getByText("All changes saved.")).toBeInTheDocument();
		});
		expect(screen.getByText("Board 1")).toBeInTheDocument();
		rerender(
			<AppProvider mockApi={mockApi}>
				<TestConsumer />
			</AppProvider>,
		);
	});

	it("exposes an unsaved status and retries the latest snapshot", async () => {
		const saveState = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				error: "Mock API rejected the save for testing.",
				revision: 0,
			})
			.mockResolvedValueOnce({
				ok: true,
				state: {
					boards: {
						"board-1": makeBoard("board-1", "Board 1"),
					},
					columns: {},
					cards: {},
					tags: {},
				},
				revision: 1,
			});
		const mockApi: MockBoardApi = {
			loadInitialState: async () => ({
				status: "loaded",
				state: initialAppState,
				revision: 0,
			}),
			saveState,
			getState: () => structuredClone(initialAppState),
			getRevision: () => 0,
			reset: vi.fn(),
		};

		render(
			<AppProvider mockApi={mockApi}>
				<TestConsumer />
			</AppProvider>,
		);

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Create board" }),
			).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: "Create board" }));

		await waitFor(() => {
			expect(
				screen.getByText("Mock API rejected the save for testing."),
			).toBeInTheDocument();
		});
		expect(screen.getByRole("button", { name: "Retry save" })).toBeVisible();

		fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
		await waitFor(() => {
			expect(screen.getByText("All changes saved.")).toBeInTheDocument();
		});
	});
});
