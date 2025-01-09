import { ValidationWarning, ValidationError } from '../helpers/error.mjs'
import { checkReferencesInDownrefs } from '../remote/downref.mjs'
import { MODES } from '../config/modes.mjs'
import { findAllDescendantsWith } from '../helpers/traversal.mjs'

/**
 * Validate document references for RFCs and Drafts downrefs.
 *
 * @param {Object} doc - Document to validate
 * @param {Object} [opts] - Additional options
 * @param {number} [opts.mode=0] - Validation mode to use
 * @param {boolean} [opts.offline=false] - Skip fetching remote data if true
 * @returns {Array} - List of errors/warnings/comments
 */
export async function validateDownrefs (doc, { mode = MODES.NORMAL } = {}) {
  const result = []

  if (mode === MODES.SUBMISSION) {
    return result
  }

  switch (doc.type) {
    case 'txt': {
      const { referenceSectionRfc, referenceSectionDraftReferences } = doc.data.extractedElements
      const rfcs = referenceSectionRfc.map((rfcNumber) => `RFC ${rfcNumber}`)
      const drafts = normalizeDraftReferences(referenceSectionDraftReferences)
      const downrefMatches = await checkReferencesInDownrefs([...rfcs, ...drafts])

      downrefMatches.forEach((match) => {
        switch (mode) {
          case MODES.NORMAL: {
            result.push(new ValidationError('DOWNREF_DRAFT', `Draft ${match} is listed in the Downref Registry.`, {
              ref: `https://datatracker.ietf.org/doc/${match}`
            }))
            break
          }
          case MODES.FORGIVE_CHECKLIST: {
            result.push(new ValidationWarning('DOWNREF_DRAFT', `Draft ${match} is listed in the Downref Registry.`, {
              ref: `https://datatracker.ietf.org/doc/${match}`
            }))
            break
          }
        }
      })

      break
    }
    case 'xml': {
      const referencesSections = doc.data.rfc.back.references.references
      const definedReferences = findAllDescendantsWith(referencesSections, (value, key) => key === '_attr' && value.anchor)
        .flatMap(match =>
          Array.isArray(match.value.anchor)
            ? match.value.anchor
            : [match.value.anchor]
        )
        .filter(Boolean)
      const normilizedReferences = normalizeXmlReferences(definedReferences)

      const downrefMatches = await checkReferencesInDownrefs(normilizedReferences)

      downrefMatches.forEach((match) => {
        switch (mode) {
          case MODES.NORMAL: {
            result.push(new ValidationError('DOWNREF_DRAFT', `Draft ${match} is listed in the Downref Registry.`, {
              ref: `https://datatracker.ietf.org/doc/${match}`
            }))
            break
          }
          case MODES.FORGIVE_CHECKLIST: {
            result.push(new ValidationWarning('DOWNREF_DRAFT', `Draft ${match} is listed in the Downref Registry.`, {
              ref: `https://datatracker.ietf.org/doc/${match}`
            }))
            break
          }
        }
      })
      break
    }
  }

  return result
}

/**
 * Normalize references by removing brackets, versions, and checking for drafts.
 *
 * @param {Array} references - Array of textual references.
 * @returns {Array} - Array of normalized references containing "draft".
 */
function normalizeDraftReferences (references) {
  return references
    .map((ref) => {
      let normalized = ref.replace(/^\[|\]$/g, '')
      normalized = normalized.replace(/-\d{2}$/, '')

      return normalized
    })
    .filter((ref) => ref.toLowerCase().includes('draft'))
}

/**
 * Normalize XML references to drafts and RFCs.
 *
 * @param {Array} references - Array of reference strings.
 * @returns {Array} - Normalized references including only drafts and RFCs.
 */
function normalizeXmlReferences (references) {
  const normalizedReferences = []

  references.forEach((ref) => {
    if (/^RFC\d+$/i.test(ref)) {
      const rfcNumber = ref.match(/\d+/)[0]
      normalizedReferences.push(`RFC ${rfcNumber}`)
    } else if (/draft/i.test(ref)) {
      const draftName = ref.trim().replace(/^\[|\]$/g, '').replace(/-\d{2}$/, '')
      normalizedReferences.push(draftName)
    }
  })

  return normalizedReferences
}
