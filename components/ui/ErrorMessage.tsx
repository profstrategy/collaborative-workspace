interface ErrorMessageProps {
	id: string;
	message?: string;
}

export default function ErrorMessage({ id, message }: ErrorMessageProps) {
	if (!message) return null;

	return (
		<p id={id} role="alert" className="mt-1 text-sm text-red-700">
			{message}
		</p>
	);
}
