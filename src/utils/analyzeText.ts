/**
 * JavaScript port of Python main_update.py → analyze_message()
 * Replicates the exact scoring logic so React results match the Python backend.
 */
import { CrisisData, PriorityLevel } from '../types'

// --- Disaster map (mirrors EXACT_DISASTER_MAP) ---
const DISASTER_MAP: [RegExp, string][] = [
  [/\bcyclone\b|\bcyclonic\b/i, 'Cyclone'],
  [/\bhurricane\b/i, 'Hurricane'],
  [/\btyphoon\b/i, 'Typhoon'],
  [/\btornado\b/i, 'Tornado'],
  [/\bblizzard\b/i, 'Blizzard'],
  [/\bflash flood\b/i, 'Flash Flood'],
  [/\bflood(?:ing)?\b|\binundation\b|\bwaterlogging\b|\bsubmerged\b|\briverbank\b/i, 'Flood'],
  [/\bheavy rain\b/i, 'Heavy Rain'],
  [/\bblaze\b|\bfire\b/i, 'Fire'],
  [/\bwildfire\b/i, 'Wildfire'],
  [/\blandslide\b/i, 'Landslide'],
  [/\bmudslide\b/i, 'Mudslide'],
  [/\bearthquake\b|\btremor\b/i, 'Earthquake'],
  [/\btsunami\b/i, 'Tsunami'],
  [/\bvolcano\b/i, 'Volcanic Eruption'],
  [/\bexplosion\b/i, 'Explosion'],
  [/\bcollapse\b/i, 'Structural Collapse'],
  [/\bstorm\b|\bgale\b/i, 'Storm'],
]

// --- Need patterns (mirrors NEED_PATTERNS) ---
const NEED_PATTERNS: [string, RegExp][] = [
  ['Power & Electricity', /\belectric(?:ity)?\b|\bpower\b|\boutage\b|\bblackout\b/i],
  ['Road Clearance & Infrastructure', /\broad\b|\bblocked road\b|\bdebris\b|\bbridge\b/i],
  ['Search & Rescue', /\brescue\b|\bboat\b|\bevacuation\b|\btrapped\b|\bstranded\b/i],
  ['Medical & First Aid', /\bmedical\b|\bmedicine\b|\bambulance\b|\bdoctor\b|\binjur(?:ed|ies)\b|\bhospital\b/i],
  ['Food & Water Rations', /\bwater\b|\bfood\b|\bration\b|\bmeals\b|\bstarving\b/i],
  ['Shelter & Bedding', /\bshelter\b|\btent\b|\btarpaulin\b|\bblanket\b/i],
]

const STOPWORDS = new Set([
  'urgent', 'urgently', 'flash', 'flooding', 'floods', 'flood', 'landslide',
  'people', 'peoples', 'person', 'persons', 'trapped', 'injured', 'injuries',
  'was', 'were', 'is', 'are', 'the', 'riverbank', 'river', 'bridge', 'road',
  'call', 'need', 'needed', 'immediate', 'medical', 'evacuation', 'help', 'please',
  'across', 'district', 'village', 'town', 'area', 'junction', 'and',
])

// GPS lookup for common Indian locations (fallback to Kotagiri region)
const LOCATION_GPS: [RegExp, number, number][] = [
  [/sulligudu/i, 11.42, 76.88],
  [/wayanad/i, 11.6854, 76.1320],
  [/meppadi/i, 11.4457, 76.1427],
  [/kotagiri/i, 11.4200, 76.8800],
  [/ooty|udhagamandalam/i, 11.4064, 76.6932],
  [/coimbatore/i, 11.0168, 76.9558],
  [/chennai/i, 13.0827, 80.2707],
  [/mumbai/i, 19.076, 72.8777],
  [/delhi/i, 28.6139, 77.209],
  [/kerala/i, 10.8505, 76.2711],
  [/bangalore|bengaluru/i, 12.9716, 77.5946],
  [/hyderabad/i, 17.385, 78.4867],
  [/kolkata/i, 22.5726, 88.3639],
  [/pune/i, 18.5204, 73.8567],
  [/nilgiris/i, 11.4200, 76.8800],
]

function getGPS(location: string): [number, number] {
  for (const [re, lat, lon] of LOCATION_GPS) {
    if (re.test(location)) return [lat, lon]
  }
  return [11.42, 76.88] // default: Kotagiri region
}

function extractDisasterType(text: string): string {
  for (const [re, name] of DISASTER_MAP) {
    if (re.test(text)) return name
  }
  return 'General Emergency'
}

