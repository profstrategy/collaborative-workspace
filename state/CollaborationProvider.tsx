"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { CollaborationConnectionStatus } from "@/services/collaboration/protocol";
import {
	createSimulatedCollaborationClient,
	type SimulatedCollaborationClient,
	type SimulatedPeer,
} from "@/services/collaboration/simulatedCollaboration";

interface CollaborationContextValue {
	status: CollaborationConnectionStatus;
	lastError: string | null;
	peerCount: number;
	joinBoard: (boardId: string) => void;
	leaveBoard: (boardId: string) => void;
}

const CollaborationContext = createContext<CollaborationContextValue | null>(
	null,
);

/**
 * Phase 5B simulation: same-origin browser tabs communicate through BroadcastChannel.
 * This intentionally does not depend on the experimental WebSocket endpoint.
 */
export function CollaborationProvider({ children }: { children: ReactNode }) {
	const clientRef = useRef<SimulatedCollaborationClient | null>(null);
	const activeBoardRef = useRef<string | null>(null);
	const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
	const [status, setStatus] =
		useState<CollaborationConnectionStatus>("connecting");
	const [lastError, setLastError] = useState<string | null>(null);
	const [peers, setPeers] = useState<SimulatedPeer[]>([]);

	useEffect(() => {
		const client = createSimulatedCollaborationClient({
			onRemoteSnapshot: () => {
				// AppProvider owns state reconciliation; this client is used for presence.
			},
			onPeersChanged: setPeers,
		});
		clientRef.current = client;
		if (client) {
			setStatus("connected");
			setLastError(null);
		} else {
			setStatus("disconnected");
			setLastError(
				"This browser does not support BroadcastChannel; simulated collaboration is unavailable.",
			);
		}

		return () => {
			client?.close();
			clientRef.current = null;
		};
	}, []);

	const joinBoard = useCallback((boardId: string) => {
		const normalized = boardId.trim();
		if (!/^[a-zA-Z0-9_-]{1,128}$/.test(normalized)) return;
		if (activeBoardRef.current && activeBoardRef.current !== normalized) {
			clientRef.current?.leaveBoard(activeBoardRef.current);
		}
		activeBoardRef.current = normalized;
		setActiveBoardId(normalized);
		clientRef.current?.joinBoard(normalized);
	}, []);

	const leaveBoard = useCallback((boardId: string) => {
		clientRef.current?.leaveBoard(boardId);
		if (activeBoardRef.current === boardId) {
			activeBoardRef.current = null;
			setActiveBoardId(null);
		}
	}, []);

	const peerCount = useMemo(
		() =>
			activeBoardId
				? peers.filter((peer) => peer.boardId === activeBoardId).length
				: 0,
		[activeBoardId, peers],
	);

	return (
		<CollaborationContext.Provider
			value={{ status, lastError, peerCount, joinBoard, leaveBoard }}
		>
			{children}
		</CollaborationContext.Provider>
	);
}

export function useCollaboration() {
	const context = useContext(CollaborationContext);
	if (!context)
		throw new Error(
			"useCollaboration must be used inside CollaborationProvider",
		);
	return context;
}
