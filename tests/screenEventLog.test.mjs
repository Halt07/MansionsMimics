// The event log (src/components/game/EventLogPanel.tsx), with React Testing Library: each line
// styled by its kind, and new lines brought into view by scrolling the log's own area only, never
// the page (on a phone the log sits below everything else).
import { createElement } from 'react';
import { screen } from '@testing-library/react';
import { setup } from './screen.mjs';

export default async function ({ load, ok }) {
  const s = await setup(load);
  const { default: EventLogPanel } = await load('/src/components/game/EventLogPanel.tsx');
  const line = (type, message) => ({ type, message, turn: 1 });

  // Watch what gets scrolled
  const proto = window.Element.prototype;
  const [scrollTo, scrollIntoView] = [proto.scrollTo, proto.scrollIntoView];
  const scrolled = [];
  proto.scrollTo = function (opts) { scrolled.push({ el: this, opts }); };
  proto.scrollIntoView = function () { scrolled.push({ el: this, intoView: true }); };
  try {
    const { rerender } = s.show(EventLogPanel, { events: [] });
    ok(screen.getByText('All is quiet... for now.'), 'nothing yet: all is quiet');
    scrolled.length = 0;
    rerender(createElement(EventLogPanel, { events: [line('info', 'You settle in.'), line('alert', 'A sound!')] }));
    const lines = [...document.querySelectorAll('.log-line')].map((l) => l.textContent);
    ok(lines.join('|') === '•You settle in.|⚠A sound!', 'each line, marked by its kind');
    ok(document.querySelectorAll('.log-line')[1].className.includes('opacity-100') && document.querySelectorAll('.log-line')[0].className.includes('opacity-70'), 'the newest line stands out');
    ok(scrolled.length === 1 && scrolled[0].el.hasAttribute('data-radix-scroll-area-viewport') && scrolled[0].opts.behavior === 'smooth', 'a new line: the log scrolls its own area down to it');
    ok(!scrolled.some((x) => x.intoView), '…without scrolling the page');
  } finally {
    proto.scrollTo = scrollTo;
    proto.scrollIntoView = scrollIntoView;
  }
}
