"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
	{
		id: "workspace",
		label: "Workspace",
		href: "/workspace",
		icon: (
			<svg
				aria-hidden="true"
				focusable="false"
				className="h-3.5 w-3.5 shrink-0 stroke-[1.8] sm:h-4 sm:w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
				/>
			</svg>
		),
	},
	{
		id: "board",
		label: "Board",
		href: "/board",
		icon: (
			<svg
				aria-hidden="true"
				focusable="false"
				className="h-3.5 w-3.5 shrink-0 stroke-[1.8] sm:h-4 sm:w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
				/>
			</svg>
		),
	},
] as const;

export default function Sidebar() {
	const pathname = usePathname();

	const isWorkspaceActive =
		pathname === "/workspace" || pathname.startsWith("/workspace/");

	const isBoardActive = pathname === "/board" || pathname.startsWith("/board/");

	return (
		<nav
			aria-label="Main navigation"
			className="flex h-14 items-center justify-between rounded-lg border border-gray-200/90 bg-[#F1F2F4] px-3 sm:px-5"
		>
			<Link
				href="/workspace"
				aria-label="Talenvo home"
				className="flex min-w-0 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
			>
				<Image
					src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyAaTks0Tm9L3M-pBAsi_lou-Xjs9wkwIX6c3s2CfpwRyNxyPwbLbYw5Vdy2-fJnrS1nCmzBMysH-lpRAdu_LWm1jDElNgCrz76IWi4qJ6eh--uQ2pzQzETm3VUnYUKElETDjdS-9rJo0XeUoKSniZ82ZAW4WIkJT64rMzAFV1qtPByGy64E9ivxjg1OCJKHCP61MZJ0YIIHQIgVGQ2YEQJ1it2IWjAv776wWO_TSDIgi-QFmDmVoGwNZBiw49GQY9"
					alt="Talenvo"
					width={160}
					height={0}
					unoptimized
					className="h-auto w-auto object-contain sm:h-6"
				/>
			</Link>

			<div className="flex shrink-0 items-center gap-1 sm:gap-2">
				{navigationItems.map(({ id, label, href, icon }) => {
					const isActive =
						id === "workspace" ? isWorkspaceActive : isBoardActive;

					return (
						<Link
							key={id}
							href={href}
							aria-current={isActive ? "page" : undefined}
							className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:gap-2 sm:px-3.5 sm:text-sm ${
								isActive
									? "border border-gray-200/90 bg-white/90 font-semibold text-[#1E232A] shadow-sm"
									: "font-medium text-[#5E6672] hover:bg-black/5 hover:text-[#1E232A]"
							}`}
						>
							{icon}
							<span>{label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
