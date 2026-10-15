
"use client";
import { useCallback } from "react";
import { useAppProvider } from "@/state/AppProvider";
import type { BoardCard, BoardColumn, EntityId } from "@/state/domain.types";

export function useBoard(boardId: EntityId) {
    const { dispatch } = useAppProvider();

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
                cardIds: []
            };

            dispatch({
                type: "column/created",
                payload: column,
            });

        },
        [boardId, dispatch]
    );


    const handleUpdateColumn = useCallback(
        (columnId: EntityId, changes: Partial<Pick<BoardColumn, "title" | "position">>) => {
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
        [dispatch]
    );

    const handleDeleteColumn = useCallback(
        (id: EntityId) => {
            if (!id) return;

            dispatch({
                type: "column/deleted",
                payload: { id },
            });
        },
        [dispatch]
    );


    const handleCreateCard = useCallback(
        (
            columnId: EntityId,
            title: string,
            description: string
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
                dueDate: null,
                position: null,
                createdAt: now,
                updatedAt: now,
            };

            dispatch({
                type: "card/created",
                payload: card,
            });
        },
        [boardId, dispatch]
    );

    const handleUpdateCard = useCallback(
        (
            cardId: EntityId,
            changes: Partial<
                Pick<BoardCard, "title" | "description" | "position">
            >
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
        [dispatch]
    );

    const handleDeleteCard = useCallback(
        (id: EntityId) => {
            if (!id) return;

            dispatch({
                type: "card/deleted",
                payload: { id },
            });
        },
        [dispatch]
    );

    return {
        handleCreateColumn,
        handleUpdateColumn,
        handleDeleteColumn,
        handleCreateCard,
        handleUpdateCard,
        handleDeleteCard
    };
}
