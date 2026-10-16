import { z } from "zod";
import type { Tag } from "@/state/domain.types";
import { tagStatuses } from "./tagPresentation";

export const columnFormSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, "Enter a column title.")
		.max(80, "Column titles must be 80 characters or fewer."),
});

function isValidDateOnly(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));

	return (
		year > 0 &&
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

export const cardFormSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, "Enter a card title.")
		.max(160, "Card titles must be 160 characters or fewer."),
	description: z
		.string()
		.max(5000, "Descriptions must be 5,000 characters or fewer."),
	dueDate: z
		.string()
		.refine(
			(value) => value === "" || isValidDateOnly(value),
			"Enter a valid due date.",
		),
});

export const tagSelectionSchema = z
	.array(
		z.enum(tagStatuses satisfies readonly [Tag["status"], ...Tag["status"][]]),
	)
	.max(tagStatuses.length)
	.refine((statuses) => new Set(statuses).size === statuses.length, {
		message: "Each tag status can only be selected once.",
	});

export type ColumnFormValues = z.infer<typeof columnFormSchema>;
export type CardFormValues = z.infer<typeof cardFormSchema>;
export type TagSelectionValues = z.infer<typeof tagSelectionSchema>;
