/**
 * Page routing configuration.
 *
 * Each entry in PAGES becomes a route at /<Name> (see App.tsx), and `mainPage` is
 * also served at /. To add a page, create it in ./pages and register it here.
 *
 * Home loads with the app; the other pages are lazy-loaded, each in its own chunk, so the
 * first screen doesn't wait for the game, the Codex or character creation (App.tsx shows a
 * fallback while one loads).
 */
import { lazy } from 'react';
import Home from './pages/Home';
import Layout from './Layout';

const CharacterCreation = lazy(() => import('./pages/CharacterCreation'));
const Codex = lazy(() => import('./pages/Codex'));
const Game = lazy(() => import('./pages/Game'));

export const PAGES = {
  CharacterCreation,
  Codex,
  Game,
  Home,
};

export type PageName = keyof typeof PAGES;

/** The page served at "/". */
const mainPage: PageName = "Home";

export const pagesConfig = {
  mainPage,
  Pages: PAGES,
  Layout,
};
