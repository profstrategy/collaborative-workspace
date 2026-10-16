"use client";

import {
	type KeyboardEvent as ReactKeyboardEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

export function useBoardCardUI() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRootRef = useRef<HTMLDivElement>(null);
	const menuPanelRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	const closeMenu = useCallback((restoreFocus = false) => {
		setIsMenuOpen(false);
		if (restoreFocus) {
			triggerRef.current?.focus();
		}
	}, []);

	const toggleMenu = useCallback(() => {
		setIsMenuOpen((isOpen) => !isOpen);
	}, []);

	const handleMenuKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			const menuItems = Array.from(
				menuPanelRef.current?.querySelectorAll<HTMLButtonElement>(
					'[role="menuitem"]:not(:disabled)',
				) ?? [],
			);

			if (event.key === "Escape") {
				event.preventDefault();
				closeMenu(true);
				return;
			}

			if (!menuItems.length) return;

			const activeElement = document.activeElement;
			const currentIndex =
				activeElement instanceof HTMLButtonElement
					? menuItems.indexOf(activeElement)
					: -1;
			let nextIndex: number | undefined;

			if (event.key === "ArrowDown") {
				nextIndex = (currentIndex + 1) % menuItems.length;
			} else if (event.key === "ArrowUp") {
				nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
			} else if (event.key === "Home") {
				nextIndex = 0;
			} else if (event.key === "End") {
				nextIndex = menuItems.length - 1;
			}

			if (nextIndex !== undefined) {
				event.preventDefault();
				menuItems[nextIndex]?.focus();
			}
		},
		[closeMenu],
	);

	useEffect(() => {
		if (!isMenuOpen) return;

		menuPanelRef.current
			?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
			?.focus();

		const handlePointerDown = (event: PointerEvent) => {
			if (
				event.target instanceof Node &&
				!menuRootRef.current?.contains(event.target)
			) {
				closeMenu();
			}
		};
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				closeMenu(true);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [closeMenu, isMenuOpen]);

	return {
		closeMenu,
		handleMenuKeyDown,
		isMenuOpen,
		menuPanelRef,
		menuRootRef,
		toggleMenu,
		triggerRef,
	};
}
