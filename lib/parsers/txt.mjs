import { ValidationError } from '../helpers/error.mjs'
import { DateTime } from 'luxon'
import { FQDN_RE } from '../modules/fqdn.mjs'
import { IPV4_LOOSE_RE, IPV6_LOOSE_RE } from '../modules/ip.mjs'

const LINE_VALUES_EXTRACT_RE = /^(?<left>.*)\s{2,}(?<right>.*)$/
const AUTHOR_NAME_RE = /^[a-z]\.\s[a-z]+$/i
const DATE_RE = /^(?:(?<day>[0-9]{1,2})\s)?(?<month>[a-z]{3,})\s(?<year>[0-9]{4})$/i
const SECTION_PATTERN = /^\d+\.\s+.+$/

// Author regexps
const AUTHORS_OR_EDITORS_ADDRESSES_RE = /^(Authors?|Editors?)' Addresses$/i
const AUTHOR_INFORMATION_RE = /^[0-9a-z.]*\s*author information$/i
const AUTHOR_CONTACT_INFORMATION_RE = /^[0-9a-z.]*\s*(author|editor)(?:'s|'s|s)?\s+contact information$/i
const CONTACT_INFORMATION_RE = /^[0-9a-z.]*\s*contact information$/i
const AUTHOR_EDITORS_RE = /^[0-9a-z.]*\s*(author|editor)s?:?$/i

const AUTHOR_SECTION_RE = new RegExp(
  `(${AUTHORS_OR_EDITORS_ADDRESSES_RE.source}|` +
  `${AUTHOR_INFORMATION_RE.source}|` +
  `${AUTHOR_CONTACT_INFORMATION_RE.source}|` +
  `${CONTACT_INFORMATION_RE.source}|` +
  `${AUTHOR_EDITORS_RE.source})`,
  'i'
)

const sectionMatchers = [
  { name: 'introduction', regex: /^\d+\.\s+(Introduction|Overview|Background)$/i },
  { name: 'securityConsiderations', regex: /^\d+\.\s+Security Considerations$/i },
  { name: 'authorAddress', regex: AUTHOR_SECTION_RE },
  { name: 'references', regex: /^\d+\.\s+References$/i },
  { name: 'ianaConsiderations', regex: /^\d+\.\s+IANA Considerations$/i }
]

/**
 * @typedef {Object} TXTDocObject
 * @property {Object} data Parsed TXT tree
 * @property {string} docKind Whether the document is an Internet Draft (draft) or an RFC (rfc)
 * @property {string} filename Filename of the document
 * @property {string} type Document file type (txt)
 * @property {number} version Document version number (2 or 3)
 * @property {string} versionCertainty Whether the version was explicity specified (strict) or guessed (guess)
 */

/**
 * Parse Text document
 *
 * @param {string} rawText Input text
 * @param {string} filename Filename of the document
 * @returns {TXTDocObject} Parsed document object
 */
