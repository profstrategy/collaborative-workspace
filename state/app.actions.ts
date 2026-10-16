import type { Board, BoardCard, BoardColumn, Tag } from "./domain.types";

export const AppAction = {
	BOARD_CREATED: "board/created",
	BOARD_UPDATED: "board/updated",
	BOARD_DELETED: "board/deleted",
	COLUMN_CREATED: "column/created",
	COLUMN_DELETED: "column/delete",
	COLUMN_UPDATED: "column/updated",
	CARD_CREATED: "card/created",
	CARD_UPDATED: "card/updated",
	CARD_TAGS_UPDATED: "card/tags-updated",
	CARD_DELETED: "card/deleted",
} as const;

export type AppAction =
	| { type: "board/created"; payload: Board }
	| {
			type: "board/updated";
			payload: {
				id: string;
				changes: Partial<Pick<Board, "title" | "description">>;
			};
	  }
	| { type: "board/deleted"; payload: { id: string } }
	| { type: "board/create-modal-opened" }
	| { type: "board/create-modal-closed" }
	| { type: "column/created"; payload: BoardColumn }
	| { type: "column/deleted"; payload: { id: string } }
	| { type: "column/create-modal-opened" }
	| { type: "column/create-modal-closed" }
	| {
			type: "column/updated";
			payload: {
				id: string;
				changes: Partial<Pick<BoardColumn, "title" | "position">>;
			};
	  }
	| { type: "card/created"; payload: BoardCard }
	| {
			type: "card/updated";
			payload: {
				id: string;
				changes: Partial<
					Pick<BoardCard, "title" | "description" | "dueDate" | "position">
				>;
			};
	  }
	| { type: "card/tags-updated"; payload: { cardId: string; tags: Tag[] } }
	| { type: "card/deleted"; payload: { id: string } };
