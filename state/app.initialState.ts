import type {
	AppState,
	Board,
	BoardCard,
	BoardColumn,
	Tag,
} from "./domain.types";

// Initial state for a single board
export const initialBoard: Board = {
	id: "",
	title: "",
	description: "",
	createdAt: "",
	updatedAt: "",
	columnIds: [],
};

// Initial state for a single column
export const initialColumn: BoardColumn = {
	id: "",
	boardId: "",
	title: "",
	cardIds: [],
};

// Initial state for a single card
export const initialCard: BoardCard = {
	id: "",
	boardId: "",
	columnId: "",
	title: "",
	description: "",
	tagIds: [],
	dueDate: null,
	position: null,
	createdAt: "",
	updatedAt: "",
};

// Initial state for a tag/status record
export const initialTag: Tag = {
	id: "",
	cardId: "",
	columnId: "",
	status: "Pending",
	color: "",
};

// Initial application state
export const initialAppState: AppState = {
	boards: {},
	columns: {},
	cards: {},
	tags: {},
	comments: {},

	// ui: {
	//   createBoardModalOpen: false,
	//   createColumnModalOpen: false
	// }
};