export async function parse (rawText, filename) {
  const data = {
    pageCount: 1,
    header: {
      authors: [],
      date: null,
      source: null,
      expires: null
    },
    content: {
      abstract: null,
      introduction: null,
      securityConsiderations: null,
      authorAddress: null,
      references: null,
      ianaConsiderations: null
    },
    title: null,
    slug: null,
    extractedElements: {
      fqdnDomains: [],
      ipv4: [],
      ipv6: []
    }
  }
  let docKind = null
  let lineIdx = 0
  let currentSection = null
  try {
    const markers = {
      header: { start: 0, end: 0, lastAuthor: 0, closed: false },
      title: 0,
      slug: 0,
      abstract: { start: 0, end: 0, closed: false },
      introduction: { start: 0, end: 0, closed: false },
      securityConsiderations: { start: 0, end: 0, closed: false },
      authorAddress: { start: 0, end: 0, closed: false },
      references: { start: 0, end: 0, closed: false },
      ianaConsiderations: { start: 0, end: 0, closed: false }
    }

    for (const line of rawText.split('\n')) {
      const trimmedLine = line.trim()
      lineIdx++

      // Page Break
      // --------------------------------------------------------------
      if (line.indexOf('\f') >= 0) {
        data.pageCount++
        continue
      }

      // Empty line
      // --------------------------------------------------------------
      if (!trimmedLine) {
        continue
      }

      // FQRN Domain extraction
      const domainMatches = [...trimmedLine.matchAll(FQDN_RE)]
      if (domainMatches.length > 0) {
        domainMatches.forEach(match => data.extractedElements.fqdnDomains.push(match.groups.domain))
      }

      // IPv4 and IPv6 extraction
      const ipv4Matches = [...trimmedLine.matchAll(IPV4_LOOSE_RE)]
      if (ipv4Matches.length > 0) {
        ipv4Matches.forEach(match => data.extractedElements.ipv4.push(match[0]))
      }

      const ipv6Matches = [...trimmedLine.matchAll(IPV6_LOOSE_RE)]
      if (ipv6Matches.length > 0) {
        ipv6Matches.forEach(match => data.extractedElements.ipv6.push(match[0]))
      }

      // Header
      // --------------------------------------------------------------
      if (!markers.header.start) {
        // -> First Line
        markers.header.start = lineIdx
        markers.header.end = lineIdx
        const values = LINE_VALUES_EXTRACT_RE.exec(trimmedLine)
        // --> Source
        data.header.source = values.groups.left
        // --> Author
        data.header.authors.push({
          name: values.groups.right
        })
        markers.header.lastAuthor = lineIdx
        continue
      } else if (!markers.header.closed) {
        if (lineIdx > markers.header.end + 1) {
          markers.header.closed = true
          markers.title = lineIdx
          data.title = trimmedLine
        } else {
          markers.header.end = lineIdx

          const extractedValues = LINE_VALUES_EXTRACT_RE.exec(line)
          const values = extractedValues ? extractedValues.groups : { left: trimmedLine, right: null }

          if (values.left) {
            // --> Document Kind
            if (values.left === 'Internet-Draft') {
              docKind = 'draft'
            } else if (values.left.startsWith('Request for Comments')) {
              data.header.rfcNumber = values.left.split(':')?.[1]?.trim()
              docKind = 'rfc'
            }

            // --> Intended status
            if (values.left.startsWith('Intended')) {
              data.header.intendedStatus = values.left.split(':')?.[1]?.trim()
            }

            // --> Obsoletes
            if (values.left.startsWith('Obsoletes')) {
              const obsoletesValues = values.left.split(':')?.[1]?.trim()
              data.header.obsoletes = obsoletesValues.indexOf(',') >= 0 ? obsoletesValues.split(',').map(o => o.trim()) : [obsoletesValues]
            }

            // --> Category
            if (values.left.startsWith('Category')) {
              data.header.category = values.left.split(':')?.[1]?.trim()
            }

            // --> ISSN
            if (values.left.startsWith('ISSN')) {
              data.header.issn = values.left.split(':')?.[1]?.trim()
            }

            // --> Expires
            if (values.left.startsWith('Expires')) {
              const dateValue = DATE_RE.exec(values.left.split(':')?.[1]?.trim())
              if (dateValue) {
                data.header.expires = DateTime.fromFormat(`${dateValue.groups.day || 1} ${dateValue.groups.month} ${dateValue.groups.year}`, 'd MMMM yyyy')
              }
            }
          }
          if (values.right) {
            // --> Date
            const dateValue = DATE_RE.exec(values.right)
            if (dateValue) {
              data.header.date = DateTime.fromFormat(`${dateValue.groups.day || 1} ${dateValue.groups.month} ${dateValue.groups.year}`, 'd MMMM yyyy')
            }

            if (!data.header.date) {
              // --> Author
              const authorNameValue = AUTHOR_NAME_RE.exec(values.right)
              if (authorNameValue) {
                // --> Blank line = Previous author(s) have no affiliation
                if (lineIdx > markers.header.lastAuthor + 1) {
                  data.header.authors.findLast(el => {
                    if (el.org || el.org === '') {
                      return true
                    } else {
                      el.org = ''
                      return false
                    }
                  })
                }

                // --> Author Name
                data.header.authors.push({
                  name: authorNameValue[0]
                })
              } else if (values.right) {
                // --> Author Org
                data.header.authors.findLast(el => {
                  if (el.org || el.org === '') {
                    return true
                  } else {
                    el.org = values.right
                    return false
                  }
                })
              }
              markers.header.lastAuthor = lineIdx
            }
          }
        }
      }
      if (data.title && lineIdx === markers.title + 1) {
        markers.slug = lineIdx
        data.slug = trimmedLine
        continue
      }

      // Abstract
      // --------------------------------------------------------------
      if (trimmedLine === 'Abstract') {
        markers.abstract.start = lineIdx
        currentSection = 'abstract'
        data.content.abstract = []
      } else if (markers.abstract.start && !markers.abstract.closed) {
        if (trimmedLine.startsWith('Status of') || !line.startsWith('  ')) {
          markers.abstract.end = lineIdx - 1
          markers.abstract.closed = true
        }
      }

      if (!markers.header.start) {
        markers.header.start = lineIdx
        markers.header.end = lineIdx
        const values = LINE_VALUES_EXTRACT_RE.exec(trimmedLine)
        if (values) {
          data.header.source = values.groups.left
          data.header.authors.push({ name: values.groups.right })
        }
        markers.header.lastAuthor = lineIdx
        continue
      } else if (!markers.header.closed) {
        if (lineIdx > markers.header.end + 1) {
          markers.header.closed = true
          markers.title = lineIdx
          data.title = trimmedLine
        } else {
          markers.header.end = lineIdx
        }
        continue
      }

      // Section detection and content assignment
      if (SECTION_PATTERN.test(trimmedLine) || AUTHOR_SECTION_RE.test(trimmedLine)) {
        const matchedSection = sectionMatchers.find(({ regex }) => regex.test(trimmedLine))

        if (currentSection && !markers[currentSection].closed) {
          markers[currentSection].end = lineIdx - 1
          markers[currentSection].closed = true
        }

        if (matchedSection) {
          currentSection = matchedSection.name
          markers[currentSection].start = lineIdx
          data.content[currentSection] = []
        } else {
          currentSection = null
        }
        continue
      }

      // Add content to the current section
      if (currentSection && markers[currentSection].start && !markers[currentSection].closed) {
        data.content[currentSection].push(trimmedLine)
      }
    }

    // Close the last section
    if (currentSection && !markers[currentSection].closed) {
      markers[currentSection].end = lineIdx
      markers[currentSection].closed = true
    }
    data.markers = markers
  } catch (err) {
    throw new ValidationError('TXT_PARSING_FAILED', `Error while parsing Line ${lineIdx}: ${err.message}`)
  }

  console.info(data.header.authors)

  return {
    docKind,
    body: rawText,
    data,
    filename,
    type: 'txt'
  }
}
