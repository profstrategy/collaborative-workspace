import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Input from "../../components/ui/Input";

describe("Input", () => {
	it("associates the label and description with the input", () => {
		render(
			<Input
				id="email"
				label="Email address"
				description="Used for account updates."
				type="email"
				required
			/>,
		);
		const input = screen.getByRole("textbox", { name: "Email address" });

		expect(input).toHaveAttribute("type", "email");
		expect(input).toBeRequired();
		expect(input).toHaveAttribute("aria-describedby", "email-description");
		expect(screen.getByText("Used for account updates.")).toBeVisible();
	});

	it("reports validation errors and forwards changes", () => {
		const onChange = vi.fn();
		render(
			<Input
				id="name"
				label="Name"
				error="Name is required."
				onChange={onChange}
			/>,
		);
		const input = screen.getByRole("textbox", { name: "Name" });

		fireEvent.change(input, { target: { value: "Ada" } });

		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input).toHaveAttribute("aria-describedby", "name-error");
		expect(screen.getByRole("alert")).toHaveTextContent("Name is required.");
		expect(onChange).toHaveBeenCalledOnce();
	});
});
