import { describe, expect, it } from "vitest";
import {
	COLLABORATION_PROTOCOL_VERSION,
	createClientMessage,
	createServerMessage,
	parseClientMessage,
	serverMessageSchema,
} from "./protocol";

describe("collaboration protocol", () => {
	it("parses a valid room join message", () => {
		const message = createClientMessage("room/join", { boardId: "board_123" });
		expect(parseClientMessage(JSON.stringify(message))).toEqual({
			success: true,
			data: message,
		});
	});

	it("rejects malformed JSON and unknown message types", () => {
		expect(parseClientMessage("{")).toEqual({
			success: false,
			reason: "invalid-json",
		});
		const unknown = {
			version: COLLABORATION_PROTOCOL_VERSION,
			id: crypto.randomUUID(),
			type: "card/moved",
			sentAt: new Date().toISOString(),
		};
		expect(parseClientMessage(JSON.stringify(unknown))).toEqual({
			success: false,
			reason: "unknown-type",
		});
	});

	it("distinguishes unsupported protocol versions", () => {
		const message = {
			...createClientMessage("heartbeat/ping", {}),
			version: COLLABORATION_PROTOCOL_VERSION + 1,
		};
		expect(parseClientMessage(JSON.stringify(message))).toEqual({
			success: false,
			reason: "unsupported-version",
		});
	});

	it("rejects invalid board identifiers", () => {
		const message = {
			...createClientMessage("room/join", { boardId: "valid" }),
			boardId: "invalid board id",
		};
		expect(parseClientMessage(JSON.stringify(message))).toEqual({
			success: false,
			reason: "invalid-envelope",
		});
	});

	it("rejects oversized payloads", () => {
		expect(parseClientMessage("x".repeat(16 * 1024 + 1))).toEqual({
			success: false,
			reason: "oversized",
		});
	});

	it("validates server acknowledgements", () => {
		const message = createServerMessage("room/joined", {
			boardId: "board_123",
		});
		expect(serverMessageSchema.safeParse(message).success).toBe(true);
	});
});
