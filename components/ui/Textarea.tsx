import type { TextareaHTMLAttributes } from "react";
import ErrorMessage from "./ErrorMessage";

export interface TextareaProps
	extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
	id: string;
	label: string;
	description?: string;
	error?: string;
}

export default function Textarea({
	id,
	label,
	description,
	error,
	required,
	className,
	...props
}: TextareaProps) {
	const descriptionId = description ? `${id}-description` : undefined;
	const errorId = error ? `${id}-error` : undefined;
	const describedBy = [props["aria-describedby"], descriptionId, errorId]
		.filter((value): value is string => Boolean(value))
		.join(" ");

	return (
		<div className="space-y-1">
			<label htmlFor={id} className="block text-sm font-medium text-[#1E232A]">
				{label}
				{required && (
					<span aria-hidden="true" className="ml-1 text-red-700">
						*
					</span>
				)}
			</label>
			{description && (
				<p id={descriptionId} className="text-sm text-[#4B5563]">
					{description}
				</p>
			)}
			<textarea
				{...props}
				id={id}
				required={required}
				aria-invalid={error ? true : undefined}
				aria-describedby={describedBy || undefined}
				className={`block min-h-24 w-full resize-y rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm text-[#1E232A] placeholder:text-[#6B7280] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70 ${className ?? ""}`}
			/>
			{error && <ErrorMessage id={errorId ?? `${id}-error`} message={error} />}
		</div>
	);
}
