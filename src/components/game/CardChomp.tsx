import { useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** How often a hover makes a card bite, unless a card says otherwise. */
export const CARD_CHOMP_CHANCE = 0.05;

/**
 * How a card bites: "fast" snaps its jaws shut; "slow" opens them halfway and holds, baring its
 * teeth (.slow-jaws in index.css).
 */
export type ChompSpeed = "fast" | "slow";

/**
 * Lets any element take a quick bite: on hover there's a `chance` it snaps a small pair of jaws
 * shut inside itself (the jaws are .card-jaws in index.css). Spread `onMouseEnter` onto the
 * element, render `jaws` as its last child, and give it `position: relative`. A bite already in
 * progress finishes before another can start.
 */
export function useCardChomp(
  chance: number = CARD_CHOMP_CHANCE, speed: ChompSpeed = "fast",
): { onMouseEnter: () => void; jaws: ReactNode } {
  const [biting, setBiting] = useState(false);
  const onMouseEnter = () => {
    if (!biting && Math.random() < chance) setBiting(true);
  };
  const jaws = biting
    ? <span className={cn("card-jaws", speed === "slow" && "slow-jaws")} aria-hidden onAnimationEnd={() => setBiting(false)} />
    : null;
  return { onMouseEnter, jaws };
}

/** A Card that might bite when hovered (see useCardChomp). */
export function ChompCard({ chance, speed, className, children, onMouseEnter, ...props }: ComponentProps<typeof Card> & {
  chance?: number;
  speed?: ChompSpeed;
}) {
  const chomp = useCardChomp(chance, speed);
  return (
    <Card
      {...props}
      className={cn("relative", className)}
      onMouseEnter={(e: MouseEvent<HTMLDivElement>) => { chomp.onMouseEnter(); onMouseEnter?.(e); }}
    >
      {children}
      {chomp.jaws}
    </Card>
  );
}
