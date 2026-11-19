import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GameEvent, GameEventType } from "@/data/vocabulary";

// A Record over every event type, so a new type can't be added without a style
const EVENT_STYLES: Record<GameEventType, { prefix: string; color: string }> = {
  attack:   { prefix: "⚔", color: "text-red-400" },
  consume:  { prefix: "🍗", color: "text-primary" },
  stealth:  { prefix: "👁", color: "text-muted-foreground" },
  allure:   { prefix: "✨", color: "text-yellow-400" },
  escape:   { prefix: "💨", color: "text-orange-400" },
  alert:    { prefix: "⚠", color: "text-red-400" },
  info:     { prefix: "•", color: "text-muted-foreground" },
  evolve:   { prefix: "↑", color: "text-primary" },
  flaw:     { prefix: "🔍", color: "text-orange-400" },
  system:   { prefix: "—", color: "text-muted-foreground/60" },
};

export default function EventLogPanel({ events = [] }: { events?: GameEvent[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Show the newest line by scrolling the log's own area, not the page: scrollIntoView would
  // also scroll the window (on a phone, pulling you away from the status and map each turn)
  useEffect(() => {
    const viewport = bottomRef.current?.closest<HTMLElement>("[data-radix-scroll-area-viewport]");
    viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [events]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden h-full flex flex-col">
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-subtle-pulse" />
        <span className="text-xs font-cinzel text-muted-foreground tracking-widest uppercase">Event Log</span>
      </div>
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-1.5">
          {events.length === 0 && (
            <p className="text-xs text-muted-foreground/50 flavor-text italic text-center py-4">
              All is quiet... for now.
            </p>
          )}
          {events.map((event, i) => {
            const style = EVENT_STYLES[event.type];
            return (
              <div key={i} className={`log-line text-xs flex gap-2 leading-relaxed ${i === events.length - 1 ? "opacity-100" : "opacity-70"}`}>
                <span className={`${style.color} shrink-0 font-bold`}>{style.prefix}</span>
                <span className={`${style.color}`}>{event.message}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}