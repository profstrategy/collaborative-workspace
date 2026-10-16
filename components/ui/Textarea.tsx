"use client";

import { type ChangeEvent, type TextareaHTMLAttributes, useState } from "react";
import ErrorMessage from "./ErrorMessage";
import MarkdownPreview from "./MarkdownPreview";

export interface TextareaProps
	extends Omit<
		TextareaHTMLAttributes<HTMLTextAreaElement>,
		"id" | "value" | "defaultValue" | "onChange"
	> {
	id: string;
	label: string;
	value: string;
	onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
	description?: string;
	error?: string;
	disabled?: boolean;
}

export default function Textarea({
	id,
	label,
	value,
	onChange,
	description,
	error,
	required,
	className,
	...props
}: TextareaProps) {
	const [isPreview, setIsPreview] = useState(false);
	const { disabled } = props;
	const descriptionId = description ? `${id}-description` : undefined;
	const errorId = error ? `${id}-error` : undefined;
	const describedBy = [props["aria-describedby"], descriptionId, errorId]
		.filter((item): item is string => Boolean(item))
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

			<fieldset
				disabled={disabled}
				className="inline-flex rounded-md border border-[#E2E5E9] bg-white p-0.5"
			>
				<legend className="sr-only">{label} mode</legend>
				<button
					type="button"
					aria-pressed={!isPreview}
					onClick={() => setIsPreview(false)}
					disabled={disabled}
					className={`min-h-9 rounded px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
						isPreview
							? "text-[#4B5563] hover:bg-gray-50"
							: "bg-[#F1F2F4] text-[#1E232A]"
					}`}
				>
					Write
				</button>
				<button
					type="button"
					aria-pressed={isPreview}
					onClick={() => setIsPreview(true)}
					disabled={disabled}
					className={`min-h-9 rounded px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
						isPreview
							? "bg-[#F1F2F4] text-[#1E232A]"
							: "text-[#4B5563] hover:bg-gray-50"
					}`}
				>
					Preview
				</button>
			</fieldset>

			{isPreview ? (
				<section
					id={`${id}-preview`}
					aria-label={`${label} preview`}
					className="min-h-24 rounded-md border border-[#E2E5E9] bg-white px-3 py-2"
				>
					{value.trim() ? (
						<MarkdownPreview>{value}</MarkdownPreview>
					) : (
						<p className="text-sm text-[#6B7280]">Nothing to preview.</p>
					)}
				</section>
			) : (
				<textarea
					{...props}
					id={id}
					value={value}
					onChange={onChange}
					required={required}
					aria-invalid={error ? true : undefined}
					aria-describedby={describedBy || undefined}
					className={`block min-h-24 w-full resize-y rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm text-[#1E232A] placeholder:text-[#6B7280] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70 ${className ?? ""}`}
				/>
			)}
			{error && <ErrorMessage id={errorId ?? `${id}-error`} message={error} />}
		</div>
	);
}
