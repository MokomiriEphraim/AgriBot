/**
 * South African language support for AgriBot.
 *
 * AgriBot mirrors the farmer's own language. The 11 entries below are the
 * written official languages of South Africa. The 12th, South African Sign
 * Language, has no written form and is out of scope for a text assistant.
 *
 * Design note: the model does the real language mirroring (see
 * `buildLanguageRule`), because gpt-4o handles code-switching and dialect far
 * better than any keyword heuristic. `detectLanguage` exists only to feed the
 * model an explicit hint, which noticeably improves reliability on short or
 * ambiguous messages ("molo", "sawubona", "yebo"). It is approximate by
 * design — never treat it as authoritative, only as a hint.
 */

export const SA_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "af", label: "Afrikaans" },
  { code: "nr", label: "isiNdebele" },
  { code: "xh", label: "isiXhosa" },
  { code: "zu", label: "isiZulu" },
  { code: "nso", label: "Sepedi (Northern Sotho)" },
  { code: "st", label: "Sesotho" },
  { code: "ss", label: "siSwati" },
  { code: "tn", label: "Setswana" },
  { code: "ts", label: "isiXitsonga (Tsonga)" },
  { code: "ve", label: "Tshivenda" },
] as const

export type SaLanguageCode = (typeof SA_LANGUAGES)[number]["code"]

const DEFAULT_LANGUAGE: SaLanguageCode = "en"

const LANGUAGE_BY_CODE = new Map(SA_LANGUAGES.map((l) => [l.code, l]))

export function languageLabel(code: SaLanguageCode): string {
  return LANGUAGE_BY_CODE.get(code)?.label ?? "English"
}

/**
 * High-frequency function words per language. Deliberately short and
 * deliberately restricted to words that are near-unambiguous in isolation —
 * "ka", "ku" and "u" are useless on their own, so they are not included.
 */
const MARKERS: Record<SaLanguageCode, string[]> = {
  // English needs its own markers. Without them it scores a structural zero and
  // a single ambiguous foreign token ("my tomato") drags the whole message into
  // Afrikaans.
  en: [
    "the", "is", "are", "how", "what", "why", "my", "for", "and", "with",
    "can", "should", "help", "plant", "when", "which", "need", "want",
  ],
  af: [
    "die", "nie", "asseblie", "vandag", "wat", "hoeveel", "waarom",
    "my", "jy", "julle", "gesondheid", "plaas", "gehelp", "baie", "water",
    "hoe", "kan", "ek", "is",
  ],
  nr: [
    "kakhulu", "isilayiso", "ukudla", "amakhono", "umhlabanyeni", "njengo",
    "ngicela", "ngiyazi", "impilo", "ezinyathelo",
  ],
  // isiXhosa/isiZulu inflect nouns with class prefixes (i-, ii-, ama-, isi-,
  // uku- and the verb reflexive "u-"), so "ithanga" also surfaces as
  // "iithanga" and "ubuthuthu" as "zinokubuthuthu". The `*` prefix marks a
  // marker as a stem (trailing boundary only) — see MARKER_PATTERNS.
  xh: [
    "*thanga", "ncedo", "ukutya", "impumelele", "kufuneka", "phumela",
    "ndiyabulela", "ngoba", "amasi", "inisa", "uxa", "*buthuthu", "*hlahla",
  ],
  zu: [
    "ngicela", "ngiyazi", "ngiyabonga", "ukuthi", "kufanele", "isicelo",
    "yebo", "ngoba", "*hlahla", "ukunake", "impili", "yini", "kuphi",
    "usuku", "inyoni", "isifo", "ukutya", "kakhulu",
  ],
  nso: ["mma", "tse", "phapandi", "butha", "gore o", "sehlengwa", "hlama"],
  st: ["kajeno", "bana", "wena", "ntle", "hodima", "tsebetso", "buthi",
    "lehloko", "empa", "hobane", "bophelo", "tsatsi",
  ],
  ss: ["ngubani", "yini", "kuphi", "tingane", "khosi", "imphumelelo", "ludla",
    "yena", "kakhulu", "ematsatfu", "kusuka",
  ],
  tn: ["ditho", "tsela", "bontlha", "tlhanye", "seka", "kwa", "moo"],
  ts: ["swichudeni", "hikuva", "ntirho", "ndzi", "waxhi", "vula", "anyika"],
  ve: ["vhuthu", "vhiki", "vhududu", "tshedza", "vhana", "pula", "ndi",
    "thandela", "vho",
  ],
}

