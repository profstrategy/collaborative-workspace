"use client";

import { type FormEvent, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import type { BoardCard, BoardColumn } from "@/state/domain.types";
import { type CardFormValues, cardFormSchema } from "../validation";

type CardFormErrors = Partial<Record<keyof CardFormValues, string>>;

export interface CardModalProps {
	open: boolean;
	column: BoardColumn;
	card?: BoardCard;
	onClose: () => void;
	onSubmit: (values: CardFormValues) => void;
}

export default function CardModal({
	open,
	column,
	card,
	onClose,
	onSubmit,
}: CardModalProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [errors, setErrors] = useState<CardFormErrors>({});

	useEffect(() => {
		if (!open) return;
		setTitle(card?.title ?? "");
		setDescription(card?.description ?? "");
		setDueDate(card?.dueDate ?? "");
		setErrors({});
	}, [card, open]);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = cardFormSchema.safeParse({ title, description, dueDate });

		if (!result.success) {
			const nextErrors: CardFormErrors = {};
			for (const issue of result.error.issues) {
				const field = issue.path[0];
				if (
					(field === "title" ||
						field === "description" ||
						field === "dueDate") &&
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
			title={card ? "Edit card" : "Add card"}
			onClose={onClose}
		>
			<form onSubmit={handleSubmit} noValidate className="space-y-4">
				<p className="text-sm text-[#4B5563]">Column: {column.title}</p>
				<Input
					id="card-title"
					label="Card title"
					value={title}
					onChange={(event) => setTitle(event.target.value)}
					autoComplete="off"
					required
					maxLength={160}
					error={errors.title}
				/>
				<Textarea
					id="card-description"
					label="Description"
					value={description}
					onChange={(event) => setDescription(event.target.value)}
					rows={4}
					maxLength={5000}
					error={errors.description}
				/>
				<Input
					id="card-due-date"
					label="Due date"
					type="date"
					value={dueDate}
					onChange={(event) => setDueDate(event.target.value)}
					error={errors.dueDate}
				/>
				<div className="flex justify-end gap-2 pt-2">
					<Button variant="white" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="lightblue" type="submit">
						{card ? "Save changes" : "Create card"}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
