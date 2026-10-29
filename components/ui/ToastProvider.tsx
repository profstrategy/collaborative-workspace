"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

type ToastKind = "success" | "error" | "info" | "warning";

export interface ToastInput {
	title: string;
	description?: string;
	kind?: ToastKind;
	duration?: number;
}

interface ToastItem extends ToastInput {
	id: string;
	kind: ToastKind;
}

interface ToastContextValue {
	showToast: (toast: ToastInput) => void;
	dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const DEFAULT_DURATION = 4200;
const MAX_VISIBLE_TOASTS = 4;

const kindStyles: Record<ToastKind, { icon: string; label: string }> = {
	success: { icon: "✓", label: "Success" },
	error: { icon: "!", label: "Error" },
	info: { icon: "i", label: "Information" },
	warning: { icon: "!", label: "Warning" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);
	const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

	const dismissToast = useCallback((id: string) => {
		const timer = timersRef.current.get(id);
		if (timer) clearTimeout(timer);
		timersRef.current.delete(id);
		setToasts((current) => current.filter((toast) => toast.id !== id));
	}, []);

	const showToast = useCallback((input: ToastInput) => {
		const id =
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const toast: ToastItem = {
			...input,
			id,
			kind: input.kind ?? "success",
			duration: input.duration ?? DEFAULT_DURATION,
		};

		setToasts((current) => [...current, toast].slice(-MAX_VISIBLE_TOASTS));
		const timer = setTimeout(() => {
			timersRef.current.delete(id);
			setToasts((current) => current.filter((item) => item.id !== id));
		}, toast.duration);
		timersRef.current.set(id, timer);
	}, []);

	useEffect(
		() => () => {
			for (const timer of timersRef.current.values()) clearTimeout(timer);
			timersRef.current.clear();
		},
		[],
	);

	return (
		<ToastContext.Provider value={{ showToast, dismissToast }}>
			{children}
			<div
				className="talenvo-toast-viewport"
				aria-live="polite"
				aria-relevant="additions"
			>
				{toasts.map((toast) => {
					const style = kindStyles[toast.kind];
					return (
						<section
							key={toast.id}
							className={`talenvo-toast talenvo-toast--${toast.kind}`}
							role={toast.kind === "error" ? "alert" : "status"}
							aria-label={`${style.label}: ${toast.title}`}
						>
							<span className="talenvo-toast__icon" aria-hidden="true">
								{style.icon}
							</span>
							<div className="talenvo-toast__content">
								<p className="talenvo-toast__title">{toast.title}</p>
								{toast.description && (
									<p className="talenvo-toast__description">
										{toast.description}
									</p>
								)}
							</div>
							<button
								type="button"
								className="talenvo-toast__close"
								onClick={() => dismissToast(toast.id)}
								aria-label={`Dismiss notification: ${toast.title}`}
							>
								<span aria-hidden="true">×</span>
							</button>
						</section>
					);
				})}
			</div>
		</ToastContext.Provider>
	);
}

const noOpToastContext: ToastContextValue = {
	showToast: () => undefined,
	dismissToast: () => undefined,
};

export function useToast() {
	return useContext(ToastContext) ?? noOpToastContext;
}
