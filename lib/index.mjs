import { ALLOWED_DOMAINS_DEFAULT } from './config/externals.mjs'
import { MODES } from './config/modes.mjs'
import {
  decodeBufferToUTF8,
  validateContent,
  validateEncoding
} from './modules/raw.mjs'
import {
  validateFilename,
  validateDocName
} from './modules/filename.mjs'
import {
  validateFQDNs
} from './modules/fqdn.mjs'
import {
  validateIPs
} from './modules/ip.mjs'
import {
  validate2119Keywords,
  validateTermsStyle
} from './modules/keywords.mjs'
import {
  validateAbstractSection,
  validateIntroductionSection,
  validateSecurityConsiderationsSection,
  validateAuthorSection,
  validateReferencesSection,
  validateIANAConsiderationsSection
} from './modules/sections.mjs'
import {
  detectDeprecatedElements,
  validateCodeBlocks,
  validateIprAttribute
} from './modules/xml.mjs'
import {
  validateLineLength
} from './modules/txt.mjs'

/**
 * Check Nits
 *
 * @param {Buffer|ArrayBuffer} raw Document contents
 * @param {string} filename Filename of the document
 * @param {Object} opts Options
 * @param {number} opts.year Expect the given year in the boilerplate
 * @param {string[]} opts.allowedDomains List of authorized domains to fetch externals from
 * @param {string} opts.mode Validation mode to use
 * @param {Function} opts.progressReport Callback function for progress messages
 * @returns Nits Results
 */
export async function checkNits (raw, filename, {
  year,
  allowedDomains = ALLOWED_DOMAINS_DEFAULT,
  mode = MODES.NORMAL,
  offline = false,
  progressReport = () => {}
} = {}) {
  let doc = null
  const ext = filename.endsWith('.xml') ? 'xml' : 'txt'
  const result = []

  // Pre-parsing validations
  progressReport('Validating filename...')
  result.push(...(await validateFilename(filename, { mode })))
  progressReport('Validating encoding...')
  result.push(...(await validateEncoding(raw, { mode })))

  progressReport('Decoding document to UTF-8...')
  const data = await decodeBufferToUTF8(raw)
  progressReport('Validating text...')
  result.push(...(await validateContent(data, { mode })))

  // Parse using appropriate parser
  try {
    switch (ext) {
      case 'txt': {
        progressReport('Parsing TXT document...')
        const { parse } = await import('./parsers/txt.mjs')
        doc = await parse(data, filename)
        break
      }
      case 'xml': {
        progressReport('Parsing XML document...')
        const { parse } = await import('./parsers/xml.mjs')
        doc = await parse(data, filename)
        break
      }
      default: {
        throw new Error('Invalid Document Format')
      }
    }
  } catch (err) {
    return [...result, err]
  }

  // Run common validations
  progressReport('Validating document name...')
  result.push(...(await validateDocName(doc, { mode })))
  progressReport('Validating abstract section...')
  result.push(...(await validateAbstractSection(doc, { mode })))
  progressReport('Validating introduction section...')
  result.push(...(await validateIntroductionSection(doc, { mode })))
  progressReport('Validating security considerations section...')
  result.push(...(await validateSecurityConsiderationsSection(doc, { mode })))
  progressReport('Validating author section(s)...')
  result.push(...(await validateAuthorSection(doc, { mode })))
  progressReport('Validating references section(s)...')
  result.push(...(await validateReferencesSection(doc, { mode })))
  progressReport('Validating IANA considerations section...')
  result.push(...(await validateIANAConsiderationsSection(doc, { mode })))
  progressReport('Validating FQDNs...')
  result.push(...(await validateFQDNs(doc, { mode, offline })))
  progressReport('Validating IPs...')
  result.push(...(await validateIPs(doc, { mode })))
  progressReport('Validating Requirement Level Keywords...')
  result.push(...(await validate2119Keywords(doc, { mode })))
  progressReport('Validating Terms...')
  result.push(...(await validateTermsStyle(doc, { mode })))

  // Run XML-only validations
  if (doc.type === 'xml') {
    progressReport('Looking for deprecated elements...')
    result.push(...(await detectDeprecatedElements(doc, { mode })))
    progressReport('Validating code blocks...')
    result.push(...(await validateCodeBlocks(doc, { mode })))
    progressReport('Validating ipr attribute...')
    result.push(...(await validateIprAttribute(doc, { mode })))
  }

  // Run TXT-only validations
  if (doc.type === 'txt') {
    progressReport('Validating line length...')
    result.push(...(await validateLineLength(doc, { mode })))
  }

  return result
}
