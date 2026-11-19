/**
 * Helpers for screen tests. Two ways to render a component:
 *
 *   show / showInHunt      React Testing Library, onto the test page (jsdom): find things by
 *                          role and text, and click with userEvent. Use this for anything a
 *                          player does (opening, choosing, clicking).
 *   markup / markupInHunt  the HTML as a string (react-dom/server), for checking what a screen
 *                          shows at a glance: classes, data attributes and titles.
 *
 *   const s = await setup(load);
 *   s.showInHunt(PartyCard, { onToggle }, s.huntState(character, hunt));
 *   const html = s.markup(RoomMap, { location, mimicRoom });
 *
 * Not a test file itself (the runner only runs *.test.mjs).
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render } from '@testing-library/react';

export async function setup(load) {
  const { HuntContext, huntState } = await load('/src/components/game/hunt/HuntContext.ts');
  const inHunt = (hunt) => ({ children }) => createElement(HuntContext.Provider, { value: hunt }, children);
  return {
    huntState,
    /** Render onto the test page (Testing Library). Anything shown before is unmounted first. */
    show: (Component, props = {}) => {
      cleanup();
      return render(createElement(Component, props));
    },
    /** The same, inside the game screen's HuntContext (a value from huntState). */
    showInHunt: (Component, props, hunt) => {
      cleanup();
      return render(createElement(Component, props), { wrapper: inHunt(hunt) });
    },
    markup: (Component, props = {}) => renderToStaticMarkup(createElement(Component, props)),
    markupInHunt: (Component, props, hunt) => renderToStaticMarkup(createElement(inHunt(hunt), null, createElement(Component, props))),
  };
}

/** Records each call's arguments, for checking what a click asked the game to do. */
export function spy() {
  const calls = [];
  const fn = (...args) => { calls.push(args); };
  fn.calls = calls;
  return fn;
}

/** A mimic to render with (a Lesser chest), with any fields replaced. */
export const mimic = (over = {}) => ({
  id: 'mimic', name: 'Testy', startingType: 'Lesser', tier: 'Lesser', mass: 6, plausibility: 3, adhesion: 3, patience: 3, baseAllure: 3,
  assimilationPoints: 0, forms: [{ formId: 'lesser_chest', name: 'Chest', tier: 'Lesser', learned: true }], activeFormIndex: 0, currentAppearance: {},
  learnedMaterials: [], learnedTraits: [], rareLocation: null, burnedLocations: [], burnedForms: [],
  adventurersMet: [], adventurersEaten: [], formsUsed: [], formHuntCounts: {}, locationHuntCounts: {},
  huntsSurvived: 0, huntsFailed: 0, closestCall: 0, conversions: 0, mimicsConsumed: 0, partyMembersEaten: 0,
  biggestMeal: null, giantsConsumedWhole: [], titanicFeastReached: false, downWithTheShipReached: false, lifetimeApEarned: 0,
  sidebarView: 'map',
  ...over,
});

/**
 * Save a mimic to the (in-memory) database the way character creation does, with any fields
 * replaced; returns it as stored (with its id). Saves a moment apart, so "newest first" is defined.
 */
export async function saveMimic(db, over = {}) {
  await new Promise((r) => setTimeout(r, 2));
  return db.entities.MimicCharacter.create({
    name: 'Testy', tier: 'Lesser', startingType: 'Lesser', mass: 6, digestiveCapacity: 5, patience: 3, adhesion: 3, plausibility: 3,
    assimilationPoints: 0, baseAllure: 3, forms: [{ formId: 'lesser_chest', name: 'Chest', tier: 'Lesser', learned: true }, { formId: 'lesser_crate', name: 'Crate', tier: 'Lesser', learned: true }],
    activeFormIndex: 0, learnedMaterials: ['Oak', 'Iron', 'Cowhide'], learnedTraits: [], currentAppearance: { primaryMaterials: ['Oak'] }, isActive: true,
    ...over,
  });
}

/** Run `fn` with the database emptied, then put back whatever was there. */
export async function withEmptyDb(storage, fn) {
  const saved = new Map(storage);
  storage.clear();
  try {
    return await fn();
  } finally {
    storage.clear();
    for (const [k, v] of saved) storage.set(k, v);
  }
}

/** Pin the game's date (as the dev build's mm.debugDate does) to "month-day", or clear it. */
export function onDate(storage, monthDay) {
  if (monthDay) storage.set('mm.debugDate', monthDay);
  else storage.delete('mm.debugDate');
}

/**
 * The visible text, without tags: inline tags (span, b, i…) join their words as the browser would,
 * other tags break them. Entities are decoded for the common few React escapes.
 */
export function text(html) {
  return html.replace(/<\/?(span|b|i|em|strong|a)(\s[^>]*)?>/g, '').replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

/** How many times `needle` appears. */
export const count = (html, needle) => html.split(needle).length - 1;

/** Every value of an attribute (e.g. all the `title`s), decoded. */
export function attrs(html, name) {
  return [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map((m) => text(m[1]));
}

/**
 * The room map's cells, by room name: each one's opening tag (its data-* flags) and contents.
 * Relies on RoomMap's markup: every cell starts with `<div class="room-cell"`.
 */
export function roomCells(html) {
  const cells = {};
  for (const chunk of html.split('<div class="room-cell"').slice(1)) {
    const name = text(chunk.match(/<p class="room-name">([^<]*)<\/p>/)?.[1] ?? '');
    cells[name] = { tag: chunk.slice(0, chunk.indexOf('>')), html: chunk };
  }
  return cells;
}
