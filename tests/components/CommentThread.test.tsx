import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import CommentThread from "@/features/board/components/CommentThread";
import {
	createMockBoardApi,
	type MockBoardApi,
	type MockBoardApiSaveResult,
} from "@/services/mockBoardApi";
import { AppProvider } from "@/state/AppProvider";
import type { AppState } from "@/state/domain.types";

function createState(): AppState {
	return {
		boards: {
			board: {
				id: "board",
				title: "Board",
				description: "",
				createdAt: "2026-10-01T00:00:00.000Z",
				updatedAt: "2026-10-01T00:00:00.000Z",
				columnIds: ["column"],
			},
		},
		columns: {
			column: {
				id: "column",
				boardId: "board",
				title: "Todo",
				cardIds: ["card"],
			},
		},
		cards: {
			card: {
				id: "card",
				boardId: "board",
				columnId: "column",
				title: "A task",
				description: "",
				tagIds: [],
				dueDate: null,
				position: 0,
				createdAt: "2026-10-01T00:00:00.000Z",
				updatedAt: "2026-10-01T00:00:00.000Z",
			},
		},
		tags: {},
		comments: {},
	};
}

function renderThread(failNextSaveCount = 0) {
	const api = createMockBoardApi({
		initialState: createState(),
		latencyMs: 0,
		failNextSaveCount,
	});
	render(
		<AppProvider mockApi={api}>
			<CommentThread
				cardId="card"
				cardTitle="A task"
				onClose={() => undefined}
			/>
		</AppProvider>,
	);
	return api;
}

