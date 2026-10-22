"use client";
import { useCallback } from "react";
import { useAppProvider } from "@/state/AppProvider";
import type {
	BoardCard,
	BoardColumn,
	EntityId,
	Tag,
} from "@/state/domain.types";
import { tagColorByStatus } from "../tagPresentation";
import { tagSelectionSchema } from "../validation";

export function useBoard(boardId: EntityId) {
	const { dispatch, state } = useAppProvider();

	const handleCreateColumn = useCallback(
		(title: string) => {
			const trimmedTitle = title.trim();

			if (!trimmedTitle || !boardId) {
				return;
			}

			const column: BoardColumn = {
				id: crypto.randomUUID(),
				boardId,
				title: trimmedTitle,
				cardIds: [],
			};

			dispatch({
				type: "column/created",
				payload: column,
			});
		},
		[boardId, dispatch],
	);

	const handleUpdateColumn = useCallback(
		(
			columnId: EntityId,
			changes: Partial<Pick<BoardColumn, "title" | "position">>,
		) => {
			// Validate the column ID.
			if (!columnId) {
				return;
			}

			// Prevent empty column titles.
			if (changes.title !== undefined && !changes.title.trim()) {
				return;
			}

			dispatch({
				type: "column/updated",
				payload: {
					id: columnId,
					changes,
				},
			});
		},
		[dispatch],
	);

	const handleDeleteColumn = useCallback(
		(id: EntityId) => {
			if (!id) return;

			dispatch({
				type: "column/deleted",
				payload: { id },
			});
		},
		[dispatch],
	);

	const handleCreateCard = useCallback(
		(
			columnId: EntityId,
			title: string,
			description: string,
			dueDate: string | null = null,
		) => {
			const trimmedTitle = title.trim();

			if (!boardId || !columnId || !trimmedTitle) {
				return;
			}

			const now = new Date().toISOString();

			const card: BoardCard = {
				id: crypto.randomUUID(),
				boardId,
				columnId,
				title: trimmedTitle,
				description: description.trim(),
				tagIds: [],
				dueDate,
				position: null,
				createdAt: now,
				updatedAt: now,
			};

			dispatch({
				type: "card/created",
				payload: card,
			});
		},
		[boardId, dispatch],
	);

	const handleUpdateCard = useCallback(
		(
			cardId: EntityId,
			changes: Partial<
				Pick<BoardCard, "title" | "description" | "dueDate" | "position">
			>,
		) => {
			if (!cardId) return;

			if (changes.title !== undefined && !changes.title.trim()) {
				return;
			}

			dispatch({
				type: "card/updated",
				payload: {
					id: cardId,
					changes,
				},
			});
		},
		[dispatch],
	);

	const handleDeleteCard = useCallback(
		(id: EntityId) => {
			if (!id) return;

			dispatch({
				type: "card/deleted",
				payload: { id },
			});
		},
		[dispatch],
	);

	const handleUpdateTags = useCallback(
		(cardId: EntityId, statuses: readonly Tag["status"][]) => {
			const parsedStatuses = tagSelectionSchema.safeParse(statuses);
			const card = state.cards[cardId];

			if (!parsedStatuses.success || !card || card.boardId !== boardId) {
				return;
			}

			const existingTags = Object.values(state.tags).filter(
				(tag) => tag.cardId === card.id && tag.columnId === card.columnId,
			);
			const tags: Tag[] = parsedStatuses.data.map((status) => {
				const existingTag = existingTags.find((tag) => tag.status === status);

				return (
					existingTag ?? {
						id: crypto.randomUUID(),
						cardId: card.id,
						columnId: card.columnId,
						status,
						color: tagColorByStatus[status],
					}
				);
			});

			dispatch({
				type: "card/tags-updated",
				payload: { cardId, tags },
			});
		},
		[boardId, dispatch, state.cards, state.tags],
	);

	
const handleMoveCard = useCallback(
	(
		cardId: EntityId,
		destinationColumnId: EntityId,
		destinationIndex: number,
	) => {
		const card = state.cards[cardId];
		const sourceColumn = card
			? state.columns[card.columnId]
			: undefined;
		const destinationColumn = state.columns[destinationColumnId];

		// Validate the card and both columns.
		if (
			!card ||
			!sourceColumn ||
			!destinationColumn ||
			card.boardId !== boardId ||
			sourceColumn.boardId !== boardId ||
			destinationColumn.boardId !== boardId
		) {
			return;
		}

		if (
			!Number.isInteger(destinationIndex) ||
			destinationIndex < 0
		) {
			return;
		}

		dispatch({
			type: "card/moved",
			payload: {
				cardId,
				sourceColumnId: sourceColumn.id,
				destinationColumnId,
				destinationIndex,
				movedAt: new Date().toISOString(),
			},
		});
	},
	[boardId, dispatch, state.cards, state.columns],
);

	return {
		handleCreateColumn,
		handleUpdateColumn,
		handleDeleteColumn,
		handleCreateCard,
		handleUpdateCard,
		handleDeleteCard,
		handleUpdateTags,
		handleMoveCard,
	};
}
