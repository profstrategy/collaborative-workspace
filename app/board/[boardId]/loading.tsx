export default function BoardLoading() {
	return (
		<div className="flex justify-center items-center h-screen bg-gray-100">
			<div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
		</div>
	);
}

export function WorkspaceLoading() {
	return (
		<div className="flex justify-center items-center h-screen bg-gray-100">
			<div className="w-16 h-16 border-4 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
		</div>
	);
}
