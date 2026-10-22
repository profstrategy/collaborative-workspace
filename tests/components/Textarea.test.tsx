import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Textarea from "../../components/ui/Textarea";

describe("Textarea", () => {
	it("renders a labeled controlled textarea and reports errors", () => {
		const onChange = vi.fn();
		render(
			<Textarea
				id="description"
				label="Description"
				value="Initial text"
				onChange={onChange}
				description="Describe the task."
				error="Description is too short."
			/>,
		);
		const textarea = screen.getByRole("textbox", { name: "Description" });

		expect(textarea).toHaveValue("Initial text");
		expect(textarea).toHaveAttribute(
			"aria-describedby",
			"description-description description-error",
		);
		expect(textarea).toHaveAttribute("aria-invalid", "true");
		fireEvent.change(textarea, { target: { value: "Updated text" } });
		expect(onChange).toHaveBeenCalledOnce();
	});

	it("previews markdown and switches back to writing", () => {
		render(
			<Textarea id="notes" label="Notes" value="## Notes" onChange={vi.fn()} />,
		);

		fireEvent.click(screen.getByRole("button", { name: "Preview" }));
		expect(screen.getByRole("region", { name: "Notes preview" })).toBeVisible();
		expect(screen.getByRole("heading", { name: "Notes" })).toBeVisible();
		expect(screen.queryByRole("textbox", { name: "Notes" })).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Write" }));
		expect(screen.getByRole("textbox", { name: "Notes" })).toBeVisible();
	});
});
