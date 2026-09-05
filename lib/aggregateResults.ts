import type { Question, PlayerProgress, PlayerResult, AFCATSection, SectionStats } from '@/types/game'
import type { PlayerInfo } from '@/store/gameStore'

const SECTIONS: AFCATSection[] = [
  'Verbal Ability',
  'Numerical Ability',
  'Spatial Ability',
  'General Awareness',
]

export function aggregateResults(
  players: Record<string, PlayerInfo>,
  playerProgress: Record<string, PlayerProgress>,
  questions: Question[],
): PlayerResult[] {
  const questionMap = new Map(questions.map((q) => [q.questionId, q]))

  const results: PlayerResult[] = Object.entries(players).map(([pid, info]) => {
    const prog    = playerProgress[pid]
    const answers = prog?.answers ?? {}
    const score   = prog?.score ?? 0

    let totalAnswered = 0
    let totalCorrect  = 0
    const sectionBreakdown: Partial<Record<AFCATSection, SectionStats>> = {}

    // Init all sections so the UI always has a row per section
    for (const sec of SECTIONS) {
      sectionBreakdown[sec] = { correct: 0, total: 0, points: 0 }
    }

    for (const [qidStr, ans] of Object.entries(answers)) {
      const qid = Number(qidStr)
      const q   = questionMap.get(qid)
      if (!q) continue

      totalAnswered++
      if (ans.correct) totalCorrect++

      const sec = q.section as AFCATSection
      sectionBreakdown[sec]!.total++
      if (ans.correct) sectionBreakdown[sec]!.correct++
    }

    // Distribute total score proportionally across sections by correct-answer count.
    // This is an approximation (per-question scores aren't tracked by section).
    if (totalCorrect > 0) {
      for (const sec of SECTIONS) {
        const s = sectionBreakdown[sec]!
        s.points = Math.round((s.correct / totalCorrect) * score)
      }
    }

    const accuracyRate    = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
    const avgResponseTime = computeAvgResponseTime(answers, questions)

    return {
      userId: pid,
      username: info.username,
      totalScore: score,
      accuracyRate,
      avgResponseTime,
      sectionBreakdown,
    }
  })

  return results.sort((a, b) => b.totalScore - a.totalScore)
}

function computeAvgResponseTime(
  answers: PlayerProgress['answers'],
  questions: Question[],
): number {
  const timeLimitMap = new Map(questions.map((q) => [q.questionId, q.timeLimitSeconds]))
  const entries      = Object.entries(answers)
  if (entries.length < 2) return 0

  // Sort by timestamp to derive per-question time consumed
  const sorted = entries
    .map(([qid, a]) => ({ qid: Number(qid), ts: a.timestamp }))
    .sort((a, b) => a.ts - b.ts)

  let totalMs = 0
  let count   = 0

  for (let i = 1; i < sorted.length; i++) {
    const gap      = sorted[i].ts - sorted[i - 1].ts
    const prevQid  = sorted[i - 1].qid
    const limit    = (timeLimitMap.get(prevQid) ?? 45) * 1000
    // Cap at the question's time limit (gap could span multiple questions)
    const timeUsed = Math.min(gap, limit)
    totalMs += timeUsed
    count++
  }

  return count > 0 ? Math.round(totalMs / count / 1000) : 0  // seconds
}
