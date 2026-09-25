// AgriBot knowledge base — curated crop diagnosis entries.
// Simple keyword matching against Vision API output.
// 15 entries covering the main demo crops and symptoms.

import type { KBEntry, Region } from "./types"

export const KNOWLEDGE_BASE: KBEntry[] = [
  {
    id: "tomato-yellow-nitrogen",
    plant: "tomato",
    symptom: "yellowing leaves",
    cause: "Nitrogen deficiency",
    treatment: [
      "Apply a nitrogen-rich fertilizer or well-rotted manure around the base",
      "Water evenly after feeding so nutrients reach the roots",
      "Recheck in 7–10 days; new growth should green up first",
    ],
    prevention: [
      "Add compost or organic matter before planting",
      "Feed in small doses throughout the season",
    ],
    confidence: "high",
    regionNotes: {
      tropical: "Heavy rains leach nitrogen quickly — split feeding into smaller, more frequent doses.",
      arid: "Feed only with adequate water; dry soil locks up nutrients.",
    },
  },
  {
    id: "tomato-early-blight",
    plant: "tomato",
    symptom: "brown spots on leaves",
    cause: "Early blight (fungal disease)",
    treatment: [
      "Remove and destroy affected lower leaves — do not compost them",
      "Apply a copper-based fungicide, repeating after rain",
      "Mulch the soil to stop spores splashing up from the ground",
    ],
    prevention: [
      "Water at the base, not on leaves",
      "Space plants for good airflow",
      "Rotate crops each season",
    ],
    confidence: "high",
    regionNotes: {
      tropical: "High humidity accelerates spread — scout every few days.",
      highland: "Cooler dews still allow blight; water early so leaves dry by evening.",
    },
  },
  {
    id: "tomato-fusarium-wilt",
    plant: "tomato",
    symptom: "wilting",
    cause: "Fusarium wilt (soil-borne fungus)",
    treatment: [
      "Remove and destroy badly affected plants to protect neighbours",
      "Do not replant tomatoes in the same spot this season",
      "Avoid over-watering, which favours the fungus",
    ],
    prevention: [
      "Rotate with cereals or legumes for 2–3 years",
      "Choose wilt-resistant varieties (look for 'VF' on the label)",
    ],
    confidence: "medium",
  },
  {
    id: "tomato-blossom-rot",
    plant: "tomato",
    symptom: "rotting fruit",
    cause: "Blossom-end rot (calcium/water imbalance)",
    treatment: [
      "Water consistently and deeply; avoid the soil drying out then flooding",
      "Mulch to hold soil moisture steady",
      "Avoid excess nitrogen fertilizer which worsens it",
    ],
    prevention: [
      "Maintain even watering throughout the season",
      "Add lime if soil pH is very low",
    ],
    confidence: "high",
  },
  {
    id: "maize-nitrogen",
    plant: "maize",
    symptom: "yellow stripes on leaves",
    cause: "Nitrogen deficiency",
    treatment: [
      "Top-dress with nitrogen fertilizer (urea or CAN) when soil is moist",
      "Split the dose — some at knee height, more before tasseling",
      "Keep weeds down; they compete for the same nitrogen",
    ],
    prevention: [
      "Soil test before planting to know your nutrient levels",
      "Rotate with legumes which add nitrogen to the soil",
    ],
    confidence: "high",
    regionNotes: {
      tropical: "Split applications reduce loss from leaching in heavy rain.",
    },
  },
  {
    id: "maize-streak-virus",
    plant: "maize",
    symptom: "streaks on leaves",
    cause: "Maize streak virus (spread by leafhoppers)",
    treatment: [
      "Remove and destroy heavily infected plants early",
      "Control leafhoppers and keep field edges weed-free",
      "Use tolerant varieties where available",
    ],
    prevention: [
      "Plant early to escape peak leafhopper populations",
      "Keep surrounding weeds controlled",
    ],
    confidence: "high",
    regionNotes: {
      tropical: "Leafhopper pressure is highest here — early planting helps.",
    },
  },
  {
    id: "beans-rust",
    plant: "beans",
    symptom: "orange rust spots",
    cause: "Bean rust (fungal disease)",
    treatment: [
      "Remove the worst-affected leaves and improve spacing",
      "Avoid overhead watering late in the day",
      "Apply a fungicide if spreading fast",
    ],
    prevention: [
      "Rotate beans with non-legume crops",
      "Choose rust-resistant varieties",
    ],
    confidence: "high",
  },
  {
    id: "potato-late-blight",
    plant: "potato",
    symptom: "dark wet spots on leaves",
    cause: "Late blight (Phytophthora)",
    treatment: [
      "Act fast: remove affected foliage and destroy it away from the field",
      "Apply a protective fungicide before rain; repeat on schedule",
      "Harvest tubers in dry weather and don't store diseased ones",
    ],
    prevention: [
      "Use certified clean seed potatoes",
      "Choose resistant varieties",
      "Avoid overhead watering",
    ],
    confidence: "high",
    regionNotes: {
      highland: "Cool, misty highlands are prime blight conditions — scout after every wet spell.",
    },
  },
  {
    id: "cassava-mosaic",
    plant: "cassava",
    symptom: "mosaic pattern on leaves",
    cause: "Cassava mosaic disease (virus spread by whiteflies)",
    treatment: [
      "Uproot and destroy severely infected plants",
      "Control whiteflies with neem spray or sticky traps",
      "Use tolerant/resistant varieties where available",
    ],
    prevention: [
      "Plant only clean, disease-free cuttings from healthy plants",
      "Source cuttings from certified clean stock",
    ],
    confidence: "high",
    regionNotes: {
      tropical: "Whitefly numbers stay high year-round — sourcing clean cuttings is the biggest lever.",
    },
  },
  {
    id: "pepper-aphid-curl",
    plant: "pepper",
    symptom: "curling leaves",
    cause: "Aphids / sap-sucking insects",
    treatment: [
      "Spray undersides of leaves with insecticidal soap or neem, repeating every few days",
      "Encourage natural predators like ladybirds",
      "Remove badly curled shoots and heavily infested plants",
    ],
    prevention: [
      "Inspect new growth regularly for early signs",
      "Avoid broad-spectrum sprays that kill beneficial insects",
    ],
    confidence: "high",
  },
  {
    id: "rice-yellow",
    plant: "rice",
    symptom: "yellowing leaves",
    cause: "Nitrogen deficiency",
    treatment: [
      "Top-dress with nitrogen fertilizer at tillering and panicle initiation",
      "Keep water management steady; alternate wetting and drying can help",
      "Control weeds competing for nutrients",
    ],
    prevention: [
      "Test soil before planting",
      "Maintain proper water levels throughout growth stages",
    ],
    confidence: "high",
  },
  {
    id: "generic-holes-pests",
    plant: "other",
    symptom: "holes in leaves",
    cause: "Chewing pests (caterpillars or beetles)",
    treatment: [
      "Scout early morning or evening and hand-pick larger caterpillars",
      "Use Bt (Bacillus thuringiensis) or approved insecticide for heavy attacks",
      "Keep the area weed-free to reduce hiding spots",
    ],
    prevention: [
      "Install sticky traps to monitor pest levels",
      "Intercrop with aromatic plants that repel pests",
    ],
    confidence: "medium",
  },
  {
    id: "generic-powdery-mildew",
    plant: "other",
    symptom: "white powdery coating",
    cause: "Powdery mildew (fungal disease)",
    treatment: [
      "Improve spacing and airflow; remove worst-affected leaves",
      "Spray a sulphur-based fungicide or diluted milk solution for mild cases",
      "Avoid excess nitrogen which produces soft, susceptible growth",
    ],
    prevention: [
      "Space plants properly for airflow",
      "Choose resistant varieties when available",
    ],
    confidence: "high",
  },
  {
    id: "tomato-leaf-spot",
    plant: "tomato",
    symptom: "spots on leaves",
    cause: "Leaf spot disease (fungal or bacterial)",
    treatment: [
      "Remove affected leaves immediately",
      "Apply copper spray or broad-spectrum fungicide",
      "Avoid working with wet plants to prevent spread",
    ],
    prevention: [
      "Water at the base, not on leaves",
      "Mulch to prevent soil splash onto lower leaves",
      "Rotate crops annually",
    ],
    confidence: "medium",
  },
  {
    id: "maize-leaf-blight",
    plant: "maize",
    symptom: "large brown lesions on leaves",
    cause: "Northern corn leaf blight (fungal)",
    treatment: [
      "Remove severely infected leaves",
      "Apply fungicide at the first sign if spreading",
      "Ensure good nutrition to help plants resist",
    ],
    prevention: [
      "Use resistant hybrids",
      "Rotate away from maize for at least one season",
      "Bury crop residue after harvest",
    ],
    confidence: "high",
  },
]

/**
 * Match a Vision API result against the knowledge base.
 * Returns the best match or null if nothing matches.
 */
export function matchKB(plant: string, symptom: string): KBEntry | null {
  const p = plant.toLowerCase().trim()
  const s = symptom.toLowerCase().trim()

  let best: KBEntry | null = null
  let bestScore = 0

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0

    // Plant match
    if (entry.plant === p) score += 10
    else if (entry.plant === "other") score += 2
    else if (p.includes(entry.plant) || entry.plant.includes(p)) score += 5

    // Symptom keyword match
    const symptomWords = s.split(/\s+/)
    for (const word of symptomWords) {
      if (word.length < 3) continue
      if (entry.symptom.includes(word)) score += 3
      if (entry.cause.toLowerCase().includes(word)) score += 1
    }

    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  return bestScore >= 5 ? best : null
}

/**
 * Get region-specific notes for a KB entry.
 */
export function getRegionNote(entry: KBEntry, region: Region): string | undefined {
  if (region === "unknown") return undefined
  return entry.regionNotes?.[region]
}
