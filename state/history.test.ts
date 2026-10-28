//     import { expect, it } from "vitest";
// import { AppRootState, createRootState, RootAction, rootReducer } from "./root.reducer";

// const at = "2026-01-01T00:00:00.000Z";
// const apply = (s: AppRootState, ...actions: RootAction[]) => actions.reduce(rootReducer, s);
// const undo = { type: "history/undo", payload: { at } } as const;
// const redo = { type: "history/redo", payload: { at } } as const;

// it("cross-column move round-trips with positions intact", () => {
// 	const start = createRootState(fixtureWithTwoColumns());
// 	const moved = apply(start, moveAction);
// 	const undone = apply(moved, undo);
// 	expect(undone.domain.columns).toEqual(start.domain.columns);
// 	expect(undone.domain.cards).toEqual(start.domain.cards);
// 	expect(apply(undone, redo).domain).toEqual(moved.domain);
// });

// it("undoing a delete restores the card, its tags and its comments at the same index", () => {
// 	// card in the middle of a column, with a tag and a comment thread
// 	const deleted = apply(createRootState(fixture), deleteMiddleCard);
// 	expect(deleted.domain.comments).toEqual({});
// 	const restored = apply(deleted, undo).domain;
// 	expect(restored).toEqual(fixture); // full structural equality
// });

// it("blocks undoing a creation once the card has comments", () => {
// 	const s = apply(createRootState(base), createCard, commentOnNewCard, undo);
// 	expect(s.lastHistoryEvent).toMatchObject({ outcome: "failed", reason: "card-has-comments" });
// 	expect(s.domain.cards[newId]).toBeDefined();
// 	expect(s.history.undoStack).toHaveLength(0); // dropped, not stuck
// });