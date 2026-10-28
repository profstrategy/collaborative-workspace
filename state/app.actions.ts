import type {
	AppState,
	Board,
	BoardCard,
	BoardColumn,
	CardComment,
	EntityId,
	Tag,
} from "./domain.types";
import type { CardSnapshot } from "./history.types";

export const AppAction = {
	STATE_RESTORED: "state/restored",

	BOARD_CREATED: "board/created",
	BOARD_UPDATED: "board/updated",
	BOARD_DELETED: "board/deleted",
	BOARD_CREATE_MODAL_OPENED: "board/create-modal-opened",
	BOARD_CREATE_MODAL_CLOSED: "board/create-modal-closed",

	COLUMN_CREATED: "column/created",
	COLUMN_DELETED: "column/deleted",
	COLUMN_UPDATED: "column/updated",
	COLUMN_CREATE_MODAL_OPENED: "column/create-modal-opened",
	COLUMN_CREATE_MODAL_CLOSED: "column/create-modal-closed",

	CARD_CREATED: "card/created",
	CARD_UPDATED: "card/updated",
	CARD_TAGS_UPDATED: "card/tags-updated",
	CARD_DELETED: "card/deleted",
	CARD_MOVED: "card/moved",

	COMMENT_CREATED: "comment/created",
	COMMENT_UPDATED: "comment/updated",
	COMMENT_DELETED: "comment/deleted",
	CARD_RESTORED: "card/restored"
} as const;

export type AppAction =
	| { type: "state/restored"; payload: AppState }
	| { type: "board/created"; payload: Board }
	| {
			type: "board/updated";
			payload: {
				id: EntityId;
				changes: Partial<Pick<Board, "title" | "description">>;
			};
	  }
	| { type: "board/deleted"; payload: { id: EntityId } }
	| { type: "board/create-modal-opened" }
	| { type: "board/create-modal-closed" }
	| { type: "column/created"; payload: BoardColumn }
	| { type: "column/deleted"; payload: { id: EntityId } }
	| { type: "column/create-modal-opened" }
	| { type: "column/create-modal-closed" }
	| {
			type: "column/updated";
			payload: {
				id: EntityId;
				changes: Partial<Pick<BoardColumn, "title" | "position">>;
			};
	  }
	| { type: "card/created"; payload: BoardCard }
	| {
			type: "card/updated";
			payload: {
				id: EntityId;
				changes: Partial<
					Pick<BoardCard, "title" | "description" | "dueDate" | "position">
				>;
			};
	  }
	| { type: "card/tags-updated"; payload: { cardId: EntityId; tags: Tag[] } }
	| { type: "card/deleted"; payload: { id: EntityId } }
	| {
			type: "card/moved";
			payload: {
				cardId: EntityId;
				sourceColumnId: EntityId;
				destinationColumnId: EntityId;
				destinationIndex: number;
				movedAt: string;
			};
	  }
	| { type: "comment/created"; payload: CardComment }
	| {
			type: "comment/updated";
			payload: { id: EntityId; body: string; updatedAt: string };
	  }
	| { type: "comment/deleted"; payload: { id: EntityId } }
	| { type: "card/restored"; payload: CardSnapshot };
