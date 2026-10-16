"use client";

import Link from "next/link";
import type { Board } from "@/state/domain.types";
import { useBoardCardUI } from "../hooks/useBoardCardUI";

export interface BoardCardProps {
	board: Board;
	onEdit?: (board: Board) => void;
	onDelete?: (board: Board) => void;
}

function formatCreatedAt(value: string) {
	const date = new Date(value);

	if (!value || Number.isNaN(date.getTime())) {
		return "Creation date unavailable";
	}

	return `Created ${new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date)}`;
}

export default function BoardCard({ board, onEdit, onDelete }: BoardCardProps) {
	const {
		closeMenu,
		handleMenuKeyDown,
		isMenuOpen,
		menuPanelRef,
		menuRootRef,
		toggleMenu,
		triggerRef,
	} = useBoardCardUI();
	const hasActions = Boolean(onEdit || onDelete);

	return (
		<article className="group relative flex min-h-52.5 flex-col justify-between rounded-xl border border-[#E2E5E9] bg-[#F1F2F4] p-5 transition-all duration-150 hover:border-slate-300 hover:shadow-sm focus-within:ring-2 focus-within:ring-[#1E232A]/20 motion-reduce:transition-none">
			<Link
				href={`/board/${encodeURIComponent(board.id)}`}
				aria-label={`Open ${board.title} board`}
				className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
			/>

			<div>
				<div className="flex items-start justify-between gap-3">
					<h2 className="pointer-events-none relative z-0 flex-1 text-base font-bold leading-snug text-[#1E232A] transition-colors group-hover:text-black">
						{board.title}
					</h2>

					{hasActions && (
						<div ref={menuRootRef} className="relative z-30 shrink-0">
							<button
								ref={triggerRef}
								type="button"
								aria-label={`Board actions for ${board.title}`}
								aria-haspopup="menu"
								aria-expanded={isMenuOpen}
								onClick={toggleMenu}
								className="relative z-30 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-slate-200/70 hover:text-[#1E232A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 motion-reduce:transition-none"
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
									aria-label={`Actions for ${board.title}`}
									onKeyDown={handleMenuKeyDown}
									className="absolute right-0 top-full z-40 mt-1.5 w-40 rounded-lg border border-[#E2E5E9] bg-white py-1 shadow-lg"
								>
									{onEdit && (
										<button
											type="button"
											role="menuitem"
											onClick={() => {
												closeMenu(true);
												onEdit(board);
											}}
											className="flex min-h-10 w-full items-center px-3 py-2 text-left text-sm font-medium text-[#1E232A] hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
										>
											Edit board
										</button>
									)}
									{onDelete && (
										<button
											type="button"
											role="menuitem"
											onClick={() => {
												closeMenu(true);
												onDelete(board);
											}}
											className="flex min-h-10 w-full items-center px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
										>
											Delete board
										</button>
									)}
								</div>
							)}
						</div>
					)}
				</div>

				{board.description && (
					<p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#4B5563]">
						{board.description}
					</p>
				)}
			</div>

			<div className="flex items-center gap-1.5 border-t border-[#E2E5E9]/60 pt-3 text-xs font-medium text-[#6B7280]">
				<svg
					aria-hidden="true"
					focusable="false"
					className="h-3.5 w-3.5 shrink-0"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					viewBox="0 0 24 24"
				>
					<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
					<path d="M16 2v4M8 2v4M3 10h18" />
				</svg>
				<span>{formatCreatedAt(board.createdAt)}</span>
			</div>
		</article>
	);
}
