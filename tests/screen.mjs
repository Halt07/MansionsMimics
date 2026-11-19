/**
 * Helpers for screen tests: render a component to HTML (react-dom/server, no browser) and look
 * through what came out. Not a test file itself (the runner only runs *.test.mjs).
 *
 *   const s = await screen(load);
 *   const html = s.render(RoomMap, { location, mimicRoom });
 *   const html = s.inHunt(PartyCard, { onToggle() {} }, s.huntState(character, hunt));
 *
 * Checks are on the markup as text: the classes, data attributes and titles the components set
 * (the same ones index.css styles and the browser shows on hover).
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export async function screen(load) {
  const { HuntContext, huntState } = await load('/src/components/game/hunt/HuntContext.ts');
  const render = (Component, props = {}) => renderToStaticMarkup(createElement(Component, props));
  return {
    render,
    huntState,
    /** Render inside the game screen's HuntContext (a value from huntState). */
    inHunt: (Component, props, hunt) =>
      renderToStaticMarkup(createElement(HuntContext.Provider, { value: hunt }, createElement(Component, props))),
  };
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
