import type { PageName } from "@/pages.config";

/** A page name, optionally with a query string: "Codex" or "Game?characterId=…". */
export type PageTarget = PageName | `${PageName}?${string}`;

export function createPageUrl(pageName: PageTarget): string {
  return '/' + pageName.replace(/ /g, '-');
}
