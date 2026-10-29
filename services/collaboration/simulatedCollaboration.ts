import { isAppState } from "@/services/storageAdapter";
import type { AppState } from "@/state/domain.types";

const CHANNEL_NAME = "talenvo:simulated-collaboration:v1";
const PROTOCOL_VERSION = 1;

type SnapshotMessage = {
	version: 1;
	kind: "snapshot";
	clientId: string;
	clock: number;
	state: AppState;
};

type PresenceMessage = {
	version: 1;
	kind: "presence";
	clientId: string;
	boardId: string;
	joined: boolean;
};

type PresenceRequestMessage = {
	version: 1;
	kind: "presence/request";
	clientId: string;
	boardId: string;
};

type CollaborationMessage =
	| SnapshotMessage
	| PresenceMessage
	| PresenceRequestMessage;

export interface SimulatedPeer {
	clientId: string;
	boardId: string;
}

export interface SimulatedCollaborationClient {
	clientId: string;
	publishSnapshot(state: AppState): void;
	joinBoard(boardId: string): void;
	leaveBoard(boardId: string): void;
	close(): void;
}

export interface SimulatedCollaborationCallbacks {
	onRemoteSnapshot: (
		state: AppState,
		metadata: { clientId: string; clock: number },
	) => void;
	onPeersChanged?: (peers: SimulatedPeer[]) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMessage(value: unknown): CollaborationMessage | null {
	if (
		!isRecord(value) ||
		value.version !== PROTOCOL_VERSION ||
		typeof value.clientId !== "string"
	)
		return null;

	if (value.kind === "snapshot") {
		if (
			typeof value.clock !== "number" ||
			!Number.isSafeInteger(value.clock) ||
			value.clock < 1 ||
			!isAppState(value.state)
		)
			return null;
		return value as SnapshotMessage;
	}

	if (
		typeof value.boardId === "string" &&
		/^[a-zA-Z0-9_-]{1,128}$/.test(value.boardId) &&
		value.kind === "presence/request"
	)
		return value as PresenceRequestMessage;

	if (
		value.kind === "presence" &&
		typeof value.boardId === "string" &&
		/^[a-zA-Z0-9_-]{1,128}$/.test(value.boardId) &&
		typeof value.joined === "boolean"
	)
		return value as PresenceMessage;

	return null;
}

/**
 * Same-origin, same-browser-tab simulation only. BroadcastChannel provides no
 * durable delivery, authentication, authorization, or cross-device transport.
 */
export function createSimulatedCollaborationClient(
	callbacks: SimulatedCollaborationCallbacks,
): SimulatedCollaborationClient | null {
	if (typeof window === "undefined" || typeof BroadcastChannel === "undefined")
		return null;

	const clientId = crypto.randomUUID();
	const channel = new BroadcastChannel(CHANNEL_NAME);
	const joinedBoards = new Set<string>();
	const peers = new Map<string, Set<string>>();
	const latestClockByClient = new Map<string, number>();
	let logicalClock = 0;
	let closed = false;

	const emitPeers = () => {
		const allPeers: SimulatedPeer[] = [];
		for (const [boardId, clientIds] of peers) {
			for (const peerId of clientIds) {
				if (peerId !== clientId) allPeers.push({ clientId: peerId, boardId });
			}
		}
		callbacks.onPeersChanged?.(allPeers);
	};

	channel.addEventListener("message", (event: MessageEvent<unknown>) => {
		if (closed) return;
		const message = parseMessage(event.data);
		if (!message || message.clientId === clientId) return;

		if (message.kind === "snapshot") {
			const previousClock = latestClockByClient.get(message.clientId) ?? 0;
			if (message.clock <= previousClock) return;
			latestClockByClient.set(message.clientId, message.clock);
			logicalClock = Math.max(logicalClock, message.clock);
			callbacks.onRemoteSnapshot(structuredClone(message.state), {
				clientId: message.clientId,
				clock: message.clock,
			});
			return;
		}

		if (message.kind === "presence/request") {
			if (joinedBoards.has(message.boardId)) {
				channel.postMessage({
					version: PROTOCOL_VERSION,
					kind: "presence",
					clientId,
					boardId: message.boardId,
					joined: true,
				} satisfies PresenceMessage);
			}
			return;
		}

		let members = peers.get(message.boardId);
		if (!members) {
			members = new Set();
			peers.set(message.boardId, members);
		}
		if (message.joined) members.add(message.clientId);
		else members.delete(message.clientId);
		if (members.size === 0) peers.delete(message.boardId);
		emitPeers();
	});

	return {
		clientId,
		publishSnapshot(state) {
			if (closed || !isAppState(state)) return;
			logicalClock += 1;
			channel.postMessage({
				version: PROTOCOL_VERSION,
				kind: "snapshot",
				clientId,
				clock: logicalClock,
				state: structuredClone(state),
			} satisfies SnapshotMessage);
		},
		joinBoard(boardId) {
			const normalized = boardId.trim();
			if (
				closed ||
				!/^[a-zA-Z0-9_-]{1,128}$/.test(normalized) ||
				joinedBoards.has(normalized)
			)
				return;
			joinedBoards.add(normalized);
			channel.postMessage({
				version: PROTOCOL_VERSION,
				kind: "presence/request",
				clientId,
				boardId: normalized,
			} satisfies PresenceRequestMessage);
			channel.postMessage({
				version: PROTOCOL_VERSION,
				kind: "presence",
				clientId,
				boardId: normalized,
				joined: true,
			} satisfies PresenceMessage);
		},
		leaveBoard(boardId) {
			if (closed || !joinedBoards.has(boardId)) return;
			joinedBoards.delete(boardId);
			channel.postMessage({
				version: PROTOCOL_VERSION,
				kind: "presence",
				clientId,
				boardId,
				joined: false,
			} satisfies PresenceMessage);
		},
		close() {
			if (closed) return;
			for (const boardId of joinedBoards) {
				channel.postMessage({
					version: PROTOCOL_VERSION,
					kind: "presence",
					clientId,
					boardId,
					joined: false,
				} satisfies PresenceMessage);
			}
			closed = true;
			channel.close();
		},
	};
}
