import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarkdownPreview from "../../components/ui/MarkdownPreview";

describe("MarkdownPreview", () => {
	it("renders markdown content", () => {
		render(
			<MarkdownPreview>{"## Update\n\nA **bold** note."}</MarkdownPreview>,
		);

		expect(screen.getByRole("heading", { name: "Update" })).toBeVisible();
		expect(screen.getByText("bold").tagName).toBe("STRONG");
	});

	it("renders links as text when links are disabled", () => {
		render(
			<MarkdownPreview links={false}>
				[Documentation](https://example.com)
			</MarkdownPreview>,
		);

		expect(screen.getByText("Documentation").tagName).toBe("SPAN");
		expect(screen.queryByRole("link", { name: "Documentation" })).toBeNull();
	});
});
