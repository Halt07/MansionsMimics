import type { ReactNode } from "react";
import type { PageName } from "@/pages.config";

interface LayoutProps {
  children: ReactNode;
  currentPageName: PageName;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
