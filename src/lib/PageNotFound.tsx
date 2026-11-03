import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
      <div className="mb-6 text-8xl select-none">📦</div>
      <h1 className="text-4xl font-cinzel text-primary mb-3">Room Not Found</h1>
      <p className="flavor-text text-muted-foreground text-lg mb-8 max-w-md">
        The door you sought leads nowhere. Or perhaps... it leads somewhere you were not meant to find.
      </p>
      <Link
        to={createPageUrl("Home")}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/80 transition-colors"
      >
        Return to Safety
      </Link>
    </div>
  );
}