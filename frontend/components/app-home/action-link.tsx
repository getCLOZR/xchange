import Link from "next/link";

import { cn } from "@/lib/utils";

interface ActionLinkProps {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
  className?: string;
}

export function ActionLink({
  title,
  description,
  href,
  comingSoon = false,
  className,
}: ActionLinkProps) {
  const inner = (
    <>
      <span className="flex items-center gap-2">
        <span className="text-[15px] font-medium text-clozr-primary tracking-tight">
          {title}
        </span>
        {comingSoon ? (
          <span className="text-[10px] uppercase tracking-widest text-clozr-muted border border-clozr-border rounded px-1.5 py-0.5">
            Soon
          </span>
        ) : null}
      </span>
      <span className="mt-1.5 block text-sm text-clozr-secondary leading-relaxed max-w-sm">
        {description}
      </span>
    </>
  );

  const baseClass = cn(
    "group block rounded-lg border border-transparent px-4 py-5 text-left transition-colors",
    comingSoon
      ? "cursor-default"
      : "hover:border-clozr-border hover:bg-clozr-surface-soft",
    className
  );

  if (comingSoon || !href) {
    return <div className={baseClass}>{inner}</div>;
  }

  return (
    <Link href={href} className={baseClass}>
      {inner}
    </Link>
  );
}
