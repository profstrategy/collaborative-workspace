import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "../../components/ui/Modal";

describe("Modal", () => {
	it("renders its dialog and closes with the close button", () => {
		const onClose = vi.fn();
		render(
			<Modal open title="Edit profile" onClose={onClose}>
				<p>Profile details</p>
			</Modal>,
		);

		expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeVisible();
		expect(screen.getByText("Profile details")).toBeVisible();
		fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

		expect(onClose).toHaveBeenCalledOnce();
	});

	it("closes on Escape and renders nothing when closed", () => {
		const onClose = vi.fn();
		const { rerender, queryByRole } = render(
			<Modal open title="Edit profile" onClose={onClose}>
				<p>Profile details</p>
			</Modal>,
		);

		fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
		expect(onClose).toHaveBeenCalledOnce();

		rerender(
			<Modal open={false} title="Edit profile" onClose={onClose}>
				<p>Profile details</p>
			</Modal>,
		);
		expect(queryByRole("dialog")).toBeNull();
	});
});
