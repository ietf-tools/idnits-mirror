import { ValidationWarning, ValidationError } from '../helpers/error.mjs'
import { checkReferencesInDownrefs } from '../remote/downref.mjs'
import { MODES } from '../config/modes.mjs'
import { findAllDescendantsWith } from '../helpers/traversal.mjs'
import { fetchRemoteDocInfoJson, fetchRemoteRfcInfo } from '../helpers/remote.mjs'
import { getStatusWeight } from '../config/rfc-status-hierarchy.mjs'

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
      const statusWeight = getStatusWeight(doc.data.header.intendedStatus ?? doc.data.header.category)
      const rfcs = referenceSectionRfc.map((extracted) => extracted.value).map((rfcNumber) => `RFC ${rfcNumber}`)
      const drafts = normalizeDraftReferences(referenceSectionDraftReferences.map((extracted) => extracted.value))

      for (const ref of [...rfcs, ...drafts]) {
        let refStatus = null

        if (ref.startsWith('RFC')) {
          const rfcNumber = ref.split(' ')[1]
          const rfcInfo = await fetchRemoteRfcInfo(rfcNumber)
          refStatus = getStatusWeight(rfcInfo?.status)
        } else {
          const draftInfo = await fetchRemoteDocInfoJson(ref)
          refStatus = getStatusWeight(draftInfo?.intended_std_level || draftInfo?.std_level)
        }

        if (refStatus !== null && refStatus < statusWeight) {
          const isDownref = await checkReferencesInDownrefs([ref])
          if (isDownref.length > 0) {
            switch (mode) {
              case MODES.NORMAL:
                result.push(new ValidationError('DOWNREF_TO_LOWER_STATUS_IN_REGISTRY', `Reference to ${ref}, which has a lower status and is listed in the Downref Registry.`, {
                  ref: `https://datatracker.ietf.org/doc/${ref}`
                }))
                break
              case MODES.FORGIVE_CHECKLIST:
                result.push(new ValidationWarning('DOWNREF_TO_LOWER_STATUS_IN_REGISTRY', `Reference to ${ref}, which has a lower status and is listed in the Downref Registry.`, {
                  ref: `https://datatracker.ietf.org/doc/${ref}`
                }))
                break
            }
          } else {
            switch (mode) {
              case MODES.NORMAL:
                result.push(new ValidationError('DOWNREF_TO_LOWER_STATUS', `Reference to ${ref}, which has a lower status than the current document.`, {
                  ref: `https://datatracker.ietf.org/doc/${ref}`
                }))
                break
              case MODES.FORGIVE_CHECKLIST:
                result.push(new ValidationWarning('DOWNREF_TO_LOWER_STATUS', `Reference to ${ref}, which has a lower status than the current document.`, {
                  ref: `https://datatracker.ietf.org/doc/${ref}`
                }))
                break
            }
          }
        }
      }

      break
    }
    case 'xml': {
      const referencesSections = doc.data.rfc.back.references.references
      const definedReferences = findAllDescendantsWith(referencesSections, (value, key) => key === '_attr' && value.anchor)
        .flatMap((match) => (Array.isArray(match.value.anchor) ? match.value.anchor : [match.value.anchor]))
        .filter(Boolean)

      const normilizedReferences = normalizeXmlReferences(definedReferences)

      const docStatus = getStatusWeight(doc.data.rfc._attr.category ?? doc.data.rfc._attr.status)

      for (const ref of normilizedReferences) {
        let refStatus = null

        if (/^RFC\s*\d+$/i.test(ref)) {
          const rfcNumber = ref.match(/\d+/)[0]
          const rfcInfo = await fetchRemoteRfcInfo(rfcNumber)
          refStatus = getStatusWeight(rfcInfo?.status)
        } else if (/draft/i.test(ref)) {
          const draftInfo = await fetchRemoteDocInfoJson(ref)
          refStatus = getStatusWeight(draftInfo?.intended_std_level || draftInfo?.std_level)
        }

        if (refStatus !== null && refStatus < docStatus) {
          const isDownref = await checkReferencesInDownrefs([ref])
          if (isDownref.length > 0) {
            switch (mode) {
              case MODES.NORMAL:
                result.push(
                  new ValidationError(
                    'DOWNREF_TO_LOWER_STATUS_IN_REGISTRY',
                    `Reference to ${ref}, which has a lower status and is listed in the Downref Registry.`,
                    { ref: `https://datatracker.ietf.org/doc/${ref}` }
                  )
                )
                break
              case MODES.FORGIVE_CHECKLIST:
                result.push(
                  new ValidationWarning(
                    'DOWNREF_TO_LOWER_STATUS_IN_REGISTRY',
                    `Reference to ${ref}, which has a lower status and is listed in the Downref Registry.`,
                    { ref: `https://datatracker.ietf.org/doc/${ref}` }
                  )
                )
                break
            }
          } else {
            switch (mode) {
              case MODES.NORMAL:
                result.push(
                  new ValidationError(
                    'DOWNREF_TO_LOWER_STATUS',
                    `Reference to ${ref}, which has a lower status than the current document.`,
                    { ref: `https://datatracker.ietf.org/doc/${ref}` }
                  )
                )
                break
              case MODES.FORGIVE_CHECKLIST:
                result.push(
                  new ValidationWarning(
                    'DOWNREF_TO_LOWER_STATUS',
                    `Reference to ${ref}, which has a lower status than the current document.`,
                    { ref: `https://datatracker.ietf.org/doc/${ref}` }
                  )
                )
                break
            }
          }
        }
      }
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
