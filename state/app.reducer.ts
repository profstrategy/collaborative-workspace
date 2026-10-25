import type { AppAction } from "./app.actions";
import type { AppState, BoardCard, EntityId, Tag } from "./domain.types";

function reindexCards(
	cards: Record<EntityId, BoardCard>,
	cardIds: readonly EntityId[],
	columnId: EntityId,
): Record<EntityId, BoardCard> {
	const nextCards = { ...cards };

	cardIds.forEach((cardId, index) => {
		const card = nextCards[cardId];

		if (card) {
			nextCards[cardId] = {
				...card,
				columnId,
				position: index,
			};
		}
	});

	return nextCards;
}

function hasConsistentColumnCards(
	state: AppState,
	columnId: EntityId,
	cardIds: readonly EntityId[],
): boolean {
	const column = state.columns[columnId];
	if (!column || new Set(cardIds).size !== cardIds.length) return false;

	return cardIds.every((id, index) => {
		const card = state.cards[id];
		return (
			card !== undefined &&
			card.boardId === column.boardId &&
			card.columnId === column.id &&
			card.position === index
		);
	});
}

function moveCard(
	state: AppState,
	payload: {
		cardId: EntityId;
		sourceColumnId: EntityId;
		destinationColumnId: EntityId;
		destinationIndex: number;
		movedAt: string;
	},
): AppState {
	const {
		cardId,
		sourceColumnId,
		destinationColumnId,
		destinationIndex,
		movedAt,
	} = payload;

	const card = state.cards[cardId];
	const source = state.columns[sourceColumnId];
	const destination = state.columns[destinationColumnId];

	// Reject invalid IDs, stale source columns, and invalid positions.
	if (
		!card ||
		!source ||
		!destination ||
		card.columnId !== sourceColumnId ||
		source.boardId !== destination.boardId ||
		card.boardId !== source.boardId ||
		!Number.isInteger(destinationIndex) ||
		destinationIndex < 0 ||
		!hasConsistentColumnCards(state, sourceColumnId, source.cardIds) ||
		!hasConsistentColumnCards(
			state,
			destinationColumnId,
			destination.cardIds,
		) ||
		!source.cardIds.includes(cardId)
	) {
		return state;
	}

	const sourceCardIds = source.cardIds.filter((id) => id !== cardId);

	const destinationBaseIds =
		sourceColumnId === destinationColumnId
			? sourceCardIds
			: [...destination.cardIds];

	if (
		destinationIndex > destinationBaseIds.length ||
		(sourceColumnId === destinationColumnId &&
			destinationIndex >= source.cardIds.length)
	) {
		return state;
	}

	if (
		sourceColumnId === destinationColumnId &&
		source.cardIds[destinationIndex] === cardId
	) {
		return state;
	}

	const destinationCardIds = [
		...destinationBaseIds.slice(0, destinationIndex),
		cardId,
		...destinationBaseIds.slice(destinationIndex),
	];

	const columns = {
		...state.columns,
		[sourceColumnId]: {
			...source,
			cardIds:
				sourceColumnId === destinationColumnId
					? destinationCardIds
					: sourceCardIds,
		},
	};

	if (sourceColumnId !== destinationColumnId) {
		columns[destinationColumnId] = {
			...destination,
			cardIds: destinationCardIds,
		};
	}

	let cards = state.cards;

	if (sourceColumnId === destinationColumnId) {
		cards = reindexCards(state.cards, destinationCardIds, destinationColumnId);
	} else {
		cards = reindexCards(state.cards, sourceCardIds, sourceColumnId);
		cards = reindexCards(cards, destinationCardIds, destinationColumnId);
	}

	cards = {
		...cards,
		[cardId]: {
			...cards[cardId],
			updatedAt: movedAt,
		},
	};

	// Keep tag.columnId consistent with the card's current column.
	const tags: Record<EntityId, Tag> = { ...state.tags };

	for (const tagId of card.tagIds) {
		const tag = tags[tagId];

		if (tag && tag.cardId === cardId) {
			tags[tagId] = {
				...tag,
				columnId: destinationColumnId,
			};
		}
	}

	return {
		...state,
		columns,
		cards,
		tags,
	};
}

