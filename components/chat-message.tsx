"use client"

import { useMemo, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"

interface ChatMessageProps {
  role: "bot" | "user"
  time?: string
  image?: string
  children?: ReactNode
  stream?: boolean
  onStreamComplete?: () => void
}

/** Renders bot text as proper Markdown (bold, lists, headers, etc.) */
function BotMarkdown({ text }: { text: string }) {
  return (
    <div className="bot-markdown">
      <ReactMarkdown
        components={{
          // Headers
          h1: ({ children }) => (
            <h3 className="text-base font-bold mt-3 mb-1.5 text-primary-foreground">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 className="text-[15px] font-bold mt-2.5 mb-1 text-primary-foreground">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="text-sm font-bold mt-2 mb-1 text-primary-foreground">
              {children}
            </h5>
          ),
          h4: ({ children }) => (
            <h6 className="text-sm font-semibold mt-2 mb-0.5 text-primary-foreground/90">
              {children}
            </h6>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          ),
          // Bold
          strong: ({ children }) => (
            <strong className="font-bold text-white/95">{children}</strong>
          ),
          // Italic
          em: ({ children }) => (
            <em className="italic text-primary-foreground/85">{children}</em>
          ),
          // Unordered lists
          ul: ({ children }) => (
            <ul className="mb-2 ml-1 space-y-1 list-none last:mb-0">{children}</ul>
          ),
          // Ordered lists
          ol: ({ children }) => (
            <ol className="mb-2 ml-1 space-y-1 list-none last:mb-0 [counter-reset:item]">{children}</ol>
          ),
          // List items
          li: ({ children, ...props }) => {
            // Check if the parent is an ordered list by looking at the index
            const ordered = props.node?.position?.start?.line !== undefined && props.node?.properties?.className === undefined
            return (
              <li className="flex gap-2 items-start text-sm leading-relaxed">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-300/70" />
                <span className="flex-1">{children}</span>
              </li>
            )
          },
          // Inline code
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-")
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-lg bg-black/25 px-3 py-2 my-2 text-xs font-mono text-emerald-100 leading-relaxed">
                  {children}
                </code>
              )
            }
            return (
              <code className="rounded-md bg-black/20 px-1.5 py-0.5 text-xs font-mono text-emerald-100">
                {children}
              </code>
            )
          },
          // Code blocks
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg bg-black/25 text-xs last:mb-0">
              {children}
            </pre>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-emerald-300/50 pl-3 text-primary-foreground/80 italic last:mb-0">
              {children}
            </blockquote>
          ),
          // Horizontal rule
          hr: () => (
            <hr className="my-3 border-primary-foreground/20" />
          ),
          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-emerald-300/50 underline-offset-2 hover:decoration-emerald-200 transition-colors"
            >
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

/** Renders user text as plain paragraphs */
function UserText({ text }: { text: string }) {
  return <p className="whitespace-pre-line">{text}</p>
}

export function ChatMessage({
  role,
  time,
  image,
  children,
  stream = false,
  onStreamComplete,
}: ChatMessageProps) {
  const isBot = role === "bot"
  const hasText = children !== undefined && children !== null && children !== ""
  const textContent = typeof children === "string" ? children : null

  return (
    <div className={cn("flex w-full", isBot ? "justify-start" : "justify-end")}>
      <div className={cn("flex max-w-[88%] flex-col sm:max-w-[80%]", isBot ? "items-start" : "items-end")}>
        <div
          className={cn(
            "overflow-hidden text-pretty rounded-2xl text-sm leading-relaxed shadow-2xs",
            isBot
              ? "rounded-tl-xs bg-primary text-primary-foreground font-normal"
              : "rounded-tr-xs bg-card text-card-foreground ring-1 ring-border/80",
            hasText && !image && "px-4 py-3",
            image && "p-2",
          )}
        >
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image || "/placeholder.svg"}
              alt="Uploaded crop photo"
              className="max-h-60 w-full rounded-xl object-cover mb-2"
            />
          )}
          {hasText && (
            <div className={image ? "px-1 pb-1" : undefined}>
              {isBot && textContent ? (
                <BotMarkdown text={textContent} />
              ) : (
                <UserText text={textContent || String(children)} />
              )}
            </div>
          )}
        </div>
        {time && (
          <time
            suppressHydrationWarning
            className="mt-1 px-1 text-[10px] tabular-nums text-muted-foreground"
          >
            {time}
          </time>
        )}
      </div>
    </div>
  )
}