/**
 * Compiled once at module load.
 *
 * Word-boundary matching avoids the substring traps that plague short markers
 * ("kwa" must not fire on "kwanele").
 *
 * isiXhosa/isiZulu inflect nouns and verbs with class prefixes (i-, ii-, ama-,
 * isi-, uku- and the reflexive "u-"), so a given stem surfaces as "ithanga",
 * "iithanga" and "zinokubuthuthu". For those, a leading word boundary is
 * exactly wrong: the stem is *always* preceded by a letter. Mark a marker with
 * a leading `*` to require only a trailing boundary and match it as a stem.
 */
const MARKER_PATTERNS: Record<SaLanguageCode, RegExp[]> = (
  Object.entries(MARKERS) as [SaLanguageCode, string[]][]
).reduce(
  (acc, [code, markers]) => {
    acc[code] = markers.map((marker) => {
      const isStem = marker.startsWith("*")
      const body = (isStem ? marker.slice(1) : marker).trim()
      const escaped = body.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const lead = isStem ? "" : "(?<![\\p{L}\\p{M}])"
      return new RegExp(`${lead}${escaped}(?![\\p{L}\\p{M}])`, "u")
    })
    return acc
  },
  {} as Record<SaLanguageCode, RegExp[]>,
)

/**
 * Minimum marker hits before a non-English language is reported at all.
 *
 * Closely-related languages (isiZulu/isiNdebele, the Sotho family) share
 * vocabulary, so a single token is not enough evidence. Falling back to `en`
 * merely loses the hint — the model still reads the actual message and mirrors
 * it correctly — whereas a wrong confident hint would contradict the message
 * the model can plainly see.
 */
const MIN_SCORE = 2

/**
 * Best-effort language guess for a single message. Returns `en` when nothing
 * clears the threshold, which is the correct default for an English-first
 * codebase.
 *
 * Known limitation: the closely-related language pairs (isiZulu/isiNdebele,
 * and the Sotho family) share too much vocabulary to separate reliably with a
 * word list, so short messages in those languages may be hinted as a sibling
 * or fall back to `en`. That is acceptable because this is only a hint — the
 * model receives the actual message and does the real mirroring. The failure
 * mode is a slightly wrong hint, never a wrong reply.
 */
export function detectLanguage(text: string): SaLanguageCode {
  if (!text || text.trim().length === 0) return DEFAULT_LANGUAGE

  const haystack = text.toLowerCase()

  let best: SaLanguageCode = DEFAULT_LANGUAGE
  let bestScore = 0
  let bestWeight = -1

  for (const [code, patterns] of Object.entries(MARKER_PATTERNS) as [
    SaLanguageCode,
    RegExp[],
  ][]) {
    let score = 0
    let weight = 0
    patterns.forEach((re, i) => {
      if (re.test(haystack)) {
        score += 1
        weight += MARKERS[code][i].length
      }
    })

    // Deterministic tie-break: more matched-marker characters wins, then
    // alphabetical by code. Without this the result depends on object key order.
    const better =
      score > bestScore ||
      (score === bestScore && weight > bestWeight) ||
      (score === bestScore && weight === bestWeight && code < best)

    if (better) {
      bestScore = score
      bestWeight = weight
      best = code
    }
  }

  return bestScore >= MIN_SCORE ? best : DEFAULT_LANGUAGE
}

/**
 * Picks the dominant language across a conversation: the last message written
 * in a language the user has actually used. A single isiZulu word inside an
 * otherwise English chat should not flip the whole conversation to isiZulu.
 */
