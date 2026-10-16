import type { Tag } from "@/state/domain.types";

export const tagStatuses = [
	"Pending",
	"Ongoing",
	"Completed",
	"Bugs",
] as const satisfies readonly Tag["status"][];

export const tagStatusClasses: Record<Tag["status"], string> = {
	Pending: "border-amber-200 bg-amber-100 text-amber-900",
	Ongoing: "border-amber-200/80 bg-amber-50 text-stone-800",
	Completed: "border-emerald-200 bg-emerald-100 text-emerald-900",
	Bugs: "border-rose-200 bg-rose-100 text-rose-900",
};

export const tagColorByStatus: Record<Tag["status"], string> = {
	Pending: "#B45309",
	Ongoing: "#78716C",
	Completed: "#047857",
	Bugs: "#BE123C",
};
