"use client";

import Button from "./Button";
import Modal from "./Modal";

export interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description: string;
	confirmLabel?: string;
	loading?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Delete",
	loading = false,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	return (
		<Modal open={open} title={title} onClose={onCancel}>
			<p className="text-sm leading-relaxed text-[#4B5563]">{description}</p>
			<div className="mt-6 flex justify-end gap-2">
				<Button variant="white" onClick={onCancel} disabled={loading}>
					Cancel
				</Button>
				<Button
					variant="white"
					className="border-red-200 text-red-700 hover:bg-red-50"
					onClick={onConfirm}
					disabled={loading}
					loading={loading}
				>
					{confirmLabel}
				</Button>
			</div>
		</Modal>
	);
}
