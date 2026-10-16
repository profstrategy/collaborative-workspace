"use client";

import { useId } from "react";
import Button from "@/components/ui/Button";
import type { BoardCard, BoardColumn, Tag } from "@/state/domain.types";
import { useKanbanColumnUI } from "../hooks/useKanbanColumnUI";
import TaskCard from "./TaskCard";

export interface KanbanColumnProps {
	column: BoardColumn;
	cards: readonly BoardCard[];
	tags: readonly Tag[];
	onEditColumn?: (column: BoardColumn) => void;
	onDeleteColumn?: (column: BoardColumn) => void;
	onAddCard: (column: BoardColumn) => void;
	onEditCard?: (card: BoardCard) => void;
	onDeleteCard?: (card: BoardCard) => void;
	onTagsChange?: (card: BoardCard, statuses: Tag["status"][]) => void;
}

export default function KanbanColumn({
	column,
	cards,
	tags,
	onEditColumn,
	onDeleteColumn,
	onAddCard,
	onEditCard,
	onDeleteCard,
	onTagsChange,
}: KanbanColumnProps) {
	const headingId = useId();
	const {
		closeMenu,
		handleMenuKeyDown,
		isMenuOpen,
		menuPanelRef,
		menuRootRef,
		toggleMenu,
		triggerRef,
	} = useKanbanColumnUI();

	const columnCards = cards
		.filter(
			(card) => card.columnId === column.id && card.boardId === column.boardId,
		)
		.sort(
			(firstCard, secondCard) =>
				(firstCard.position ?? Number.MAX_SAFE_INTEGER) -
				(secondCard.position ?? Number.MAX_SAFE_INTEGER),
		);
	const hasColumnActions = Boolean(onEditColumn || onDeleteColumn);

	return (
		<section
			aria-labelledby={headingId}
			className="flex min-h-120 w-80 shrink-0 flex-col rounded-2xl border border-[#E2E5E9] bg-[#F1F2F4] p-4 shadow-sm"
		>
			<div className="flex items-center justify-between gap-2 border-b border-[#E2E5E9]/70 pb-3">
				<div className="flex min-w-0 items-center gap-2">
					<h2
						id={headingId}
						className="truncate text-sm font-bold tracking-wide text-[#1E232A]"
					>
						{column.title}
					</h2>
					<output
						aria-label={`${columnCards.length} ${columnCards.length === 1 ? "card" : "cards"}`}
						className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-[#1E232A]"
					>
						{columnCards.length}
					</output>
				</div>

				{hasColumnActions && (
					<div ref={menuRootRef} className="relative z-30 shrink-0">
						<button
							ref={triggerRef}
							type="button"
							aria-label={`Column actions for ${column.title}`}
							aria-haspopup="menu"
							aria-expanded={isMenuOpen}
							onClick={toggleMenu}
							className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-slate-200 hover:text-[#1E232A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 motion-reduce:transition-none"
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
								<circle cx="12" cy="12" r="1.5" />
								<circle cx="19" cy="12" r="1.5" />
								<circle cx="5" cy="12" r="1.5" />
							</svg>
						</button>

						{isMenuOpen && (
							<div
								ref={menuPanelRef}
								role="menu"
								aria-label={`Actions for ${column.title}`}
								onKeyDown={handleMenuKeyDown}
								className="absolute right-0 top-full z-40 mt-1.5 w-44 rounded-lg border border-[#E2E5E9] bg-white py-1 shadow-lg"
							>
								{onEditColumn && (
									<button
										type="button"
										role="menuitem"
										onClick={() => {
											closeMenu(true);
											onEditColumn(column);
										}}
										className="flex min-h-10 w-full items-center px-3 py-2 text-left text-sm font-medium text-[#1E232A] hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
									>
										Edit column
									</button>
								)}
								{onDeleteColumn && (
									<button
										type="button"
										role="menuitem"
										onClick={() => {
											closeMenu(true);
											onDeleteColumn(column);
										}}
										className="flex min-h-10 w-full items-center px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
									>
										Delete column
									</button>
								)}
							</div>
						)}
					</div>
				)}
			</div>

			{columnCards.length > 0 ? (
				<ul className="mt-3.5 flex flex-1 flex-col gap-3">
					{columnCards.map((card) => (
						<li key={card.id}>
							<TaskCard
								card={card}
								tags={tags}
								onEdit={onEditCard}
								onDelete={onDeleteCard}
								onTagsChange={
									onTagsChange
										? (statuses) => onTagsChange(card, statuses)
										: undefined
								}
							/>
						</li>
					))}
				</ul>
			) : (
				<div
					aria-live="polite"
					className="mt-12 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E5E9] px-4 py-10 text-center"
				>
					<div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-200/80 text-[#6B7280]">
						<svg
							aria-hidden="true"
							focusable="false"
							className="h-4 w-4"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							viewBox="0 0 24 24"
						>
							<rect x="3" y="3" width="18" height="18" rx="2" />
							<path d="M9 9h6M9 13h4" />
						</svg>
					</div>
					<p className="text-xs font-semibold text-[#1E232A]">No cards yet</p>
					<p className="mt-0.5 text-[11px] text-[#4B5563]">
						Create the first card using the button below.
					</p>
				</div>
			)}

			<div className="mt-4 pt-2">
				<Button
					variant="lightBlue"
					className="w-full rounded-xl px-3 py-2.5 text-xs"
					aria-label={`Add card to ${column.title}`}
					onClick={() => onAddCard(column)}
				>
					<svg
						aria-hidden="true"
						focusable="false"
						className="h-3.5 w-3.5 stroke-[2.5]"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M12 5v14M5 12h14" />
					</svg>
					<span>Add card</span>
				</Button>
			</div>
		</section>
	);
}
