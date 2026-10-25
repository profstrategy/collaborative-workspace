"use client";

import type { DragEvent as ReactDragEvent } from "react";
import { useState } from "react";
import MarkdownPreview from "@/components/ui/MarkdownPreview";
import type {
	BoardColumn,
	EntityId,
	Tag,
	BoardCard as Task,
} from "@/state/domain.types";
import { useTaskCardUI } from "../hooks/useTaskCardUI";
import { tagStatusClasses } from "../tagPresentation";
import TagDropdown from "./TagDropdown";

export interface TaskCardProps {
	card: Task;
	tags: readonly Tag[];
	onEdit?: (card: Task) => void;
	onDelete?: (card: Task) => void;
	onTagsChange?: (statuses: Tag["status"][]) => void;
	columns?: readonly BoardColumn[];
	destinationIndex?: number;
	columnCardCount?: number;
	onMoveCard?: (
		cardId: EntityId,
		destinationColumnId: EntityId,
		destinationIndex: number,
	) => void;
}

function formatDueDate(value: string | null) {
	if (!value) return "No deadline";

	const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
		? new Date(`${value}T00:00:00`)
		: new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "Date unavailable";
	}

	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
	}).format(date);
}

export default function TaskCard({
	card,
	tags,
	onEdit,
	onDelete,
	onTagsChange,
	columns = [],
	destinationIndex = 0,
	columnCardCount = 1,
	onMoveCard,
}: TaskCardProps) {
	const [moveAnnouncement, setMoveAnnouncement] = useState("");
	const {
		closeTagSelector,
		isTagSelectorOpen,
		selectedStatuses,
		selectorPanelRef,
		selectorRootRef,
		toggleStatus,
		toggleTagSelector,
		triggerRef,
	} = useTaskCardUI();

	const assignedTags = tags.filter(
		(tag) =>
			tag.cardId === card.id &&
			tag.columnId === card.columnId &&
			card.tagIds.includes(tag.id),
	);
	const destinationColumns = columns.filter(
		(column) => column.boardId === card.boardId && column.id !== card.columnId,
	);

	const handleDragStart = (event: ReactDragEvent<HTMLElement>) => {
		event.dataTransfer.setData("text/plain", card.id);
		event.dataTransfer.effectAllowed = "move";
	};

	const handleDrop = (event: ReactDragEvent<HTMLElement>) => {
		if (!onMoveCard) return;

		event.preventDefault();
		event.stopPropagation();
		const draggedCardId = event.dataTransfer.getData("text/plain");
		if (draggedCardId) {
			onMoveCard(draggedCardId, card.columnId, destinationIndex);
		}
	};

	const moveWithinColumn = (destinationIndex: number) => {
		if (!onMoveCard) return;

		onMoveCard(card.id, card.columnId, destinationIndex);
		setMoveAnnouncement(
			`Moved ${card.title} to position ${destinationIndex + 1} of ${columnCardCount}.`,
		);
	};

	const restoreMoveControlFocus = (cardId: EntityId) => {
		window.requestAnimationFrame(() => {
			const moveControl = Array.from(
				document.querySelectorAll<HTMLSelectElement>(
					"[data-card-move-control]",
				),
			).find((control) => control.dataset.cardMoveControl === cardId);
			moveControl?.focus();
		});
	};

	return (
		<article
			draggable={Boolean(onMoveCard)}
			onDragStart={onMoveCard ? handleDragStart : undefined}
			onDragOver={onMoveCard ? (event) => event.preventDefault() : undefined}
			onDrop={onMoveCard ? handleDrop : undefined}
			className="group flex min-h-40 flex-col justify-between rounded-xl border border-[#E2E5E9] bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm focus-within:border-slate-300 focus-within:shadow-sm motion-reduce:transition-none"
		>
			<div>
				<div className="flex items-start justify-between gap-2">
					<h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[#1E232A]">
						{card.title}
					</h3>
					<div className="flex shrink-0 items-center gap-1">
						{onEdit && (
							<button
								type="button"
								aria-label={`Edit task: ${card.title}`}
								onClick={() => onEdit(card)}
								className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-[#6B7280] hover:bg-slate-100 hover:text-[#1E232A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
							>
								<svg
									aria-hidden="true"
									focusable="false"
									className="h-3.5 w-3.5"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									viewBox="0 0 24 24"
								>
									<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
									<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
								</svg>
							</button>
						)}
						{onDelete && (
							<button
								type="button"
								aria-label={`Delete task: ${card.title}`}
								onClick={() => onDelete(card)}
								className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-[#6B7280] hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
							>
								<svg
									aria-hidden="true"
									focusable="false"
									className="h-3.5 w-3.5"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									viewBox="0 0 24 24"
								>
									<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
								</svg>
							</button>
						)}
					</div>
				</div>

				{card.description && (
					<div className="mt-1.5 line-clamp-2 text-xs leading-relaxed">
						<MarkdownPreview compact>{card.description}</MarkdownPreview>
					</div>
				)}
			</div>

			<div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E5E9]/60 pt-3">
				<div className="flex min-w-0 flex-wrap items-center gap-1.5">
					{assignedTags.map((tag) => (
						<span
							key={tag.id}
							className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${tagStatusClasses[tag.status]}`}
						>
							{tag.status}
						</span>
					))}
					{assignedTags.length === 0 && !onTagsChange && (
						<span className="text-[11px] text-[#6B7280]">No tags</span>
					)}
					{onTagsChange && (
						<TagDropdown
							label={`Tags for ${card.title}`}
							selectedStatuses={selectedStatuses}
							isOpen={isTagSelectorOpen}
							rootRef={selectorRootRef}
							panelRef={selectorPanelRef}
							triggerRef={triggerRef}
							onToggle={() =>
								toggleTagSelector(assignedTags.map((tag) => tag.status))
							}
							onStatusToggle={toggleStatus}
							onCancel={() => closeTagSelector(true)}
							onApply={() => {
								onTagsChange(selectedStatuses.slice());
								closeTagSelector(true);
							}}
						/>
					)}
					{onMoveCard && (
						<div className="flex items-center gap-1">
							<button
								type="button"
								aria-label={`Move ${card.title} earlier`}
								disabled={destinationIndex <= 0}
								onClick={() => moveWithinColumn(destinationIndex - 1)}
								className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-[#6B7280] hover:bg-slate-100 hover:text-[#1E232A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
							>
								<span aria-hidden="true">Up</span>
							</button>
							<button
								type="button"
								aria-label={`Move ${card.title} later`}
								disabled={destinationIndex >= columnCardCount - 1}
								onClick={() => moveWithinColumn(destinationIndex + 1)}
								className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-[#6B7280] hover:bg-slate-100 hover:text-[#1E232A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
							>
								<span aria-hidden="true">Down</span>
							</button>
						</div>
					)}
					{onMoveCard && destinationColumns.length > 0 && (
						<select
							aria-label={`Move task: ${card.title} to column`}
							defaultValue=""
							onChange={(event) => {
								const select = event.currentTarget;
								const destinationColumnId = select.value;
								select.value = "";
								const destinationColumn = destinationColumns.find(
									(column) => column.id === destinationColumnId,
								);
								if (destinationColumn) {
									onMoveCard(
										card.id,
										destinationColumnId,
										destinationColumn.cardIds.length,
									);
									restoreMoveControlFocus(card.id);
								}
							}}
							data-card-move-control={card.id}
							className="max-w-28 rounded border border-[#E2E5E9] bg-white px-1.5 py-1 text-[11px] text-[#4B5563] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
						>
							<option value="">Move to column</option>
							{destinationColumns.map((column) => (
								<option key={column.id} value={column.id}>
									{column.title}
								</option>
							))}
						</select>
					)}
				</div>
				<output aria-live="polite" className="sr-only">
					{moveAnnouncement}
				</output>

				<div className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#6B7280]">
					<svg
						aria-hidden="true"
						focusable="false"
						className="h-3 w-3"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						viewBox="0 0 24 24"
					>
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
						<path d="M16 2v4M8 2v4M3 10h18" />
					</svg>
					<span>{formatDueDate(card.dueDate)}</span>
				</div>
			</div>
		</article>
	);
}
