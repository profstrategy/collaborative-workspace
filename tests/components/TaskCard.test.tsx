import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaskCard from "../../features/board/components/TaskCard";
import type { BoardCard, BoardColumn } from "../../state/domain.types";

const todoColumn: BoardColumn = {
	id: "todo",
	boardId: "board",
	title: "To do",
	cardIds: ["task-1", "task-2"],
};

const doneColumn: BoardColumn = {
	id: "done",
	boardId: "board",
	title: "Done",
	cardIds: [],
};

const firstCard: BoardCard = {
	id: "task-1",
	boardId: "board",
	columnId: "todo",
	title: "First task",
	description: "",
	tagIds: [],
	dueDate: null,
	position: 0,
	createdAt: "2026-10-21T10:00:00.000Z",
	updatedAt: "2026-10-21T10:00:00.000Z",
};

const secondCard: BoardCard = {
	...firstCard,
	id: "task-2",
	title: "Second task",
	position: 1,
};

describe("TaskCard movement", () => {
	it("moves to the selected column through the shared move callback", () => {
		const onMoveCard = vi.fn();
		render(
			<TaskCard
				card={firstCard}
				tags={[]}
				columns={[todoColumn, doneColumn]}
				onMoveCard={onMoveCard}
			/>,
		);

		fireEvent.change(
			screen.getByRole("combobox", {
				name: "Move task: First task to column",
			}),
			{ target: { value: "done" } },
		);

		expect(onMoveCard).toHaveBeenCalledWith("task-1", "done", 0);
	});

	it("opens the selected card's comments with a meaningful count", () => {
		const onShowComments = vi.fn();
		render(
			<TaskCard
				card={firstCard}
				tags={[]}
				commentCount={3}
				onShowComments={onShowComments}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Comments for First task: 3",
			}),
		);
		expect(onShowComments).toHaveBeenCalledWith(firstCard);
	});

	it("restores focus to the moved card's column control", () => {
		const onMoveCard = vi.fn();
		const animationFrames: FrameRequestCallback[] = [];
		const requestAnimationFrame = vi
			.spyOn(window, "requestAnimationFrame")
			.mockImplementation((callback) => {
				animationFrames.push(callback);
				return animationFrames.length;
			});
		const { rerender } = render(
			<TaskCard
				card={firstCard}
				tags={[]}
				columns={[todoColumn, doneColumn]}
				onMoveCard={onMoveCard}
			/>,
		);

		fireEvent.change(
			screen.getByRole("combobox", {
				name: "Move task: First task to column",
			}),
			{ target: { value: "done" } },
		);
		rerender(
			<TaskCard
				card={{ ...firstCard, columnId: "done" }}
				tags={[]}
				columns={[todoColumn, { ...doneColumn, cardIds: ["task-1"] }]}
				onMoveCard={onMoveCard}
			/>,
		);
		animationFrames.forEach((callback) => {
			callback(0);
		});

		expect(
			screen.getByRole("combobox", {
				name: "Move task: First task to column",
			}),
		).toHaveFocus();
		requestAnimationFrame.mockRestore();
	});

	it("reorders cards with accessible controls and retains focus", () => {
		const onMoveCard = vi.fn();
		render(
			<TaskCard
				card={secondCard}
				tags={[]}
				columns={[todoColumn, doneColumn]}
				destinationIndex={1}
				columnCardCount={2}
				onMoveCard={onMoveCard}
			/>,
		);
		const earlier = screen.getByRole("button", {
			name: "Move Second task earlier",
		});
		const later = screen.getByRole("button", {
			name: "Move Second task later",
		});

		expect(earlier).toBeEnabled();
		expect(later).toBeDisabled();
		earlier.focus();
		fireEvent.click(earlier);

		expect(onMoveCard).toHaveBeenCalledWith("task-2", "todo", 0);
		expect(earlier).toHaveFocus();
		expect(screen.getByRole("status")).toHaveTextContent(
			"Moved Second task to position 1 of 2.",
		);
	});

	it("disables earlier and enables later at the first card boundary", () => {
		const onMoveCard = vi.fn();
		render(
			<TaskCard
				card={firstCard}
				tags={[]}
				destinationIndex={0}
				columnCardCount={2}
				onMoveCard={onMoveCard}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Move First task earlier" }),
		).toBeDisabled();
		const later = screen.getByRole("button", {
			name: "Move First task later",
		});
		expect(later).toBeEnabled();
		later.focus();
		fireEvent.click(later);

		expect(onMoveCard).toHaveBeenCalledWith("task-1", "todo", 1);
		expect(later).toHaveFocus();
	});

	it("supports native drag-and-drop reordering through the same callback", () => {
		const onMoveCard = vi.fn();
		const { container } = render(
			<div>
				<TaskCard
					card={firstCard}
					tags={[]}
					columns={[todoColumn, doneColumn]}
					destinationIndex={0}
					onMoveCard={onMoveCard}
				/>
				<TaskCard
					card={secondCard}
					tags={[]}
					columns={[todoColumn, doneColumn]}
					destinationIndex={1}
					onMoveCard={onMoveCard}
				/>
			</div>,
		);
		const [source, destination] = container.querySelectorAll("article");
		const dataTransfer = {
			effectAllowed: "",
			getData: vi.fn(() => "task-1"),
			setData: vi.fn(),
		};

		fireEvent.dragStart(source, { dataTransfer });
		fireEvent.dragOver(destination, { dataTransfer });
		fireEvent.drop(destination, { dataTransfer });

		expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "task-1");
		expect(onMoveCard).toHaveBeenCalledWith("task-1", "todo", 1);
	});
});
