"use client";

import Link from "next/link";
import { useState } from "react";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MarkdownPreview from "@/components/ui/MarkdownPreview";
import PersistenceStatus from "@/components/ui/PersistenceStatus";
import { useAppProvider } from "@/state/AppProvider";
import type { BoardCard, BoardColumn } from "@/state/domain.types";
import { useBoard } from "../hooks/useBoard";
import type { CardFormValues } from "../validation";
import CardModal from "./CardModal";
import ColumnModal from "./ColumnModal";
import CommentThread from "./CommentThread";
import KanbanColumn from "./KanbanColumn";

type PendingDeletion =
	| { kind: "card"; card: BoardCard }
	| { kind: "column"; column: BoardColumn }
	| undefined;

interface CardModalTarget {
	column: BoardColumn;
	card?: BoardCard;
}

export interface BoardPageClientProps {
	boardId: string;
}

export default function BoardPageClient({ boardId }: BoardPageClientProps) {
	const { state, persistence, retrySave } = useAppProvider();
	const {
		handleCreateCard,
		handleCreateColumn,
		handleDeleteCard,
		handleDeleteColumn,
		handleMoveCard,
		handleUpdateCard,
		handleUpdateColumn,
		handleUpdateTags,
	} = useBoard(boardId);
	const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
	const [editingColumn, setEditingColumn] = useState<BoardColumn>();
	const [cardModalTarget, setCardModalTarget] = useState<CardModalTarget>();
	const [commentsCardId, setCommentsCardId] = useState<string>();
	const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion>();

	const board = state.boards[boardId];

	if (!board) {
		return (
			<main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl">
					<p className="text-base font-semibold text-[#1E232A]">
						Board not found
					</p>
					<Link
						href="/workspace"
						className="mt-2 inline-flex min-h-10 items-center text-sm font-medium text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
					>
						Return to workspace
					</Link>
				</div>
			</main>
		);
	}

	const columns = board.columnIds
		.map((columnId) => state.columns[columnId])
		.filter((column): column is BoardColumn => Boolean(column));
	const cards = Object.values(state.cards).filter(
		(card) => card.boardId === board.id,
	);
	const tags = Object.values(state.tags);
	const commentCounts = new Map<string, number>();
	for (const comment of Object.values(state.comments)) {
		commentCounts.set(
			comment.cardId,
			(commentCounts.get(comment.cardId) ?? 0) + 1,
		);
	}

	const closeColumnModal = () => {
		setIsColumnModalOpen(false);
		setEditingColumn(undefined);
	};

	const handleColumnSubmit = (title: string) => {
		if (editingColumn) {
			handleUpdateColumn(editingColumn.id, { title });
		} else {
			handleCreateColumn(title);
		}
		closeColumnModal();
	};

	const handleCardSubmit = (values: CardFormValues) => {
		if (!cardModalTarget) return;

		const dueDate = values.dueDate || null;
		if (cardModalTarget.card) {
			handleUpdateCard(cardModalTarget.card.id, {
				title: values.title,
				description: values.description,
				dueDate,
			});
		} else {
			handleCreateCard(
				cardModalTarget.column.id,
				values.title,
				values.description,
				dueDate,
			);
		}
		setCardModalTarget(undefined);
	};

	const cardColumn = cardModalTarget
		? state.columns[cardModalTarget.card?.columnId ?? cardModalTarget.column.id]
		: undefined;
	const commentsCard = commentsCardId ? state.cards[commentsCardId] : undefined;

	return (
		<main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				<header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E5E9] pb-5">
					<div className="min-w-0">
						<Link
							href="/workspace"
							className="text-sm font-medium text-[#4B5563] hover:text-[#1E232A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
						>
							Workspace
						</Link>
						<h1 className="mt-2 text-2xl font-semibold text-[#1E232A]">
							{board.title}
						</h1>
						{board.description && (
							<div className="mt-1 max-w-3xl text-sm">
								<MarkdownPreview compact>{board.description}</MarkdownPreview>
							</div>
						)}
					</div>
					<div className="flex items-center gap-3">
						<PersistenceStatus persistence={persistence} onRetry={retrySave} />
						<Button
							variant="white"
							onClick={() => {
								setEditingColumn(undefined);
								setIsColumnModalOpen(true);
							}}
						>
							<svg
								aria-hidden="true"
								focusable="false"
								className="h-4 w-4"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								viewBox="0 0 24 24"
							>
								<path d="M12 5v14M5 12h14" />
							</svg>
							Add column
						</Button>
					</div>
				</header>

				{columns.length > 0 ? (
					<section
						aria-label={`${board.title} columns`}
						className="overflow-x-auto pb-4"
					>
						<div className="flex min-w-max items-start gap-6">
							{columns.map((column) => (
								<KanbanColumn
									key={column.id}
									column={column}
									columns={columns}
									cards={cards}
									tags={tags}
									onMoveCard={handleMoveCard}
									commentCounts={commentCounts}
									onShowComments={(card) => setCommentsCardId(card.id)}
									onEditColumn={setEditingColumn}
									onDeleteColumn={(selectedColumn) =>
										setPendingDeletion({
											kind: "column",
											column: selectedColumn,
										})
									}
									onAddCard={(selectedColumn) =>
										setCardModalTarget({ column: selectedColumn })
									}
									onEditCard={(card) => {
										const cardParentColumn = state.columns[card.columnId];
										if (cardParentColumn) {
											setCardModalTarget({ column: cardParentColumn, card });
										}
									}}
									onDeleteCard={(card) =>
										setPendingDeletion({ kind: "card", card })
									}
									onTagsChange={(card, statuses) =>
										handleUpdateTags(card.id, statuses)
									}
								/>
							))}
						</div>
					</section>
				) : (
					<section className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E5E9] px-6 py-10 text-center">
						<h2 className="text-base font-semibold text-[#1E232A]">
							No columns yet
						</h2>
						<p className="mt-1 text-sm text-[#4B5563]">
							Add a column to start organizing cards.
						</p>
						<Button
							variant="lightblue"
							className="mt-4"
							onClick={() => {
								setEditingColumn(undefined);
								setIsColumnModalOpen(true);
							}}
						>
							Add first column
						</Button>
					</section>
				)}
			</div>

			<ColumnModal
				open={isColumnModalOpen || Boolean(editingColumn)}
				column={editingColumn}
				onClose={closeColumnModal}
				onSubmit={handleColumnSubmit}
			/>
			{cardModalTarget && cardColumn && (
				<CardModal
					open
					column={cardColumn}
					card={cardModalTarget.card}
					onClose={() => setCardModalTarget(undefined)}
					onSubmit={handleCardSubmit}
				/>
			)}
			{commentsCard && (
				<CommentThread
					cardId={commentsCard.id}
					cardTitle={commentsCard.title}
					onClose={() => setCommentsCardId(undefined)}
				/>
			)}
			<ConfirmDialog
				open={Boolean(pendingDeletion)}
				title={
					pendingDeletion?.kind === "column" ? "Delete column?" : "Delete card?"
				}
				description={
					pendingDeletion?.kind === "column"
						? `Delete ${pendingDeletion.column.title} and all its cards, tags, and comments? This action cannot be undone.`
						: `Delete ${pendingDeletion?.kind === "card" ? pendingDeletion.card.title : "this card"} and its comments and replies? This action cannot be undone.`
				}
				onCancel={() => setPendingDeletion(undefined)}
				onConfirm={() => {
					if (pendingDeletion?.kind === "column") {
						handleDeleteColumn(pendingDeletion.column.id);
					} else if (pendingDeletion?.kind === "card") {
						handleDeleteCard(pendingDeletion.card.id);
					}
					setPendingDeletion(undefined);
				}}
			/>
		</main>
	);
}
