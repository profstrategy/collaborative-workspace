import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ErrorMessage from "../../components/ui/ErrorMessage";

describe("ErrorMessage", () => {
	it("renders a provided message as an alert", () => {
		render(<ErrorMessage id="title-error" message="A title is required." />);

		expect(screen.getByRole("alert")).toHaveTextContent("A title is required.");
		expect(screen.getByRole("alert")).toHaveAttribute("id", "title-error");
	});

	it("renders nothing when no message is provided", () => {
		const { container } = render(<ErrorMessage id="title-error" />);

		expect(container).toBeEmptyDOMElement();
	});
});
