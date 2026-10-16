"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAppProvider } from "@/state/AppProvider";
import type { Board } from "@/state/domain.types";
import { useWorkSpace } from "../hooks/useWorkspace";
import type { BoardFormValues } from "../validation";
import BoardCard from "./BoardCard";
import CreateBoardModal from "./CreateBoardModal";

export default function WorkspaceDashboard() {
	const { state } = useAppProvider();
	const { handleCreateBoard, handleDeleteBoard, handleUpdateBoard } =
		useWorkSpace();
	const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
	const [editingBoard, setEditingBoard] = useState<Board>();
	const [boardPendingDelete, setBoardPendingDelete] = useState<Board>();

	const boards = Object.values(state.boards).sort((firstBoard, secondBoard) =>
		secondBoard.createdAt.localeCompare(firstBoard.createdAt),
	);

	const openCreateBoard = () => {
		setEditingBoard(undefined);
		setIsBoardModalOpen(true);
	};

	const closeBoardModal = () => {
		setIsBoardModalOpen(false);
		setEditingBoard(undefined);
	};

	const handleBoardSubmit = (values: BoardFormValues) => {
		if (editingBoard) {
			handleUpdateBoard(editingBoard.id, values);
		} else {
			handleCreateBoard(values.title, values.description);
		}
		closeBoardModal();
	};

	return (
		<main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				<header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E5E9] pb-5">
					<div>
						<h1 className="text-2xl font-semibold text-[#1E232A]">Workspace</h1>
						<p className="mt-1 text-sm text-[#4B5563]">Your project boards</p>
					</div>
					<Button variant="lightblue" onClick={openCreateBoard}>
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
						Create board
					</Button>
				</header>

				{boards.length > 0 ? (
					<ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
						{boards.map((board) => (
							<li key={board.id}>
								<BoardCard
									board={board}
									onEdit={(selectedBoard) => {
										setEditingBoard(selectedBoard);
										setIsBoardModalOpen(true);
									}}
									onDelete={setBoardPendingDelete}
								/>
							</li>
						))}
					</ul>
				) : (
					<section className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E5E9] px-6 py-10 text-center">
						<h2 className="text-base font-semibold text-[#1E232A]">
							No boards yet
						</h2>
						<p className="mt-1 max-w-sm text-sm text-[#4B5563]">
							Create a board to organize your team&apos;s work.
						</p>
						<Button variant="white" className="mt-4" onClick={openCreateBoard}>
							Create your first board
						</Button>
					</section>
				)}
			</div>

			<CreateBoardModal
				open={isBoardModalOpen}
				board={editingBoard}
				onClose={closeBoardModal}
				onSubmit={handleBoardSubmit}
			/>
			<ConfirmDialog
				open={Boolean(boardPendingDelete)}
				title="Delete board?"
				description={`Delete ${boardPendingDelete?.title ?? "this board"} and its columns, cards, and tags? This action cannot be undone.`}
				onCancel={() => setBoardPendingDelete(undefined)}
				onConfirm={() => {
					if (boardPendingDelete) handleDeleteBoard(boardPendingDelete.id);
					setBoardPendingDelete(undefined);
				}}
			/>
		</main>
	);
}
