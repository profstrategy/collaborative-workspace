import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import KanbanColumn from "../../features/board/components/KanbanColumn";
import type { BoardCard, BoardColumn } from "../../state/domain.types";

const column: BoardColumn = {
	id: "done",
	boardId: "board",
	title: "Done",
	cardIds: ["task-2", "task-1"],
};

const cards: BoardCard[] = [
	{
		id: "task-1",
		boardId: "board",
		columnId: "done",
		title: "First task",
		description: "",
		tagIds: [],
		dueDate: null,
		position: 0,
		createdAt: "2026-10-21T10:00:00.000Z",
		updatedAt: "2026-10-21T10:00:00.000Z",
	},
	{
		id: "task-2",
		boardId: "board",
		columnId: "done",
		title: "Second task",
		description: "",
		tagIds: [],
		dueDate: null,
		position: 1,
		createdAt: "2026-10-21T10:00:00.000Z",
		updatedAt: "2026-10-21T10:00:00.000Z",
	},
];

describe("KanbanColumn card movement", () => {
	it("renders cards in column array order rather than sorting their positions", () => {
		render(
			<KanbanColumn
				column={column}
				columns={[column]}
				cards={cards}
				tags={[]}
				onAddCard={vi.fn()}
			/>,
		);
		const renderedTitles = Array.from(
			screen.getByRole("list").querySelectorAll("h3"),
			(heading) => heading.textContent,
		);

		expect(renderedTitles).toEqual(["Second task", "First task"]);
	});

	it("accepts native drops and appends cards using the shared move callback", () => {
		const onMoveCard = vi.fn();
		const emptyColumn = { ...column, cardIds: [] };
		render(
			<KanbanColumn
				column={emptyColumn}
				columns={[emptyColumn]}
				cards={[]}
				tags={[]}
				onAddCard={vi.fn()}
				onMoveCard={onMoveCard}
			/>,
		);
		const destination = screen.getByRole("region", { name: /Done/ });
		const dataTransfer = {
			getData: vi.fn(() => "task-1"),
		};

		fireEvent.dragOver(destination, { dataTransfer });
		fireEvent.drop(destination, { dataTransfer });

		expect(onMoveCard).toHaveBeenCalledWith("task-1", "done", 0);
	});
});
