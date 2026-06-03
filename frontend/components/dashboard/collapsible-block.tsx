"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface CollapsibleBlockProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleBlock({
  title,
  defaultOpen = true,
  children,
  className,
}: CollapsibleBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-md border border-border/80", className)}>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[10px] uppercase tracking-wide text-muted-foreground hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        {title}
      </button>
      {open && <div className="px-2 pb-2">{children}</div>}
    </div>
  );
}
