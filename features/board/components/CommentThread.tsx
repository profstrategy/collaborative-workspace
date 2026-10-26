"use client";

import {
	type FormEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAppProvider } from "@/state/AppProvider";
import type { CardComment, EntityId } from "@/state/domain.types";
import { DEMO_COMMENT_AUTHOR } from "../commentAuthor";
import { commentFormSchema } from "../validation";

interface CommentThreadProps {
	cardId: EntityId;
	cardTitle: string;
	onClose: () => void;
}

function compareComments(a: CardComment, b: CardComment) {
	return (
		Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
		a.id.localeCompare(b.id)
	);
}

function CommentForm({
	id,
	label,
	value,
	onChange,
	onSubmit,
	onCancel,
	submitLabel,
	cancelLabel,
	onTextareaRef,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onCancel?: () => void;
	submitLabel: string;
	cancelLabel?: string;
	onTextareaRef?: (element: HTMLTextAreaElement | null) => void;
}) {
	const [error, setError] = useState("");
	const textareaId = `${id}-body`;
	const errorId = `${textareaId}-error`;

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = commentFormSchema.safeParse({ body: value });
		if (!result.success) {
			setError(result.error.issues[0]?.message ?? "Enter a comment.");
			return;
		}
		setError("");
		onSubmit(event);
	};

	return (
		<form onSubmit={handleSubmit} noValidate className="space-y-2">
			<label
				htmlFor={textareaId}
				className="block text-sm font-medium text-[#1E232A]"
			>
				{label}
			</label>
			<textarea
				id={textareaId}
				ref={onTextareaRef}
				value={value}
				onChange={(event) => {
					onChange(event.target.value);
					if (error) setError("");
				}}
				maxLength={5000}
				aria-invalid={error ? true : undefined}
				aria-describedby={error ? errorId : undefined}
				className="block min-h-24 w-full resize-y rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm text-[#1E232A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
			/>
			{error && (
				<p id={errorId} role="alert" className="text-sm text-red-700">
					{error}
				</p>
			)}
			<div className="flex flex-wrap justify-end gap-2">
				{onCancel && (
					<Button variant="white" onClick={onCancel}>
						{cancelLabel}
					</Button>
				)}
				<Button variant="lightblue" type="submit">
					{submitLabel}
				</Button>
			</div>
		</form>
	);
}

