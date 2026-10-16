import { z } from "zod";

export const boardFormSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, "Enter a board title.")
		.max(120, "Board titles must be 120 characters or fewer."),
	description: z
		.string()
		.max(2000, "Descriptions must be 2,000 characters or fewer."),
});

export type BoardFormValues = z.infer<typeof boardFormSchema>;
