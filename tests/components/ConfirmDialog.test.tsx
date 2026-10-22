import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

describe("ConfirmDialog", () => {
	it("shows the confirmation details and invokes confirm or cancel", () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(
			<ConfirmDialog
				open
				title="Delete board?"
				description="This action cannot be undone."
				confirmLabel="Delete board"
				onConfirm={onConfirm}
				onCancel={onCancel}
			/>,
		);

		expect(screen.getByRole("dialog", { name: "Delete board?" })).toBeVisible();
		expect(screen.getByText("This action cannot be undone.")).toBeVisible();
		fireEvent.click(screen.getByRole("button", { name: "Delete board" }));
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(onConfirm).toHaveBeenCalledOnce();
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("disables both actions while loading", () => {
		render(
			<ConfirmDialog
				open
				title="Delete board?"
				description="Please wait."
				loading
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
	});
});
