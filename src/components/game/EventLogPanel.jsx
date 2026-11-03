import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

const EVENT_STYLES = {
  attack:   { prefix: "⚔", color: "text-red-400" },
  consume:  { prefix: "🔒", color: "text-primary" },
  stealth:  { prefix: "👁", color: "text-muted-foreground" },
  allure:   { prefix: "✨", color: "text-yellow-400" },
  escape:   { prefix: "💨", color: "text-orange-400" },
  alert:    { prefix: "⚠", color: "text-red-400" },
  info:     { prefix: "•", color: "text-muted-foreground" },
  success:  { prefix: "✓", color: "text-green-400" },
  evolve:   { prefix: "↑", color: "text-primary" },
  flaw:     { prefix: "🔍", color: "text-orange-400" },
  system:   { prefix: "—", color: "text-muted-foreground/60" },
};

export default function EventLogPanel({ events = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
            const style = EVENT_STYLES[event.type] || EVENT_STYLES.info;
            return (
              <div key={i} className={`text-xs flex gap-2 leading-relaxed ${i === events.length - 1 ? "opacity-100" : "opacity-70"}`}>
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