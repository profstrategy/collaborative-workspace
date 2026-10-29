import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Button from "../../components/ui/Button";

describe("Button", () => {
	it("renders its content and forwards click events", () => {
		const onClick = vi.fn();
		render(
			<Button variant="lightblue" onClick={onClick}>
				Save changes
			</Button>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

		expect(onClick).toHaveBeenCalledOnce();
	});

	it("disables itself and exposes its loading state", () => {
		render(
			<Button variant="white" loading>
				Saving
			</Button>,
		);

		expect(screen.getByRole("button", { name: "Saving" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Saving" })).toHaveAttribute(
			"aria-busy",
			"true",
		);
	});
});
