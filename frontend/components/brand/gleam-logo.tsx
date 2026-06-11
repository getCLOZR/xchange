import Image from "next/image";

import { cn } from "@/lib/utils";

/** Cropped wordmark asset dimensions (public/gleam-logo.png). */
const LOGO_ASPECT = 761 / 313;

interface GleamLogoProps {
  /** Render height in px; width follows wordmark aspect ratio. */
  height?: number;
  className?: string;
  priority?: boolean;
  /** Light wordmark for dark backgrounds (developer console). */
  inverted?: boolean;
}

export function GleamLogo({
  height = 28,
  className,
  priority = false,
  inverted = false,
}: GleamLogoProps) {
  const width = Math.round(height * LOGO_ASPECT);

  return (
    <Image
      src="/gleam-logo.png"
      alt="Gleam"
      width={width}
      height={height}
      priority={priority}
      className={cn(
        "object-contain shrink-0",
        inverted && "brightness-0 invert",
        className
      )}
    />
  );
}
