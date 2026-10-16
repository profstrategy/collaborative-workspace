"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

export interface ModalProps {
	open: boolean;
	title: string;
	children: ReactNode;
	onClose: () => void;
}

export default function Modal({ open, title, children, onClose }: ModalProps) {
	const titleId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;

		const previouslyFocused =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
			'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
		);
		(firstFocusable ?? dialogRef.current)?.focus();

		return () => previouslyFocused?.focus();
	}, [open]);

	if (!open) return null;

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape") {
			event.preventDefault();
			onClose();
			return;
		}

		if (event.key !== "Tab") return;

		const focusableElements = Array.from(
			dialogRef.current?.querySelectorAll<HTMLElement>(
				'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
			) ?? [],
		);
		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (!firstElement || !lastElement) {
			event.preventDefault();
			dialogRef.current?.focus();
		} else if (event.shiftKey && document.activeElement === firstElement) {
			event.preventDefault();
			lastElement.focus();
		} else if (!event.shiftKey && document.activeElement === lastElement) {
			event.preventDefault();
			firstElement.focus();
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
			<button
				type="button"
				aria-label={`Close ${title} dialog`}
				onClick={onClose}
				className="absolute inset-0 cursor-default bg-black/40"
			/>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
				onKeyDown={handleKeyDown}
				className="relative z-10 my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E2E5E9] bg-white p-5 shadow-xl sm:p-6"
			>
				<div className="mb-5 flex items-start justify-between gap-4">
					<h2 id={titleId} className="text-lg font-semibold text-[#1E232A]">
						{title}
					</h2>
					<button
						type="button"
						aria-label="Close dialog"
						onClick={onClose}
						className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-[#4B5563] hover:bg-gray-100 hover:text-[#1E232A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
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
							<path d="m6 6 12 12M18 6 6 18" />
						</svg>
					</button>
				</div>
				{children}
			</div>
		</div>
	);
}
