"use client";

import { type ComponentProps, useMemo } from "react";
import { cn } from "@/lib/utils";
import { take } from "../utils/range";

export interface Segment {
  text: string;
  mono?: boolean;
}

export function StreamingText({
  segments,
  count,
  streaming,
  className,
  tintClassName,
  caretClassName,
  ...props
}: Omit<
  ComponentProps<"p">,
  "children" | "segments" | "count" | "streaming"
> & {
  segments: Segment[];
  count: number;
  streaming: boolean;
  tintClassName?: string;
  caretClassName?: string;
}) {
  const words = useMemo(
    () =>
      segments.flatMap((segment) =>
        segment.text
          .split(" ")
          .map((word) => ({ word, mono: segment.mono ?? false })),
      ),
    [segments],
  );
  const shown = take(words, count);

  return (
    <p
      data-slot="streaming-text"
      className={cn(
        "min-h-0 text-sm leading-relaxed text-pretty",
        className,
      )}
      {...props}
    >
      {shown.map(({ word, mono: isMono }, i) => {
        const fresh = streaming && shown.length - 1 - i < 2;
        return (
          <span
            key={i}
            className="fade-in animate-in fill-mode-both duration-500 motion-reduce:animate-none"
          >
            <span
              className={cn(
                "transition-colors duration-700 motion-reduce:transition-none",
                fresh && (tintClassName ?? "text-emerald-200 dark:text-emerald-300 font-semibold drop-shadow-sm"),
                isMono &&
                  "bg-foreground/[0.06] rounded-md px-1.5 py-0.5 font-mono text-[0.85em]",
              )}
            >
              {word}
            </span>{" "}
          </span>
        );
      })}
      {streaming && shown.length > 0 && (
        <span
          aria-hidden
          className={cn(
            "-mb-0.5 ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full",
            caretClassName ?? "bg-emerald-200 dark:bg-emerald-300",
          )}
        />
      )}
    </p>
  );
}
