import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  clientMessageSchema,
  createClientMessage,
  serverMessageSchema,
  type CollaborationConnectionStatus,
  type ServerCollaborationMessage,
} from "@/services/collaboration/protocol";

interface CollaborationContextValue {
  status: CollaborationConnectionStatus;
  lastError: string | null;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
}

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

function getWebSocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_COLLABORATION_WS_URL;
  if (configured) return configured;
  if (typeof window === "undefined") return "";
  return `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws`;
}

export function CollaborationProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const joinedBoardsRef = useRef(new Set<string>());
  const [status, setStatus] = useState<CollaborationConnectionStatus>("disconnected");
  const [lastError, setLastError] = useState<string | null>(null);

  const send = useCallback((message: ReturnType<typeof createClientMessage>) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    const validated = clientMessageSchema.safeParse(message);
    if (!validated.success) return false;
    socket.send(JSON.stringify(validated.data));
    return true;
  }, []);

  const connectRef = useRef<() => void>(() => {});
  connectRef.current = () => {
    if (!mountedRef.current) return;
    const url = getWebSocketUrl();
    if (!url) {
      setStatus("error");
      setLastError("WebSocket URL is unavailable.");
      return;
    }

    setStatus(attemptRef.current === 0 ? "connecting" : "reconnecting");
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      setStatus("error");
      setLastError("Unable to create the WebSocket connection.");
      scheduleReconnect();
      return;
    }
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      if (!mountedRef.current || socketRef.current !== socket) return;
      attemptRef.current = 0;
      setStatus("connected");
      setLastError(null);
      for (const boardId of joinedBoardsRef.current) {
        const message = createClientMessage("room/join", { boardId });
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
      }
    });

    socket.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (typeof event.data !== "string") return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        setLastError("The server sent an unreadable message.");
        return;
      }
      const validated = serverMessageSchema.safeParse(parsed);
      if (!validated.success) {
        setLastError("The server sent an unsupported collaboration message.");
        return;
      }
      const message: ServerCollaborationMessage = validated.data;
      if (message.type === "server/error") setLastError(message.message);
    });

    socket.addEventListener("error", () => {
      if (!mountedRef.current || socketRef.current !== socket) return;
      setLastError("The collaboration connection encountered an error.");
      setStatus("error");
    });

    socket.addEventListener("close", () => {
      if (socketRef.current !== socket) return;
      socketRef.current = null;
      if (!mountedRef.current) return;
      setStatus("disconnected");
      scheduleReconnect();
    });
  };

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || reconnectTimerRef.current) return;
    attemptRef.current += 1;
    const exponent = Math.min(attemptRef.current - 1, 6);
    const baseDelay = Math.min(1000 * 2 ** exponent, 30_000);
    const delay = Math.round(baseDelay * (0.8 + Math.random() * 0.4));
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectRef.current();
    }, delay);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connectRef.current();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close(1000, "Provider disposed");
      }
    };
  }, []);

  const joinBoard = useCallback((boardId: string) => {
    const normalized = boardId.trim();
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(normalized)) return;
    joinedBoardsRef.current.add(normalized);
    send(createClientMessage("room/join", { boardId: normalized }));
  }, [send]);

  const leaveBoard = useCallback((boardId: string) => {
    joinedBoardsRef.current.delete(boardId);
    send(createClientMessage("room/leave", { boardId }));
  }, [send]);

  return (
    <CollaborationContext.Provider value={{ status, lastError, joinBoard, leaveBoard }}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) throw new Error("useCollaboration must be used inside CollaborationProvider");
  return context;
}
