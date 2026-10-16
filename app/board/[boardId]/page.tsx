import BoardPageClient from "@/features/board/components/BoardPageClient";

export default async function SingleBoardPage({
	params,
}: {
	params: Promise<{ boardId: string }>;
}) {
	const { boardId } = await params;
	return <BoardPageClient boardId={boardId} />;
}
