// Mirrors Python analyze_message() output structure from main_update.py

export type PriorityLevel = 'Critical' | 'High' | 'Standard'

export interface CrisisInfo {
  disaster: string
  urgency: string
  location: string
  trapped_people: string   // "43 people" | "None Reported"
  injured_people: string   // "54 people" | "None Reported"
  specific_need: string
  contact: string
  latitude: number
  longitude: number
}

export interface CrisisData {
  id: string
  message: string
  timestamp: Date
  // Python result fields
  category: string
  confidence: number       // always 0.95
  priority_level: PriorityLevel
  priority_rating: number
  completeness_score: number
  priority_reasons: string[]
  explanation: string
  information: CrisisInfo
}
