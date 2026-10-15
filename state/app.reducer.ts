import { AppAction } from "./app.actions";
import { AppState, BoardCard } from "./domain.types";

export function appReducer(
    state: AppState,
    action: AppAction
): AppState {
    switch (action.type) {
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

                // Close the modal after successful creation.
                // ui: {
                //     ...state.ui,
                //     createBoardModalOpen: false,
                // },
            };
        }

        // case "board/create-modal-opened":
        //     return {
        //         ...state,
        //         ui: {
        //             ...state.ui,
        //             createBoardModalOpen: true,
        //         },
        //     };

        // case "board/create-modal-closed":
        //     return {
        //         ...state,
        //         ui: {
        //             ...state.ui,
        //             createBoardModalOpen: false,
        //         },
        //     };


        case "board/deleted": {
            const boardId = action.payload.id;

            // Check whether the board exists.
            if (!boardId || !state.boards[boardId]) {
                return state;
            }

            // Remove only the selected board object.
            const { [boardId]: _deletedBoard, ...remainingBoards } =
                state.boards;

            return {
                ...state,
                boards: remainingBoards
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
                        columnIds: [...board.columnIds, newColumn.id]
                    },
                },
            };
        }

        // case "column/create-modal-opened": {
        //     return {
        //         ...state,
        //         ui: {
        //             ...state.ui,
        //             createColumnModalOpen: true
        //         }
        //     }
        // }

        // case "column/create-modal-closed": {
        //     return {
        //         ...state,
        //         ui: {
        //             ...state.ui,
        //             createColumnModalOpen: false
        //         }
        //     }
        // }


        case "column/deleted": {
            const columnId = action.payload.id;
            const column = state.columns[columnId];

            if (!column) {
                return state;
            }

            // Remove the column's cards.
            const cards = { ...state.cards };
            for (const cardId of column.cardIds) {
                delete cards[cardId];
            }

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
            };
        }

        case "column/updated": {
            const { id: columnId, changes } = action.payload;
            const column = state.columns[columnId];

            if (!column) {
                return state;
            }

            // For title edits, trim and reject empty titles.
            const nextTitle = changes.title !== undefined ? changes.title.trim() : column.title;

            if (!nextTitle) {
                return state;
            }

            const parentBoard = state.boards[column.boardId];
            const boards = parentBoard
                ? {
                    ...state.boards,
                    [parentBoard.id]: { ...parentBoard, updatedAt: new Date().toISOString() },
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
                changes.title !== undefined
                    ? changes.title.trim()
                    : card.title;

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
                changes.position !== undefined
                    ? changes.position
                    : card.position;

            if (
                nextPosition !== null &&
                (!Number.isInteger(nextPosition) || nextPosition < 0)
            ) {
                return state;
            }

            let nextCardIds = [...column.cardIds];

            // Reorder the card IDs only when position is explicitly changed.
            if (changes.position !== undefined && nextPosition !== null) {
                nextCardIds.splice(currentIndex, 1);

                const targetIndex = Math.min(
                    nextPosition,
                    nextCardIds.length
                );

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
                position:
                    changes.position === undefined
                        ? card.position
                        : nextPosition === null
                            ? null
                            : nextCardIds.indexOf(cardId),
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

        case "card/deleted": {
            const cardId = action.payload.id;

            // Check whether the card exists.
            if (!cardId || !state.cards[cardId]) {
                return state;
            }

            const card = state.cards[cardId];
            const column = state.columns[card.columnId];

            // Remove only the selected card object.
            const { [cardId]: _deletedCard, ...remainingCards } =
                state.cards;

            // If the parent column is missing, still remove the card.
            if (!column) {
                return {
                    ...state,
                    cards: remainingCards,
                };
            }

            // Remove the card ID from the column and normalize positions.
            const remainingCardIds = column.cardIds.filter(
                (id) => id !== cardId
            );

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
                columns: {
                    ...state.columns,
                    [column.id]: {
                        ...column,
                        cardIds: remainingCardIds,
                    },
                },
            };
        }

        default:
            return state;
    }
}
