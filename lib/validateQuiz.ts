import type { Question, AFCATSection } from '@/types/game'

const VALID_SECTIONS: AFCATSection[] = [
  'Verbal Ability',
  'Numerical Ability',
  'Spatial Ability',
  'General Awareness',
]

// Pure function — safe to run both client-side (file preview) and server-side (route handler).
export function validateQuizJSON(data: unknown): Question[] {
  if (!Array.isArray(data)) {
    throw new Error('JSON root must be an array of question objects')
  }
  if (data.length === 0) {
    throw new Error('Question array cannot be empty')
  }
  if (data.length > 150) {
    throw new Error('Maximum 150 questions allowed per session')
  }

  return data.map((item, i) => {
    const label = `Question ${i + 1}`
    if (typeof item !== 'object' || item === null) {
      throw new Error(`${label}: must be an object`)
    }
    const q = item as Record<string, unknown>

    if (typeof q.questionId !== 'number') {
      throw new Error(`${label}: "questionId" must be a number`)
    }
    if (!VALID_SECTIONS.includes(q.section as AFCATSection)) {
      throw new Error(
        `${label}: "section" must be one of ${VALID_SECTIONS.join(', ')} — got "${q.section}"`
      )
    }
    if (typeof q.question !== 'string' || q.question.trim() === '') {
      throw new Error(`${label}: "question" must be a non-empty string`)
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`${label}: "options" must be an array of exactly 4 strings`)
    }
    if (!q.options.every((o: unknown) => typeof o === 'string' && o.trim() !== '')) {
      throw new Error(`${label}: all options must be non-empty strings`)
    }
    if (typeof q.correctAnswer !== 'string') {
      throw new Error(`${label}: "correctAnswer" must be a string`)
    }
    if (!(q.options as string[]).includes(q.correctAnswer as string)) {
      throw new Error(`${label}: "correctAnswer" must match one of the four options`)
    }

    return {
      questionId: q.questionId as number,
      section: q.section as AFCATSection,
      question: (q.question as string).trim(),
      options: q.options as string[],
      correctAnswer: q.correctAnswer as string,
      timeLimitSeconds: typeof q.timeLimitSeconds === 'number' ? q.timeLimitSeconds : 45,
    }
  })
}
