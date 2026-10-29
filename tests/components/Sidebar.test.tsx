import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "../../components/layout/Sidebar";

vi.mock("next/navigation", () => ({
	usePathname: vi.fn(),
}));

vi.mock("next/image", () => ({
	default: () => null,
}));

vi.mock("next/link", () => ({
	default: ({ href, ...props }: ComponentProps<"a">) => (
		<a href={href} {...props} />
	),
}));

describe("Sidebar", () => {
	it("marks the current workspace section as active", () => {
		vi.mocked(usePathname).mockReturnValue("/workspace/boards/123");

		render(<Sidebar />);

		expect(
			screen.getByRole("navigation", { name: "Main navigation" }),
		).toBeVisible();
		expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(screen.getByRole("link", { name: "Board" })).not.toHaveAttribute(
			"aria-current",
		);
	});

	it("marks nested board routes as active", () => {
		vi.mocked(usePathname).mockReturnValue("/board/123");

		render(<Sidebar />);

		expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute(
			"aria-current",
			"page",
		);
	});
});
