"use client";

import { type FormEvent, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import type { BoardColumn } from "@/state/domain.types";
import { columnFormSchema } from "../validation";

export interface ColumnModalProps {
	open: boolean;
	column?: BoardColumn;
	onClose: () => void;
	onSubmit: (title: string) => void;
}

export default function ColumnModal({
	open,
	column,
	onClose,
	onSubmit,
}: ColumnModalProps) {
	const [title, setTitle] = useState("");
	const [error, setError] = useState<string>();

	useEffect(() => {
		if (!open) return;
		setTitle(column?.title ?? "");
		setError(undefined);
	}, [column, open]);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = columnFormSchema.safeParse({ title });

		if (!result.success) {
			setError(result.error.issues[0]?.message ?? "Enter a column title.");
			return;
		}

		setError(undefined);
		onSubmit(result.data.title);
	};

	return (
		<Modal
			open={open}
			title={column ? "Edit column" : "Add column"}
			onClose={onClose}
		>
			<form onSubmit={handleSubmit} noValidate className="space-y-4">
				<Input
					id="column-title"
					label="Column title"
					value={title}
					onChange={(event) => setTitle(event.target.value)}
					autoComplete="off"
					required
					maxLength={80}
					error={error}
				/>
				<div className="flex justify-end gap-2 pt-2">
					<Button variant="white" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="lightblue" type="submit">
						{column ? "Save changes" : "Create column"}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