export default function CommentThread({
	cardId,
	cardTitle,
	onClose,
}: CommentThreadProps) {
	const { state, dispatch, persistence, retrySave } = useAppProvider();
	const [newBody, setNewBody] = useState("");
	const [replyTargetId, setReplyTargetId] = useState<EntityId | null>(null);
	const [replyBody, setReplyBody] = useState("");
	const [editingId, setEditingId] = useState<EntityId | null>(null);
	const [editBody, setEditBody] = useState("");
	const [deleteTargetId, setDeleteTargetId] = useState<EntityId | null>(null);
	const [announcement, setAnnouncement] = useState("");
	const mainTextareaRef = useRef<HTMLTextAreaElement>(null);
	const mainFormId = useId();

	const { childrenByParent, commentsById, roots } = useMemo(() => {
		const comments = Object.values(state.comments)
			.filter((comment) => comment.cardId === cardId)
			.sort(compareComments);
		const commentsById = new Map(
			comments.map((comment) => [comment.id, comment]),
		);
		const childrenByParent = new Map<EntityId, CardComment[]>();
		const roots: CardComment[] = [];

		for (const comment of comments) {
			if (comment.parentCommentId === null) {
				roots.push(comment);
				continue;
			}
			const children = childrenByParent.get(comment.parentCommentId) ?? [];
			children.push(comment);
			childrenByParent.set(comment.parentCommentId, children);
		}
		return { commentsById, childrenByParent, roots };
	}, [cardId, state.comments]);

	const dispatchComment = (body: string, parentCommentId: EntityId | null) => {
		const now = new Date().toISOString();
		dispatch({
			type: "comment/created",
			payload: {
				id: crypto.randomUUID(),
				cardId,
				parentCommentId,
				body,
				authorName: DEMO_COMMENT_AUTHOR,
				createdAt: now,
				updatedAt: now,
			},
		});
	};

	const focusControl = (attribute: string, id: EntityId) => {
		window.requestAnimationFrame(() => {
			Array.from(document.querySelectorAll<HTMLElement>(`[${attribute}]`))
				.find((element) => element.getAttribute(attribute) === id)
				?.focus();
		});
	};

	const handleNewComment = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = commentFormSchema.safeParse({ body: newBody });
		if (!result.success) return;
		dispatchComment(result.data.body, null);
		setNewBody("");
		setAnnouncement("Comment added.");
		window.requestAnimationFrame(() => mainTextareaRef.current?.focus());
	};

	const handleReply = (
		event: FormEvent<HTMLFormElement>,
		parentId: EntityId,
	) => {
		event.preventDefault();
		const result = commentFormSchema.safeParse({ body: replyBody });
		if (!result.success) return;
		dispatchComment(result.data.body, parentId);
		setReplyTargetId(null);
		setReplyBody("");
		setAnnouncement("Reply added.");
		focusControl("data-comment-reply", parentId);
	};

	const handleEdit = (event: FormEvent<HTMLFormElement>, id: EntityId) => {
		event.preventDefault();
		const result = commentFormSchema.safeParse({ body: editBody });
		if (!result.success) return;
		dispatch({
			type: "comment/updated",
			payload: {
				id,
				body: result.data.body,
				updatedAt: new Date().toISOString(),
			},
		});
		setEditingId(null);
		setAnnouncement("Comment updated.");
		focusControl("data-comment-edit", id);
	};

	const handleDelete = (id: EntityId) => {
		const comment = commentsById.get(id);
		dispatch({ type: "comment/deleted", payload: { id } });
		setDeleteTargetId(null);
		setAnnouncement("Comment and its replies deleted.");
		if (comment?.parentCommentId) {
			focusControl("data-comment-reply", comment.parentCommentId);
		} else {
			window.requestAnimationFrame(() => mainTextareaRef.current?.focus());
		}
	};

	useEffect(() => {
		if (replyTargetId) {
			document.getElementById(`reply-${replyTargetId}-body`)?.focus();
		}
		if (editingId) {
			document.getElementById(`edit-${editingId}-body`)?.focus();
		}
	}, [editingId, replyTargetId]);

	const renderComment = (comment: CardComment, depth: number) => {
		const isAuthor = comment.authorName === DEMO_COMMENT_AUTHOR;
		const isEditing = editingId === comment.id;
		const isConfirmingDelete = deleteTargetId === comment.id;
		const childComments = childrenByParent.get(comment.id) ?? [];

		return (
			<li
				key={comment.id}
				className="min-w-0 border-l-2 border-slate-300 pl-3 sm:pl-4"
				data-comment-depth={depth}
			>
				<article
					aria-label={`Comment by ${comment.authorName}, level ${depth + 1}`}
					className="rounded-lg border border-[#E2E5E9] bg-white p-3"
				>
					<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
						<strong className="text-sm text-[#1E232A]">
							{comment.authorName}
						</strong>
						<time
							dateTime={comment.createdAt}
							className="text-xs text-[#6B7280]"
						>
							{new Intl.DateTimeFormat("en", {
								dateStyle: "medium",
								timeStyle: "short",
							}).format(new Date(comment.createdAt))}
						</time>
					</div>

					{isEditing ? (
						<CommentForm
							id={`edit-${comment.id}`}
							label={`Edit comment by ${comment.authorName}`}
							value={editBody}
							onChange={setEditBody}
							onSubmit={(event) => handleEdit(event, comment.id)}
							onCancel={() => {
								setEditingId(null);
								setEditBody("");
								focusControl("data-comment-edit", comment.id);
							}}
							submitLabel="Save comment"
							cancelLabel="Cancel edit"
						/>
					) : (
						<p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#1E232A]">
							{comment.body}
						</p>
					)}

					{!isEditing && (
						<div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
							{depth < 5 && (
								<button
									type="button"
									data-comment-reply={comment.id}
									aria-label={`Reply to comment by ${comment.authorName}`}
									onClick={() => {
										setReplyTargetId(comment.id);
										setReplyBody("");
										setEditingId(null);
									}}
									className="min-h-9 text-sm font-medium text-blue-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
								>
									Reply
								</button>
							)}
							{isAuthor && (
								<>
									<button
										type="button"
										data-comment-edit={comment.id}
										aria-label={`Edit comment by ${comment.authorName}`}
										onClick={() => {
											setEditingId(comment.id);
											setEditBody(comment.body);
											setReplyTargetId(null);
										}}
										className="min-h-9 text-sm font-medium text-blue-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
									>
										Edit
									</button>
									<button
										type="button"
										aria-label={`Delete comment by ${comment.authorName}`}
										data-comment-delete={comment.id}
										onClick={() => setDeleteTargetId(comment.id)}
										className="min-h-9 text-sm font-medium text-red-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
									>
										Delete
									</button>
								</>
							)}
						</div>
					)}

					{isConfirmingDelete && (
						<div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
							<p className="text-sm text-[#1E232A]">
								Delete this comment and all its replies?
							</p>
							<div className="mt-2 flex flex-wrap justify-end gap-2">
								<Button
									variant="white"
									onClick={() => {
										setDeleteTargetId(null);
										focusControl("data-comment-delete", comment.id);
									}}
								>
									Cancel delete
								</Button>
								<Button
									variant="white"
									className="border-red-200 text-red-700 hover:bg-red-100"
									onClick={() => handleDelete(comment.id)}
								>
									Confirm delete
								</Button>
							</div>
						</div>
					)}

					{replyTargetId === comment.id && (
						<div className="mt-3">
							<CommentForm
								id={`reply-${comment.id}`}
								label={`Reply to comment by ${comment.authorName}`}
								value={replyBody}
								onChange={setReplyBody}
								onSubmit={(event) => handleReply(event, comment.id)}
								onCancel={() => {
									setReplyTargetId(null);
									setReplyBody("");
									focusControl("data-comment-reply", comment.id);
								}}
								submitLabel="Post reply"
								cancelLabel="Cancel reply"
							/>
						</div>
					)}
				</article>
				{childComments.length > 0 && (
					<ol
						aria-label={`Replies to comment by ${comment.authorName}`}
						className="mt-3 space-y-3 pl-2 sm:pl-4"
					>
						{childComments.map((child) => renderComment(child, depth + 1))}
					</ol>
				)}
			</li>
		);
	};

	return (
		<Modal open title={`Comments: ${cardTitle}`} onClose={onClose}>
			<div className="space-y-5">
				<output
					aria-live="polite"
					className="rounded-md border border-[#E2E5E9] bg-slate-50 px-3 py-2 text-sm text-[#4B5563]"
				>
					<span>{persistence.message}</span>
					{persistence.canRetry && (
						<Button
							variant="white"
							className="ml-3 min-h-9"
							onClick={retrySave}
							aria-label="Retry saving comments"
						>
							Retry save
						</Button>
					)}
				</output>

				{roots.length === 0 ? (
					<p className="rounded-md border border-dashed border-[#CBD5E1] p-4 text-sm text-[#4B5563]">
						No comments yet. Add the first comment below.
					</p>
				) : (
					<ol aria-label="Comment threads" className="space-y-3">
						{roots.map((comment) => renderComment(comment, 0))}
					</ol>
				)}

				<CommentForm
					id={`new-${mainFormId}`}
					label="Add a comment"
					value={newBody}
					onChange={setNewBody}
					onSubmit={handleNewComment}
					submitLabel="Post comment"
					onTextareaRef={(element) => {
						mainTextareaRef.current = element;
					}}
				/>
				<output aria-live="polite" className="sr-only">
					{announcement}
				</output>
			</div>
		</Modal>
	);
}