export function detectConversationLanguage(texts: string[]): SaLanguageCode {
  const usable = texts.filter((t) => t && t.trim())
  if (usable.length === 0) return DEFAULT_LANGUAGE

  // 1. Majority vote across individual messages. This is what keeps a single
  //    isiZulu word inside an otherwise English chat from flipping the whole
  //    conversation.
  const scores = new Map<SaLanguageCode, number>()
  for (const text of usable) {
    const code = detectLanguage(text)
    if (code === DEFAULT_LANGUAGE) continue
    scores.set(code, (scores.get(code) ?? 0) + 1)
  }

  if (scores.size > 0) {
    return [...scores.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0][0]
  }

  // 2. No message cleared the threshold on its own — common for short chat
  //    replies like "Ncedo ntoni" followed by "Ithanga enameva". Re-score the
  //    conversation as one document so evidence accumulates instead of being
  //    thrown away message by message.
  return detectLanguage(usable.join(" \n "))
}

/**
 * The language-mirroring clause appended to the chat system prompt.
 *
 * The crop-name rule is load-bearing beyond politeness: the client only shows
 * the "Predict 14-Day" button when the conversation text contains a known crop
 * or disease keyword (`hasCropContext` in components/agribot-chat.tsx). Forcing
 * the canonical English crop name into the reply keeps that gate working for
 * farmers who write in isiXhosa, isiZulu, Sesotho and friends.
 */
export function buildLanguageRule(hint: SaLanguageCode): string {
  return `5. **LANGUAGE MIRRORING (CRITICAL)**:
   - ALWAYS reply in the SAME language the farmer used in their most recent message. If they write in isiXhosa, answer in isiXhosa; isiZulu -> isiZulu; Sesotho -> Sesotho; and so on.
   - Supported languages: ${SA_LANGUAGES.map((l) => l.label).join(", ")}.
   - Detected language for the latest message: ${languageLabel(hint)}.
   - Keep all agronomic content just as specific and expert. Do NOT simplify, soften or drop dosages, active ingredients or disease names when replying in another language.
   - When naming the crop or plant species, ALSO give the standard English name in brackets on first mention, e.g. "ithanga (tomato)". This is required for the app's 14-day prognosis feature to activate.
   - Keep your existing markdown structure (bold headers, numbered steps, bullet lists) in every language. Farmers read this on a phone in the field.
   - If a message mixes languages, reply in the language that dominates it.
   - If the farmer switches languages mid-conversation, follow them immediately.`
}

/**
 * Language clause for the /api/forecast extraction prompts.
 *
 * Critical asymmetry: the *prose* fields (symptom, causes, timeline) must be
 * mirrored into the farmer's language, but `crop`, `visualDescription` and the
 * leaf/flower descriptors are fed straight into the gpt-image-1 prompts and into
 * `createPlantVisualFallback`'s SVG. Those must stay canonical, otherwise
 * generated images drift and the SVG renders an untranslated string.
 *
 * The model is told to read the language off the chat context itself. The
 * keyword heuristic is only a fallback for a context too short to judge, and it
 * is deliberately phrased as a default rather than an instruction — stating it
 * as an instruction makes the model comply with a wrong guess.
 */
export function buildForecastLanguageRule(hint: SaLanguageCode = DEFAULT_LANGUAGE): string {
  return `CROP NAME: "crop" MUST be the standard English common name of the plant — for example "tomato", "maize", "pepper", "potato", "cassava", "protea", "leucospermum", "rose". NEVER return a translated or inflected form of the farmer's word (no "iithanga", "isitomato", "tamatie", "itjhangu"). If the farmer says "Iithanga (tomato)", crop must be "tomato". Their own wording belongs in "symptom".
Keep "variety", "visualDescription", "leafDescription" and "flowerColor" in English plant terminology too — all of these feed an image-generation prompt, so translating them degrades the artwork.

LANGUAGE: Detect the language the farmer is writing in from the chat context above, and write ALL human-readable text fields (symptom, causesBad, causesGood, day3, day7, day14, day3Treated, day7Treated, day14Treated) in that same language.
If the context is too short or ambiguous to judge, default to ${languageLabel(hint)}.

Return only the requested JSON object — no translations, no commentary.`
}
