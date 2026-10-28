"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import type {
	HistoryEvent,
	HistoryState,
} from "@/state/history.types";

interface UndoRedoControlsProps {
	history: HistoryState;
	lastHistoryEvent: HistoryEvent | null;
	onUndo: () => void;
	onRedo: () => void;
}

function getEventMessage(event: HistoryEvent | null): string {
	if (!event) return "";

	if (event.outcome === "empty") {
		return event.direction === "undo"
			? "There is nothing to undo."
			: "There is nothing to redo.";
	}

	if (event.outcome === "failed") {
		return event.direction === "undo"
			? "Undo could not be completed because the board has changed."
			: "Redo could not be completed because the board has changed.";
	}

	const operation = event.entryKind?.replace("card-", "") ?? "change";

	return event.direction === "undo"
		? `Undid card ${operation}.`
		: `Redid card ${operation}.`;
}

export default function UndoRedoControls({
	history,
	lastHistoryEvent,
	onUndo,
	onRedo,
}: UndoRedoControlsProps) {
	const [message, setMessage] = useState("");
	const lastSequence = useRef<number | null>(null);

	useEffect(() => {
		if (!lastHistoryEvent) return;

		if (lastSequence.current === lastHistoryEvent.seq) return;

		lastSequence.current = lastHistoryEvent.seq;
		setMessage(getEventMessage(lastHistoryEvent));
	}, [lastHistoryEvent]);

	return (
		<div className="flex flex-wrap items-center gap-2">
			<div className="flex items-center gap-1">
				<Button
					variant="white"
					disabled={history.undoStack.length === 0}
					onClick={onUndo}
					aria-label="Undo last card action"
					title="Undo last card action"
				>
					<svg
						aria-hidden="true"
						focusable="false"
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-2"
						/>
					</svg>
					<span>Undo</span>
				</Button>

				<Button
					variant="white"
					disabled={history.redoStack.length === 0}
					onClick={onRedo}
					aria-label="Redo last undone card action"
					title="Redo last undone card action"
				>
					<svg
						aria-hidden="true"
						focusable="false"
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="m15 14 5-5-5-5m5 5H10a6 6 0 0 0 0 12h2"
						/>
					</svg>
					<span>Redo</span>
				</Button>
			</div>

			<span
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{message}
			</span>
		</div>
	);
}