"use client";

import { type RefObject, useId } from "react";
import Button from "@/components/ui/Button";
import type { Tag } from "@/state/domain.types";
import { tagStatusClasses, tagStatuses } from "../tagPresentation";

export interface TagDropdownProps {
	label: string;
	selectedStatuses: readonly Tag["status"][];
	isOpen: boolean;
	disabled?: boolean;
	rootRef: RefObject<HTMLDivElement | null>;
	panelRef: RefObject<HTMLDivElement | null>;
	triggerRef: RefObject<HTMLButtonElement | null>;
	onToggle: () => void;
	onStatusToggle: (status: Tag["status"]) => void;
	onApply: () => void;
	onCancel: () => void;
}

export default function TagDropdown({
	label,
	selectedStatuses,
	isOpen,
	disabled = false,
	rootRef,
	panelRef,
	triggerRef,
	onToggle,
	onStatusToggle,
	onApply,
	onCancel,
}: TagDropdownProps) {
	const selectorId = useId();

	return (
		<div ref={rootRef} className="relative z-20">
			<button
				ref={triggerRef}
				type="button"
				aria-label={label}
				aria-expanded={isOpen}
				aria-controls={isOpen ? selectorId : undefined}
				onClick={onToggle}
				disabled={disabled}
				className="inline-flex min-h-10 items-center rounded-md px-2 text-xs font-medium text-[#4B5563] hover:bg-slate-100 hover:text-[#1E232A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{selectedStatuses.length > 0 ? "Edit tags" : "Add tags"}
			</button>

			{isOpen && (
				<div
					id={selectorId}
					ref={panelRef}
					className="absolute bottom-full left-0 z-40 mb-2 w-60 rounded-lg border border-[#E2E5E9] bg-white p-3 shadow-lg"
				>
					<fieldset disabled={disabled}>
						<legend className="mb-2 text-xs font-semibold text-[#1E232A]">
							{label}
						</legend>
						<div className="space-y-1">
							{tagStatuses.map((status) => {
								const checkboxId = `${selectorId}-${status.toLowerCase()}`;
								const isSelected = selectedStatuses.includes(status);

								return (
									<label
										key={status}
										htmlFor={checkboxId}
										className="flex min-h-10 cursor-pointer items-center gap-2 rounded px-2 text-sm text-[#1E232A] hover:bg-gray-50"
									>
										<input
											id={checkboxId}
											type="checkbox"
											checked={isSelected}
											onChange={() => onStatusToggle(status)}
											className="h-4 w-4 accent-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
										/>
										<span
											className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${tagStatusClasses[status]}`}
										>
											{status}
										</span>
									</label>
								);
							})}
						</div>
					</fieldset>
					<div className="mt-3 flex justify-end gap-2">
						<Button
							variant="white"
							className="min-h-10 px-2 text-xs"
							onClick={onCancel}
							disabled={disabled}
						>
							Cancel
						</Button>
						<Button
							variant="lightblue"
							className="min-h-10 px-2 text-xs"
							onClick={onApply}
							disabled={disabled}
						>
							Apply
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
