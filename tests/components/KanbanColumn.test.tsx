import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import KanbanColumn from "../../features/board/components/KanbanColumn";
import type { BoardColumn } from "../../state/domain.types";

const column: BoardColumn = {
	id: "done",
	boardId: "board",
	title: "Done",
	cardIds: [],
};

describe("KanbanColumn card movement", () => {
	it("accepts native drops and appends cards using the shared move callback", () => {
		const onMoveCard = vi.fn();
		render(
			<KanbanColumn
				column={column}
				columns={[column]}
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
