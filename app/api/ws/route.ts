import {
	experimental_upgradeWebSocket,
	type WebSocketData,
} from "@vercel/functions";
import {
	createServerMessage,
	parseClientMessage,
} from "@/services/collaboration/protocol";

// This registry is intentionally process-local. It supports connections handled by
// this function instance only; shared pub/sub is required for cross-instance delivery.
type Socket = {
	send(data: string): void;
	on(event: "message", listener: (data: WebSocketData) => void): void;
	on(event: "close" | "error", listener: () => void): void;
};
const rooms = new Map<string, Set<Socket>>();
const socketRooms = new WeakMap<Socket, Set<string>>();
let nextConnectionId = 0;

function send(socket: Socket, message: unknown) {
	try {
		socket.send(JSON.stringify(message));
	} catch {
		// A closing socket is best-effort; the close handler performs cleanup.
	}
}

function leaveAllRooms(socket: Socket) {
	const boardIds = socketRooms.get(socket);
	if (!boardIds) return;
	for (const boardId of boardIds) {
		const members = rooms.get(boardId);
		members?.delete(socket);
		if (members?.size === 0) rooms.delete(boardId);
	}
	socketRooms.delete(socket);
}

export function GET(request: Request) {
	// Access request-specific data so Next.js does not prerender this
	// runtime-only WebSocket upgrade endpoint during the production build.
	request.headers.get("upgrade");
	return experimental_upgradeWebSocket((socket) => {
		const connectionId = `conn-${Date.now().toString(36)}-${(++nextConnectionId).toString(36)}`;
		socketRooms.set(socket, new Set());

		socket.on("message", (data: WebSocketData) => {
			const parsed = parseClientMessage(data);
			if (!parsed.success) {
				const code =
					parsed.reason === "unsupported-version"
						? "UNSUPPORTED_VERSION"
						: parsed.reason === "unknown-type"
							? "UNKNOWN_TYPE"
							: "INVALID_MESSAGE";
				send(
					socket,
					createServerMessage("server/error", {
						code,
						message:
							parsed.reason === "oversized"
								? "Message exceeds the allowed size."
								: "Message is invalid or unsupported.",
					}),
				);
				return;
			}

			const message = parsed.data;
			if (message.type === "heartbeat/ping") {
				send(
					socket,
					createServerMessage("heartbeat/pong", { replyTo: message.id }),
				);
				return;
			}

			if (message.type === "room/join") {
				const currentRooms = socketRooms.get(socket);
				if (!currentRooms) return;
				currentRooms.add(message.boardId);
				let members = rooms.get(message.boardId);
				if (!members) {
					members = new Set();
					rooms.set(message.boardId, members);
				}
				members.add(socket);
				send(
					socket,
					createServerMessage("room/joined", { boardId: message.boardId }),
				);
				return;
			}

			if (message.type === "room/leave") {
				socketRooms.get(socket)?.delete(message.boardId);
				const members = rooms.get(message.boardId);
				members?.delete(socket);
				if (members?.size === 0) rooms.delete(message.boardId);
				send(
					socket,
					createServerMessage("room/left", { boardId: message.boardId }),
				);
			}
		});

		socket.on("close", () => leaveAllRooms(socket));
		socket.on("error", () => leaveAllRooms(socket));
		send(socket, createServerMessage("connection/ready", { connectionId }));
	});
}
