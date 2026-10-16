import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "lightblue" | "lightBlue" | "white";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant: ButtonVariant;
	children: ReactNode;
	loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
	lightblue:
		"border border-transparent bg-[#B9DCFF] text-[#1E232A] hover:bg-[#96CBFF]",
	lightBlue:
		"border border-transparent bg-[#B9DCFF] text-[#1E232A] hover:bg-[#96CBFF]",
	white: "border border-[#E2E5E9] bg-white text-[#1E232A] hover:bg-gray-50",
};

export default function Button({
	variant,
	children,
	className,
	type = "button",
	disabled = false,
	loading = false,
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			disabled={disabled || loading}
			aria-busy={loading || undefined}
			className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${variantClasses[variant]} ${className ?? ""}`}
			{...props}
		>
			{loading && (
				<svg
					aria-hidden="true"
					className="h-4 w-4 animate-spin motion-reduce:animate-none"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						className="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						strokeWidth="4"
					/>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
			)}
			{children}
		</button>
	);
}
