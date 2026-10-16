"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Tag } from "@/state/domain.types";

export function useTaskCardUI() {
	const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
	const [selectedStatuses, setSelectedStatuses] = useState<Tag["status"][]>([]);
	const selectorRootRef = useRef<HTMLDivElement>(null);
	const selectorPanelRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	const closeTagSelector = useCallback((restoreFocus = false) => {
		setIsTagSelectorOpen(false);
		if (restoreFocus) {
			triggerRef.current?.focus();
		}
	}, []);

	const toggleTagSelector = useCallback((statuses: Tag["status"][]) => {
		setSelectedStatuses([...new Set(statuses)]);
		setIsTagSelectorOpen((isOpen) => !isOpen);
	}, []);

	const toggleStatus = useCallback((status: Tag["status"]) => {
		setSelectedStatuses((statuses) =>
			statuses.includes(status)
				? statuses.filter((selectedStatus) => selectedStatus !== status)
				: [...statuses, status],
		);
	}, []);

	useEffect(() => {
		if (!isTagSelectorOpen) return;

		selectorPanelRef.current
			?.querySelector<HTMLInputElement>('input[type="checkbox"]')
			?.focus();

		const handlePointerDown = (event: PointerEvent) => {
			if (
				event.target instanceof Node &&
				!selectorRootRef.current?.contains(event.target)
			) {
				closeTagSelector();
			}
		};
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				closeTagSelector(true);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [closeTagSelector, isTagSelectorOpen]);

	return {
		closeTagSelector,
		isTagSelectorOpen,
		selectedStatuses,
		selectorPanelRef,
		selectorRootRef,
		toggleStatus,
		toggleTagSelector,
		triggerRef,
	};
}
