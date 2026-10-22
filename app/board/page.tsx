"use client";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
export default function BoardPage() {
	const router = useRouter();
	return (
		<main className="flex-1 grid grid-cols-1 items-center w-full px-4 py-8 sm:px-6 lg:px-8">
			<div className=" max-w-7xl">
				<section className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E5E9] px-6 py-10 text-center">
					<h2 className="text-base font-semibold text-[#1E232A]">
						No boards yet
					</h2>
					<p className="mt-1 max-w-sm text-sm text-[#4B5563]">
						No boards have been created yet. Go back to the workspace to create
						a new board and start managing your tasks.
					</p>
					<p className="mt-1 max-w-sm text-sm text-[#4B5563]"></p>
					<Button
						variant="white"
						className="mt-4"
						onClick={() => router.push("/workspace")}
					>
						Back to workspace
					</Button>
				</section>
			</div>
		</main>
	);
}