export function appReducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case "state/restored":
			return action.payload;

		case "board/created": {
			const board = action.payload;
			const title = board.title.trim();

			// Require a title.
			if (!title) {
				return state;
			}

			// Prevent duplicate IDs.
			if (state.boards[board.id]) {
				return state;
			}

			const newBoard = {
				...board,
				title,
				description: board.description.trim(),
			};

			return {
				...state,

				// Preserve existing boards and add the new board.
				boards: {
					...state.boards,
					[newBoard.id]: newBoard,
				},
			};
		}

		case "board/updated": {
			const { id: boardId, changes } = action.payload;
			const board = state.boards[boardId];

			if (!board) return state;

			const title =
				changes.title !== undefined ? changes.title.trim() : board.title;
			const description =
				changes.description !== undefined
					? changes.description.trim()
					: board.description;

			if (!title) return state;

			return {
				...state,
				boards: {
					...state.boards,
					[boardId]: {
						...board,
						title,
						description,
						updatedAt: new Date().toISOString(),
					},
				},
			};
		}

		case "board/deleted": {
			const boardId = action.payload.id;
			const board = state.boards[boardId];

			// Check whether the board exists.
			if (!boardId || !board) {
				return state;
			}

			const columnIds = new Set([
				...board.columnIds,
				...Object.values(state.columns)
					.filter((column) => column.boardId === boardId)
					.map((column) => column.id),
			]);
			const cardIds = new Set(
				Object.values(state.cards)
					.filter(
						(card) => card.boardId === boardId || columnIds.has(card.columnId),
					)
					.map((card) => card.id),
			);
			const tagIds = new Set(
				Object.values(state.tags)
					.filter((tag) => cardIds.has(tag.cardId))
					.map((tag) => tag.id),
			);
			for (const cardId of cardIds) {
				for (const tagId of state.cards[cardId]?.tagIds ?? []) {
					tagIds.add(tagId);
				}
			}

			const boards = { ...state.boards };
			const columns = { ...state.columns };
			const cards = { ...state.cards };
			const tags = { ...state.tags };

			delete boards[boardId];
			for (const columnId of columnIds) delete columns[columnId];
			for (const cardId of cardIds) delete cards[cardId];
			for (const tagId of tagIds) delete tags[tagId];

			return {
				...state,
				boards,
				columns,
				cards,
				tags,
			};
		}

		case "column/created": {
			const column = action.payload;
			const title = column.title.trim();

			// Validate the column title.
			if (!title) {
				return state;
			}

			// Prevent duplicate column IDs.
			if (state.columns[column.id]) {
				return state;
			}

			// Ensure the parent board exists.
			const board = state.boards[column.boardId];

			if (!board) {
				return state;
			}

			const newColumn = {
				...column,
				title,
				position: board.columnIds.length,
			};

			return {
				...state,

				// Add the new column to the normalized columns record.
				columns: {
					...state.columns,
					[newColumn.id]: newColumn,
				},

				// Register the column under its parent board.
				boards: {
					...state.boards,
					[board.id]: {
						...board,
						columnIds: [...board.columnIds, newColumn.id],
					},
				},
			};
		}

		case "column/deleted": {
			const columnId = action.payload.id;
			const column = state.columns[columnId];

			if (!column) {
				return state;
			}

			const cardIds = new Set([
				...column.cardIds,
				...Object.values(state.cards)
					.filter((card) => card.columnId === columnId)
					.map((card) => card.id),
			]);
			const tagIds = new Set(
				Object.values(state.tags)
					.filter((tag) => cardIds.has(tag.cardId))
					.map((tag) => tag.id),
			);
			for (const cardId of cardIds) {
				for (const tagId of state.cards[cardId]?.tagIds ?? []) {
					tagIds.add(tagId);
				}
			}

			const cards = { ...state.cards };
			const tags = { ...state.tags };
			for (const cardId of cardIds) delete cards[cardId];
			for (const tagId of tagIds) delete tags[tagId];

			// Remove the column itself.
			const { [columnId]: _deletedColumn, ...remainingColumns } = state.columns;

			// Remove the column ID from its parent board's columnIds.
			const parentBoard = state.boards[column.boardId];
			const boards = parentBoard
				? {
						...state.boards,
						[parentBoard.id]: {
							...parentBoard,
							columnIds: parentBoard.columnIds.filter((id) => id !== columnId),
							updatedAt: new Date().toISOString(),
						},
					}
				: state.boards;

			return {
				...state,
				boards,
				columns: remainingColumns,
				cards,
				tags,
			};
		}

		case "column/updated": {
			const { id: columnId, changes } = action.payload;
			const column = state.columns[columnId];

			if (!column) {
				return state;
			}

			// For title edits, trim and reject empty titles.
			const nextTitle =
				changes.title !== undefined ? changes.title.trim() : column.title;

			if (!nextTitle) {
				return state;
			}

			const parentBoard = state.boards[column.boardId];
			const boards = parentBoard
				? {
						...state.boards,
						[parentBoard.id]: {
							...parentBoard,
							updatedAt: new Date().toISOString(),
						},
					}
				: state.boards;

			return {
				...state,
				boards,
				columns: {
					...state.columns,
					[columnId]: {
						...column,
						...changes,
						title: nextTitle,
					},
				},
			};
		}

		case "card/created": {
			const card = action.payload;
			const title = card.title.trim();
			const column = state.columns[card.columnId];
			const board = state.boards[card.boardId];

			// Validate required fields.
			if (!title || !column || !board) {
				return state;
			}

			// Ensure the column belongs to the specified board.
			if (column.boardId !== card.boardId) {
				return state;
			}

			// Prevent duplicate card IDs.
			if (state.cards[card.id]) {
				return state;
			}

			const newCard: BoardCard = {
				...card,
				title,
				description: card.description.trim(),
				position: column.cardIds.length,
			};

			return {
				...state,

				// Add the card to the normalized cards record.
				cards: {
					...state.cards,
					[newCard.id]: newCard,
				},

				// Register the card under its parent column.
				columns: {
					...state.columns,
					[column.id]: {
						...column,
						cardIds: [...column.cardIds, newCard.id],
					},
				},

				// Update the parent board's timestamp.
				boards: {
					...state.boards,
					[board.id]: {
						...board,
						updatedAt: newCard.updatedAt,
					},
				},
			};
		}

		case "card/updated": {
			const { id: cardId, changes } = action.payload;
			const card = state.cards[cardId];

			if (!card) return state;

			const title =
				changes.title !== undefined ? changes.title.trim() : card.title;

			const description =
				changes.description !== undefined
					? changes.description.trim()
					: card.description;

			if (!title) return state;

			const column = state.columns[card.columnId];

			if (!column) return state;

			const currentIndex = column.cardIds.indexOf(cardId);

			if (currentIndex === -1) return state;

			const nextPosition =
				changes.position !== undefined ? changes.position : card.position;

			if (
				nextPosition !== null &&
				(!Number.isInteger(nextPosition) || nextPosition < 0)
			) {
				return state;
			}

			if (
				changes.dueDate !== undefined &&
				changes.dueDate !== null &&
				Number.isNaN(Date.parse(changes.dueDate))
			) {
				return state;
			}

			const nextCardIds = [...column.cardIds];

			// Reorder the card IDs only when position is explicitly changed.
			if (changes.position !== undefined && nextPosition !== null) {
				nextCardIds.splice(currentIndex, 1);

				const targetIndex = Math.min(nextPosition, nextCardIds.length);

				nextCardIds.splice(targetIndex, 0, cardId);
			}

			// Keep stored positions consistent with the rendered order.
			const nextCards = { ...state.cards };

			nextCardIds.forEach((id, index) => {
				const existingCard = nextCards[id];

				if (existingCard) {
					nextCards[id] = {
						...existingCard,
						position: index,
					};
				}
			});

			nextCards[cardId] = {
				...card,
				title,
				description,
				dueDate: changes.dueDate === undefined ? card.dueDate : changes.dueDate,
				position: nextCardIds.indexOf(cardId),
			};

			return {
				...state,
				cards: nextCards,
				columns: {
					...state.columns,
					[column.id]: {
						...column,
						cardIds: nextCardIds,
					},
				},
			};
		}

		case "card/tags-updated": {
			const { cardId, tags: nextTags } = action.payload;
			const card = state.cards[cardId];
			const column = card ? state.columns[card.columnId] : undefined;

			if (!card || !column || column.boardId !== card.boardId) return state;

			const nextTagIds = new Set(nextTags.map((tag) => tag.id));
			const nextStatuses = new Set(nextTags.map((tag) => tag.status));

			if (
				nextTagIds.size !== nextTags.length ||
				nextStatuses.size !== nextTags.length ||
				nextTags.some(
					(tag) =>
						!tag.id ||
						tag.cardId !== card.id ||
						tag.columnId !== column.id ||
						(state.tags[tag.id] && state.tags[tag.id]?.cardId !== card.id),
				)
			) {
				return state;
			}

			const previousTagIds = new Set([
				...card.tagIds,
				...Object.values(state.tags)
					.filter((tag) => tag.cardId === card.id)
					.map((tag) => tag.id),
			]);
			const tags = { ...state.tags };
			for (const tagId of previousTagIds) delete tags[tagId];
			for (const tag of nextTags) tags[tag.id] = tag;

			const updatedAt = new Date().toISOString();
			const board = state.boards[card.boardId];

			return {
				...state,
				cards: {
					...state.cards,
					[card.id]: {
						...card,
						tagIds: nextTags.map((tag) => tag.id),
						updatedAt,
					},
				},
				tags,
				boards: board
					? {
							...state.boards,
							[board.id]: { ...board, updatedAt },
						}
					: state.boards,
			};
		}

		case "card/deleted": {
			const cardId = action.payload.id;

			// Check whether the card exists.
			if (!cardId || !state.cards[cardId]) {
				return state;
			}

			const card = state.cards[cardId];
			const column = state.columns[card.columnId];

			// Remove only the selected card object.
			const { [cardId]: _deletedCard, ...remainingCards } = state.cards;
			const tags = { ...state.tags };
			for (const [tagId, tag] of Object.entries(tags)) {
				if (tag.cardId === cardId || card.tagIds.includes(tagId)) {
					delete tags[tagId];
				}
			}

			// If the parent column is missing, still remove the card.
			if (!column) {
				return {
					...state,
					cards: remainingCards,
					tags,
				};
			}

			// Remove the card ID from the column and normalize positions.
			const remainingCardIds = column.cardIds.filter((id) => id !== cardId);

			const updatedCards = { ...remainingCards };

			remainingCardIds.forEach((id, index) => {
				const existingCard = updatedCards[id];

				if (existingCard) {
					updatedCards[id] = {
						...existingCard,
						position: index,
					};
				}
			});

			return {
				...state,
				cards: updatedCards,
				tags,
				columns: {
					...state.columns,
					[column.id]: {
						...column,
						cardIds: remainingCardIds,
					},
				},
			};
		}

		case "card/moved":
			return moveCard(state, action.payload);
		default:
			return state;
	}
}
