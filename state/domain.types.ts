export type EntityId = string;

export interface Board {
	id: EntityId;
	title: string;
	description: string;
	createdAt: string;
	updatedAt: string;
	columnIds: EntityId[];
}

export interface BoardColumn {
	id: EntityId;
	boardId: EntityId;
	title: string;
	cardIds: EntityId[];
	position?: number;
}

export interface BoardCard {
	id: EntityId;
	boardId: EntityId;
	columnId: EntityId;
	title: string;
	description: string;
	tagIds: EntityId[];
	dueDate: string | null;
	position: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface Tag {
	id: EntityId;
	cardId: EntityId;
	columnId: EntityId;
	status: "Pending" | "Ongoing" | "Completed" | "Bugs";
	color: string;
}

export interface CardComment {
	id: EntityId;
	cardId: EntityId;
	parentCommentId: EntityId | null;
	body: string;
	authorName: string;
	createdAt: string;
	updatedAt: string;
}

export interface AppState {
	boards: Record<EntityId, Board>;
	columns: Record<EntityId, BoardColumn>;
	cards: Record<EntityId, BoardCard>;
	tags: Record<EntityId, Tag>;
	comments: Record<EntityId, CardComment>;
}
