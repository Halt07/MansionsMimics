/** A small keycap showing a keyboard shortcut. Hidden on touch screens, where there's no keyboard. */
export default function KeyHint({ k, className = "" }: { k: string; className?: string }) {
  return (
    <kbd
      aria-hidden
      className={`key-hint hidden [@media(hover:hover)_and_(pointer:fine)]:inline-flex ${className}`}
    >
      {k}
    </kbd>
  );
}
