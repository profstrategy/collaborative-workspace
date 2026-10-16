"use client";
import { useAppProvider } from "@/state/AppProvider";
import type { Board, EntityId } from "@/state/domain.types";

export const useWorkSpace = () => {
	const { dispatch } = useAppProvider();

	function handleCreateBoard(title: string, description: string) {
		const trimmedTitle = title.trim();

		if (!trimmedTitle) {
			return;
		}

		const now = new Date().toISOString();

		const board: Board = {
			id: crypto.randomUUID(),
			title: trimmedTitle,
			description: description.trim(),
			createdAt: now,
			updatedAt: now,
			columnIds: [],
		};

		dispatch({
			type: "board/created",
			payload: board,
		});
	}

	function handleDeleteBoard(id: EntityId) {
		dispatch({
			type: "board/deleted",
			payload: { id },
		});
	}

	function handleUpdateBoard(
		id: EntityId,
		changes: Partial<Pick<Board, "title" | "description">>,
	) {
		if (!id) return;

		dispatch({
			type: "board/updated",
			payload: { id, changes },
		});
	}

	return {
		handleCreateBoard,
		handleDeleteBoard,
		handleUpdateBoard,
	};
};
