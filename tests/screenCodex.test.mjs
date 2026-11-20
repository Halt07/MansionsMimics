// The Codex page (src/pages/Codex.tsx) with React Testing Library and the in-memory database:
// every section opens, the pill picks whose discoveries to read (remembered, or set by opening
// the Codex from a hunt), and the Locations and Forms sections. (The adventurer and location
// entries have their own tests.) The date is pinned, for the seasonal forms.
import { createElement } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setup, saveMimic, withEmptyDb, onDate } from './screen.mjs';

export default async function ({ gameData: m, db: dbModule, storage, load, ok }) {
  const s = await setup(load);
  const { default: Codex } = await load('/src/pages/Codex.tsx');
  const { db } = dbModule;
  const user = userEvent.setup();
  const reads = (t) => document.body.textContent.includes(t);
  const section = (name) => screen.getByRole('button', { name });
  const pill = () => screen.queryByRole('combobox', { name: 'Show the Codex as known by' });
  const open = async (url = '/Codex', mimics = 0) => {
    window.history.pushState({}, '', url);
    s.show(() => createElement(MemoryRouter, null, createElement(Codex)));
    if (mimics) await waitFor(() => { if (!pill()) throw new Error('loading'); });
    else await new Promise((r) => setTimeout(r, 20));
  };
  const counts = (label) => document.body.textContent.match(new RegExp(`${label} (\\d+)/`))?.[1];

  try {
    onDate(storage, '5-15');
    await withEmptyDb(storage, async () => {
      // ---------- every section ----------
      await open();
      ok(screen.getByRole('heading', { level: 2, name: 'Mansions & Mimics' }), 'the Codex opens on the overview');
      ok(!pill(), 'no mimics yet: nobody to choose between');
      ok(screen.getByRole('link', { name: 'Home' }).getAttribute('href') === '/Home', 'the Home link is named for screen readers, and goes home');
      const headings = { Overview: 'Mansions & Mimics', Tiers: 'Mimic Tiers', Forms: 'Forms', Materials: 'Materials', Traits: 'Traits',
        Adventurers: 'Adventurer Templates', Locations: 'Hunt Locations', Mechanics: 'Detailed Mechanics' };
      const opened = [];
      for (const [name, heading] of Object.entries(headings)) {
        await user.click(section(name));
        opened.push(screen.queryByRole('heading', { level: 2, name: heading }) !== null && section(name).className.includes('bg-primary/10'));
      }
      ok(opened.every(Boolean), 'each of the eight sections opens from the side, marked as the one open');
      ok(section('Mechanics').getAttribute('aria-current') === 'true' && !section('Overview').hasAttribute('aria-current'), '…and announced as the current one');
      await user.click(section('Tiers'));
      ok(m.TIER_ORDER.every((t) => reads(t)) && !m.BRANCH_TIERS.some((t) => reads(t)), 'the tiers: Minor to Apex, and not a word about the hidden branch tiers');

      // ---------- whose discoveries ----------
      const [a, b] = m.ADVENTURER_TEMPLATES.filter((x) => !x.minTier);
      const scout = await saveMimic(db, { name: 'Scout', adventurersMet: [a.name], adventurersEaten: [a.name], locationHuntCounts: { manor: 2 } });
      const glutton = await saveMimic(db, { name: 'Glutton', tier: 'Grand', mass: 60, adventurersMet: [b.name] });
      await open('/Codex', 2);
      ok([...pill().options].map((o) => o.textContent).join() === 'All mimics,Glutton · Grand,Scout · Lesser', 'the pill: all mimics, or each one');
      ok(pill().value === 'all', '…all of them to begin with');
      await user.click(section('Adventurers'));
      ok(counts('Met') === '2' && counts('Eaten') === '1', "all mimics: everything any of them has met or eaten");
      await user.selectOptions(pill(), scout.id);
      ok(counts('Met') === '1' && reads('Scout has learned'), 'choosing one mimic: only what it knows');
      ok(storage.get('codex.viewing') === scout.id, '…and the choice is remembered');
      await open('/Codex', 2);
      ok(pill().value === scout.id, 'reopening the Codex: still reading for that mimic');
      await open(`/Codex?characterId=${glutton.id}`, 2);
      ok(pill().value === glutton.id, 'opened from a hunt: reading for the mimic hunting');
      storage.set('codex.viewing', 'a-deleted-mimic');
      await open('/Codex', 2);
      ok(pill().value === 'all', 'a mimic since deleted: back to all of them');

      // ---------- hunting grounds ----------
      await user.selectOptions(pill(), scout.id);
      await user.click(section('Locations'));
      const lesserGrounds = m.LOCATIONS.filter((l) => m.locationKnowledge(l, [scout]) !== 'unknown').length;
      ok(counts('Found') === String(lesserGrounds) && counts('Mapped') === '1', 'Locations: the grounds this mimic has found, and the one it has hunted (mapped)');
      await user.selectOptions(pill(), glutton.id);
      ok(Number(counts('Found')) > lesserGrounds && counts('Mapped') === '0', '…a bigger mimic has found more, but mapped none');

      // ---------- achievements: the hidden ones only once earned ----------
      const achievements = async () => { await user.click(section('Mechanics')); await user.click(screen.getByRole('button', { name: 'Achievements' })); };
      await achievements();
      ok(reads('Peak of the Apex') && !reads('Ruler of All Mimics') && !reads('Primordial'), 'the Codex lists the achievements, but not the hidden ones');
      const king = await saveMimic(db, { name: 'King', tier: 'Apex', mass: 100, branchTier: 'Sovereign', sovereignReached: true });
      await open(`/Codex?characterId=${king.id}`, 3);
      await achievements();
      ok(reads('Ruler of All Mimics') && !reads('Primordial'), 'reading for a mimic that has been Sovereign: Ruler of All Mimics is listed, the others still hidden');
      await user.selectOptions(pill(), scout.id);
      ok(!reads('Ruler of All Mimics'), '…and hidden again for a mimic that hasn\'t');
    });

    // ---------- the season's forms ----------
    await open();
    await user.click(section('Forms'));
    ok(!screen.queryByRole('button', { name: /Current Season/ }), 'out of season: no seasonal tab (the forms stay a surprise)');
    ok(m.MASTER_FORMS.Minor.every((f) => screen.getByRole('heading', { level: 3, name: f.name })), 'Minor forms to begin with');
    await user.click(section('Lesser'));
    ok(section('Lesser').getAttribute('aria-pressed') === 'true' && section('Minor').getAttribute('aria-pressed') === 'false', 'the tier shown is announced as pressed');
    ok(m.MASTER_FORMS.Lesser.every((f) => screen.getByRole('heading', { level: 3, name: f.name })), 'each tier shows its forms');
    onDate(storage, '10-31');
    await open();
    await user.click(section('Forms'));
    await user.click(screen.getByRole('button', { name: `${m.HOLIDAYS.halloween.icon} Current Season` }));
    const halloween = m.SEASONAL_FORMS.filter((f) => f.holiday === 'halloween');
    ok(halloween.every((f) => screen.getByRole('heading', { level: 3, name: f.name })) && reads(`These shapes can be chosen until ${m.seasonEnd('halloween')}`),
      "on All Hallows' Eve: a Current Season tab with its forms, and until when");
  } finally {
    onDate(storage, null);
    window.history.pushState({}, '', '/');
  }
}
