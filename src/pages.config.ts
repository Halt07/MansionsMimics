/**
 * Page routing configuration.
 *
 * Each entry in PAGES becomes a route at /<Name> (see App.tsx), and `mainPage` is
 * also served at /. To add a page, create it in ./pages and register it here.
 */
import CharacterCreation from './pages/CharacterCreation';
import Codex from './pages/Codex';
import Game from './pages/Game';
import Home from './pages/Home';
import Layout from './Layout';

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