function extractLocation(text: string): string {
  // Priority 1: word(s) immediately after "in" or "at"
  const primaryMatch = text.match(/\b(?:in|at)\s+([a-zA-Z0-9.\s]{2,30}?)(?=\s+(?:near|around|towards|was|were|is|are|the|flood|\d+|$))/i)
  const nearMatch = text.match(/\b(?:near|around|towards)\s+([a-zA-Z0-9.\s]{2,30}?)(?=\s+(?:was|were|is|are|the|flood|\d+|$))/i)

  const clean = (raw: string) =>
    raw
      .split(/\s+/)
      .filter((w) => !STOPWORDS.has(w.toLowerCase()))
      .join(' ')
      .trim()

  const primary = primaryMatch ? clean(primaryMatch[1]) : ''
  const near = nearMatch ? clean(nearMatch[1]) : ''

  if (primary && near) return `${toTitle(primary)} (near ${toTitle(near)})`
  if (primary) return toTitle(primary)
  if (near) return toTitle(near)

  // Fallback: proper nouns
  const tokens = [...text.matchAll(/\b[a-zA-Z0-9.]{3,}\b/g)].map((m) => m[0])
  const found = tokens.filter((t) => !STOPWORDS.has(t.toLowerCase())).map(toTitle)
  return found.slice(0, 2).join(', ') || 'S.Kaikatty, Kotagiri'
}

function toTitle(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

const TRAPPED_KWS = ['trapped', 'stranded', 'stuck', 'marooned']
const INJURED_KWS = ['injured', 'injuries', 'hurt', 'wounded', 'injuried', 'injuryed']

function extractCountNearKeywords(text: string, keywords: string[]): string {
  const tokens = text.toLowerCase().match(/\b\w+\b/g) ?? []

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    const match = keywords.some((kw) => {
      if (kw === tok) return true
      // Simple fuzzy: allow 1-2 char diff for common misspellings
      if (Math.abs(kw.length - tok.length) > 2) return false
      let diff = 0
      const len = Math.min(kw.length, tok.length)
      for (let j = 0; j < len; j++) if (kw[j] !== tok[j]) diff++
      return diff <= 2
    })
    if (match) {
      const start = Math.max(0, i - 4)
      const end = Math.min(tokens.length, i + 5)
      for (const item of tokens.slice(start, end)) {
        if (/^\d+$/.test(item)) return `${item} people`
      }
    }
  }
  return 'None Reported'
}

function extractNeeds(text: string): string {
  const detected: string[] = []
  for (const [category, re] of NEED_PATTERNS) {
    if (re.test(text)) detected.push(category)
  }
  return detected.length ? detected.join(', ') : 'General Relief'
}

function parseNumber(s: string): number {
  const m = s.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

// Mirrors Python analyze_message() exactly
export function analyzeText(message: string): Omit<CrisisData, 'id' | 'timestamp'> {
  const disaster = extractDisasterType(message)
  const location = extractLocation(message)
  const [lat, lon] = getGPS(location)

  const trapped_people = extractCountNearKeywords(message, TRAPPED_KWS)
  const injured_people = extractCountNearKeywords(message, INJURED_KWS)
  const specific_need = extractNeeds(message)

  const contactMatch = message.match(/\b[6-9]\d{9}\b/)
  const contact = contactMatch ? contactMatch[0] : 'Not Detected'

  const trapped_num = parseNumber(trapped_people)
  const injured_num = parseNumber(injured_people)

  // Exact Python scoring
  let base_score = 40.0
  if (disaster !== 'General Emergency') base_score += 25.0
  base_score += Math.min(trapped_num * 0.5, 20.0)
  base_score += Math.min(injured_num * 1.0, 15.0)
  const priority_rating = Math.min(base_score, 100.0)

  const priority_level: PriorityLevel =
    priority_rating >= 75 ? 'Critical' : priority_rating >= 55 ? 'High' : 'Standard'

  // Exact Python completeness
  const completeness_score =
    disaster !== 'General Emergency' && contact !== 'Not Detected' ? 100.0 : 80.0

  const category =
    disaster !== 'General Emergency' ? disaster : 'Evacuation Required'

  const explanation =
    `Assessed as a ${disaster} emergency requiring priority response based on reported impact. ` +
    `Extracted details confirm an incident in ${location} with ${trapped_people} trapped, ` +
    `${injured_people} injured, requiring ${specific_need} (Contact: ${contact}). ` +
    `Calculated priority rating of ${priority_rating.toFixed(1)}/100.`

  return {
    message,
    category,
    confidence: 0.95,
    priority_level,
    priority_rating,
    completeness_score,
    priority_reasons: [
      `Disaster Type: ${disaster}`,
      `Trapped Impact: ${trapped_people}`,
      `Injured Impact: ${injured_people}`,
    ],
    explanation,
    information: {
      disaster,
      urgency: priority_level,
      location,
      trapped_people,
      injured_people,
      specific_need,
      contact,
      latitude: lat,
      longitude: lon,
    },
  }
}
