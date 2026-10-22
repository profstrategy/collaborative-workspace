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
