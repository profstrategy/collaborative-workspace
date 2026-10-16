"use client";

import { type FormEvent, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import type { Board } from "@/state/domain.types";
import { type BoardFormValues, boardFormSchema } from "../validation";

type BoardFormErrors = Partial<Record<keyof BoardFormValues, string>>;

export interface CreateBoardModalProps {
	open: boolean;
	board?: Board;
	onClose: () => void;
	onSubmit: (values: BoardFormValues) => void;
}

export default function CreateBoardModal({
	open,
	board,
	onClose,
	onSubmit,
}: CreateBoardModalProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [errors, setErrors] = useState<BoardFormErrors>({});

	useEffect(() => {
		if (!open) return;
		setTitle(board?.title ?? "");
		setDescription(board?.description ?? "");
		setErrors({});
	}, [board, open]);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = boardFormSchema.safeParse({ title, description });

		if (!result.success) {
			const nextErrors: BoardFormErrors = {};
			for (const issue of result.error.issues) {
				const field = issue.path[0];
				if (
					(field === "title" || field === "description") &&
					!nextErrors[field]
				) {
					nextErrors[field] = issue.message;
				}
			}
			setErrors(nextErrors);
			return;
		}

		setErrors({});
		onSubmit(result.data);
	};

	return (
		<Modal
			open={open}
			title={board ? "Edit board" : "Create board"}
			onClose={onClose}
		>
			<form onSubmit={handleSubmit} noValidate className="space-y-4">
				<Input
					id="board-title"
					label="Board title"
					value={title}
					onChange={(event) => setTitle(event.target.value)}
					autoComplete="off"
					required
					maxLength={120}
					error={errors.title}
				/>
				<Textarea
					id="board-description"
					label="Description"
					value={description}
					onChange={(event) => setDescription(event.target.value)}
					rows={4}
					maxLength={2000}
					error={errors.description}
				/>
				<div className="flex justify-end gap-2 pt-2">
					<Button variant="white" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="lightblue" type="submit">
						{board ? "Save changes" : "Create board"}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
