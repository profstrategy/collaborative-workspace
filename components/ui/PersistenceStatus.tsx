import Button from "@/components/ui/Button";
import type { PersistenceStatusState } from "@/state/AppProvider";

export interface PersistenceStatusProps {
	persistence: PersistenceStatusState;
	onRetry: () => void;
}

export default function PersistenceStatus({
	persistence,
	onRetry,
}: PersistenceStatusProps) {
	const toneClasses =
		persistence.status === "unsaved"
			? "border border-amber-200 bg-amber-50 text-amber-800"
			: persistence.status === "saving" || persistence.status === "retrying"
				? "border border-blue-200 bg-blue-50 text-blue-800"
				: "border border-emerald-200 bg-emerald-50 text-emerald-800";

	const label =
		persistence.status === "saving"
			? "Saving…"
			: persistence.status === "retrying"
				? "Retrying save…"
				: persistence.status === "unsaved"
					? "Changes not saved"
					: "All changes saved";

	return (
		<output
			aria-live="polite"
			className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-sm ${toneClasses}`}
		>
			<span>{label}</span>
			{persistence.canRetry && (
				<Button
					variant="white"
					type="button"
					onClick={onRetry}
					aria-label="Retry save"
					className="min-h-8 px-2 py-1 text-xs"
				>
					Retry save
				</Button>
			)}
		</output>
	);
}
