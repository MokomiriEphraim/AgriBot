import { cn } from "@/lib/utils"

export function AgriBotIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-full", className)}
    >
      <defs>
        <linearGradient id="botGrad" x1="6" y1="12" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#15803d" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="12" y1="18" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#064e3b" />
          <stop offset="1" stopColor="#022c22" />
        </linearGradient>
        <linearGradient id="leafGrad" x1="20" y1="2" x2="34" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4ade80" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>
      </defs>

      {/* Sprout Antenna */}
      <path
        d="M24 15V9M24 9C24 9 27.5 4 34 5C34 10 29.5 12 24 9ZM24 11C24 11 20.5 7 15.5 8C15.5 12 19.5 13 24 11Z"
        stroke="#4ade80"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="url(#leafGrad)"
      />

      {/* Robot Head Body */}
      <rect
        x="7"
        y="15"
        width="34"
        height="26"
        rx="10"
        fill="url(#botGrad)"
        stroke="#86efac"
        strokeWidth="1.5"
      />

      {/* Robot Screen Face */}
      <rect
        x="11"
        y="19"
        width="26"
        height="18"
        rx="7"
        fill="url(#screenGrad)"
        stroke="#10b981"
        strokeWidth="1"
      />

      {/* Glowing Eyes */}
      <circle cx="18" cy="27" r="2.8" fill="#4ade80" />
      <circle cx="30" cy="27" r="2.8" fill="#4ade80" />
      <circle cx="19" cy="26" r="1" fill="#f0fdf4" />
      <circle cx="31" cy="26" r="1" fill="#f0fdf4" />

      {/* Smile */}
      <path
        d="M21 31.5C22.5 33 25.5 33 27 31.5"
        stroke="#4ade80"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Cute Cheek Glow */}
      <circle cx="14.5" cy="30.5" r="1.2" fill="#34d399" opacity="0.7" />
      <circle cx="33.5" cy="30.5" r="1.2" fill="#34d399" opacity="0.7" />
    </svg>
  )
}

export function AgriBotAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-950/80 p-1 ring-1 ring-emerald-500/30 shadow-sm",
        className,
      )}
    >
      <AgriBotIcon />
    </span>
  )
}
