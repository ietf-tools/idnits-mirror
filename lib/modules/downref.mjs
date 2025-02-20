import { ValidationWarning, ValidationError, ValidationComment } from '../helpers/error.mjs'
import { checkReferencesInDownrefs } from '../remote/downref.mjs'
import { MODES } from '../config/modes.mjs'
import { getStatusWeight } from '../config/rfc-status-hierarchy.mjs'
import { fetchRemoteRfcInfo } from '../helpers/remote.mjs'
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
      const rfcs = referenceSectionRfc.map((rfc) => `RFC ${rfc.value}`)
      const drafts = normalizeDraftReferences(referenceSectionDraftReferences.map((el) => el.value))
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

/**
 * Validates normative references within a document by checking the status of referenced RFCs.
 *
 * This function processes both text (`txt`) and XML (`xml`) documents, identifying RFCs within
 * normative references and validating their status using remote data fetched from the RFC editor.
 *
 * - For TXT documents, it looks for normative references in the `referenceSectionRfc` field.
 * - For XML documents, it extracts references from the back references section.
 *
 * Steps:
 * 1. Extract normative references for both TXT and XML documents.
 * 2. Fetch metadata for each RFC using `fetchRemoteRfcInfo`.
 * 3. Validate the fetched status:
 *    - If no status is defined or the RFC cannot be fetched, a `UNDEFINED_STATUS` comment is added.
 *    - If the status is unrecognized, an `UNKNOWN_STATUS` comment is added.
 * 4. Return a list of validation comments highlighting issues.
 *
 * @param {Object} doc - The document to validate.
 * @param {Object} [opts] - Additional options.
 * @param {number} [opts.mode=MODES.NORMAL] - Validation mode (e.g., NORMAL, SUBMISSION).
 * @returns {Promise<Array>} - A list of validation results, including warnings or comments.
 */
export async function validateNormativeReferences (doc, { mode = MODES.NORMAL } = {}) {
  const result = []
  const RFC_NUMBER_REG = /^\d+$/

  if (mode === MODES.SUBMISSION) {
    return result
  }

  switch (doc.type) {
    case 'txt': {
      const normativeReferences = doc.data.extractedElements.referenceSectionRfc
        .filter((el) => el.subsection === 'normative_references' && RFC_NUMBER_REG.test(el.value))
        .map((el) => el.value)

      for (const rfcNum of normativeReferences) {
        const rfcInfo = await fetchRemoteRfcInfo(rfcNum)

        if (!rfcInfo || !rfcInfo.status) {
          result.push(new ValidationComment('UNDEFINED_STATUS', `RFC ${rfcNum} does not have a defined status or could not be fetched.`, {
            ref: `https://www.rfc-editor.org/info/rfc${rfcNum}`
          }))
          continue
        }

        const statusWeight = getStatusWeight(rfcInfo.status)

        if (statusWeight === null) {
          result.push(new ValidationComment('UNKNOWN_STATUS', `RFC ${rfcNum} has an unrecognized status: "${rfcInfo.status}".`, {
            ref: `https://www.rfc-editor.org/info/rfc${rfcNum}`
          }))
        }
      }
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
        .filter((ref) => ref.startsWith('RFC'))
        .map((ref) => ref.match(/\d+/)[0])

      for (const rfcNum of normilizedReferences) {
        const rfcInfo = await fetchRemoteRfcInfo(rfcNum)

        if (!rfcInfo || !rfcInfo.status) {
          result.push(new ValidationComment('UNDEFINED_STATUS', `RFC ${rfcNum} does not have a defined status or could not be fetched.`, {
            ref: `https://www.rfc-editor.org/info/rfc${rfcNum}`
          }))
          continue
        }

        const statusWeight = getStatusWeight(rfcInfo.status)

        if (statusWeight === null) {
          result.push(new ValidationComment('UNKNOWN_STATUS', `RFC ${rfcNum} has an unrecognized status: "${rfcInfo.status}".`, {
            ref: `https://www.rfc-editor.org/info/rfc${rfcNum}`
          }))
        }
      }
      break
    }
  }

  return result
}