describe("CommentThread", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("adds comments and nested replies, edits with cancel, and cascades deletion", async () => {
		renderThread();
		const newComment = await screen.findByRole("textbox", {
			name: "Add a comment",
		});

		fireEvent.change(newComment, { target: { value: "Root comment" } });
		fireEvent.click(screen.getByRole("button", { name: "Post comment" }));
		expect(await screen.findByText("Root comment")).toBeInTheDocument();
		await waitFor(() => expect(document.activeElement).toBe(newComment));

		const replyButton = screen.getByRole("button", {
			name: "Reply to comment by Demo user",
		});
		fireEvent.click(replyButton);
		const replyInput = screen.getByRole("textbox", {
			name: "Reply to comment by Demo user",
		});
		fireEvent.change(replyInput, { target: { value: "First reply" } });
		fireEvent.click(screen.getByRole("button", { name: "Post reply" }));
		expect(await screen.findByText("First reply")).toBeInTheDocument();
		await waitFor(() => expect(document.activeElement).toBe(replyButton));

		const firstReplyArticle = screen.getByRole("article", {
			name: "Comment by Demo user, level 2",
		});
		fireEvent.click(
			firstReplyArticle.querySelector<HTMLButtonElement>(
				"button[data-comment-reply]",
			) as HTMLButtonElement,
		);
		const nestedReplyInput = screen.getByRole("textbox", {
			name: "Reply to comment by Demo user",
		});
		fireEvent.change(nestedReplyInput, {
			target: { value: "Reply to reply" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Post reply" }));
		expect(await screen.findByText("Reply to reply")).toBeInTheDocument();

		fireEvent.click(
			screen.getAllByRole("button", { name: "Edit comment by Demo user" })[0],
		);
		const editInput = screen.getByRole("textbox", {
			name: "Edit comment by Demo user",
		});
		fireEvent.change(editInput, { target: { value: "Canceled edit" } });
		fireEvent.click(screen.getByRole("button", { name: "Cancel edit" }));
		expect(screen.getByText("Root comment")).toBeInTheDocument();
		expect(screen.queryByText("Canceled edit")).not.toBeInTheDocument();

		fireEvent.click(
			screen.getAllByRole("button", { name: "Edit comment by Demo user" })[0],
		);
		fireEvent.change(
			screen.getByRole("textbox", { name: "Edit comment by Demo user" }),
			{ target: { value: "Updated root" } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Save comment" }));
		expect(await screen.findByText("Updated root")).toBeInTheDocument();

		fireEvent.click(
			screen.getAllByRole("button", { name: "Delete comment by Demo user" })[0],
		);
		expect(
			screen.getByText("Delete this comment and all its replies?"),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
		await waitFor(() => {
			expect(screen.queryByText("Updated root")).not.toBeInTheDocument();
			expect(screen.queryByText("First reply")).not.toBeInTheDocument();
			expect(screen.queryByText("Reply to reply")).not.toBeInTheDocument();
		});
	});

	it("announces validation errors for empty comments", async () => {
		renderThread();
		fireEvent.click(
			await screen.findByRole("button", { name: "Post comment" }),
		);
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Enter a comment.",
		);
		expect(screen.getByLabelText("Add a comment")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
	});

	it("shows persistence failure and retries the latest comment snapshot", async () => {
		const api = renderThread(1);
		fireEvent.change(
			await screen.findByRole("textbox", { name: "Add a comment" }),
			{ target: { value: "Persist this comment" } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Post comment" }));
		expect(await screen.findByText("Persist this comment")).toBeInTheDocument();
		expect(
			await screen.findByText("Mock API rejected the save for testing."),
		).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", { name: "Retry saving comments" }),
		);
		await waitFor(() => {
			expect(screen.getByText("All changes saved.")).toBeInTheDocument();
		});
		expect(api.getState().comments).toHaveProperty(
			Object.keys(api.getState().comments)[0],
		);
	});

	it("retries the latest comment snapshot after overlapping saves reconcile revisions", async () => {
		let persistedState = createState();
		let revision = 0;
		const pendingSaves: {
			state: AppState;
			expectedRevision: number | undefined;
			resolve: (result: MockBoardApiSaveResult) => void;
		}[] = [];
		const api: MockBoardApi = {
			loadInitialState: async () => ({
				status: "loaded",
				state: persistedState,
				revision,
			}),
			saveState(state, expectedRevision) {
				return new Promise<MockBoardApiSaveResult>((resolve) => {
					pendingSaves.push({
						state: structuredClone(state),
						expectedRevision,
						resolve,
					});
				});
			},
			getState: () => structuredClone(persistedState),
			getRevision: () => revision,
			reset: (nextState = createState()) => {
				persistedState = structuredClone(nextState);
				revision = 0;
			},
		};

		render(
			<AppProvider mockApi={api}>
				<CommentThread
					cardId="card"
					cardTitle="A task"
					onClose={() => undefined}
				/>
			</AppProvider>,
		);

		const commentInput = await screen.findByRole("textbox", {
			name: "Add a comment",
		});
		fireEvent.change(commentInput, { target: { value: "First comment" } });
		fireEvent.click(screen.getByRole("button", { name: "Post comment" }));
		await waitFor(() => expect(pendingSaves).toHaveLength(1));

		fireEvent.change(commentInput, { target: { value: "Latest comment" } });
		fireEvent.click(screen.getByRole("button", { name: "Post comment" }));
		await waitFor(() => expect(pendingSaves).toHaveLength(2));
		expect(pendingSaves[0]?.expectedRevision).toBe(0);
		expect(pendingSaves[1]?.expectedRevision).toBe(0);

		const firstSave = pendingSaves[0];
		const secondSave = pendingSaves[1];
		if (!firstSave || !secondSave)
			throw new Error("Expected two pending saves.");
		persistedState = structuredClone(firstSave.state);
		revision = 1;
		firstSave.resolve({ ok: true, state: persistedState, revision });
		secondSave.resolve({
			ok: false,
			error: "Save rejected because a newer snapshot was already confirmed.",
			revision,
		});
		expect(
			await screen.findByText(
				"Save rejected because a newer snapshot was already confirmed.",
			),
		).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", { name: "Retry saving comments" }),
		);
		await waitFor(() => expect(pendingSaves).toHaveLength(3));
		const retry = pendingSaves[2];
		if (!retry) throw new Error("Expected a pending retry.");
		expect(retry.expectedRevision).toBe(1);
		expect(Object.keys(retry.state.comments)).toHaveLength(2);
		persistedState = structuredClone(retry.state);
		revision = 2;
		retry.resolve({ ok: true, state: persistedState, revision });

		await waitFor(() => {
			expect(screen.getByText("All changes saved.")).toBeInTheDocument();
		});
		expect(Object.keys(api.getState().comments)).toHaveLength(2);
	});
});
