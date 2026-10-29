import type { AppState } from "@/state/domain.types";
import { isAppState } from "./storageAdapter";

export type MockPersistenceStatus = "saved" | "saving" | "unsaved" | "retrying";

export interface MockBoardApiLoadResult {
	status: "loaded" | "empty";
	state: AppState;
	revision: number;
}

export interface MockBoardApiSaveSuccess {
	ok: true;
	state: AppState;
	revision: number;
}

export interface MockBoardApiSaveFailure {
	ok: false;
	error: string;
	revision: number;
}

export type MockBoardApiSaveResult =
	| MockBoardApiSaveSuccess
	| MockBoardApiSaveFailure;

export interface MockBoardApiConfig {
	initialState?: AppState;
	latencyMs?: number;
	failNextSaveCount?: number;
	failOnRevision?: number;
}

export interface MockBoardApi {
	loadInitialState(): Promise<MockBoardApiLoadResult>;
	saveState(
		state: AppState,
		expectedRevision?: number,
	): Promise<MockBoardApiSaveResult>;
	getState(): AppState;
	getRevision(): number;
	reset(nextState?: AppState): void;
}

function cloneState(state: AppState): AppState {
	return structuredClone(state);
}

export function createMockBoardApi(
	config: MockBoardApiConfig = {},
): MockBoardApi {
	const initialState = config.initialState ?? {
		boards: {},
		columns: {},
		cards: {},
		tags: {},
		comments: {},
	};

	let snapshot = cloneState(initialState);
	let revision = 0;
	let failNextSaveCount = config.failNextSaveCount ?? 0;
	let nextSaveFailureRevision = config.failOnRevision ?? null;

	const runWithLatency = <T>(work: () => T): Promise<T> =>
		new Promise((resolve) => {
			const latencyMs = config.latencyMs ?? 0;
			setTimeout(() => resolve(work()), latencyMs);
		});

	return {
		async loadInitialState(): Promise<MockBoardApiLoadResult> {
			return runWithLatency(() => ({
				status: "loaded",
				state: cloneState(snapshot),
				revision,
			}));
		},
		async saveState(
			state: AppState,
			expectedRevision = revision,
		): Promise<MockBoardApiSaveResult> {
			return runWithLatency(() => {
				if (!isAppState(state)) {
					return {
						ok: false,
						error: "Saved state is invalid.",
						revision,
					};
				}

				if (expectedRevision !== revision) {
					return {
						ok: false,
						error:
							"Save rejected because a newer snapshot was already confirmed.",
						revision,
					};
				}

				if (failNextSaveCount > 0) {
					failNextSaveCount -= 1;
					return {
						ok: false,
						error: "Mock API rejected the save for testing.",
						revision,
					};
				}

				if (
					nextSaveFailureRevision !== null &&
					revision + 1 === nextSaveFailureRevision
				) {
					nextSaveFailureRevision = null;
					return {
						ok: false,
						error: "Mock API failed this save at the scheduled revision.",
						revision,
					};
				}

				snapshot = cloneState(state);
				revision += 1;
				return {
					ok: true,
					state: cloneState(snapshot),
					revision,
				};
			});
		},
		getState() {
			return cloneState(snapshot);
		},
		getRevision() {
			return revision;
		},
		reset(nextState = cloneState(initialState)) {
			snapshot = cloneState(nextState);
			revision = 0;
			failNextSaveCount = 0;
			nextSaveFailureRevision = null;
		},
	};
}
