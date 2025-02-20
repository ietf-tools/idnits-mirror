import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals'
import {
  abstractTXTBlock,
  tableOfContentsTXTBlock,
  introductionTXTBlock,
  metaTXTBlock,
  securityConsiderationsTXTBlock,
  authorAddressTXTBlock,
  referenceTXTBlock,
  abstractWithReferencesTXTBlock,
  textWithFQRNTXTBlock,
  textWithIPsTXTBlock,
  textWithRFC2119KeywordsTXTBlock,
  RFC2119BoilerplateTXTBlock,
  RFC8174BoilerplateTXTBlock
} from './fixtures/txt-blocks/section-blocks.mjs'
import { parse } from '../lib/parsers/txt.mjs'

beforeAll(() => {
  jest.spyOn(console, 'info').mockImplementation(() => {})
})

afterAll(() => {
  console.info.mockRestore()
})

describe('A possible code comment is detected outside of a marked code block', () => {
  test('The comment is detected and marked as a possible code comment out of code block', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractTXTBlock}
      ${introductionTXTBlock}
      <CODE BEGINS>
      ...
      <CODE ENDS>
      # This is a possible code comment
      /* This is another possible code comment */
    `

    const result = await parse(txt, 'txt')
    expect(result.data.possibleIssues.inlineCode).toHaveLength(2)
    expect(result.data.possibleIssues.inlineCode).toEqual(expect.arrayContaining([
      expect.objectContaining({ line: 42 }),
      expect.objectContaining({ line: 43 })
    ]))
  })

  test('The comment is detected inside of code block', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractTXTBlock}
      ${introductionTXTBlock}
      <CODE BEGINS>
      # Comment inside code block
      <CODE ENDS>
    `

    const result = await parse(txt, 'txt')
    expect(result.data.possibleIssues.inlineCode).toHaveLength(0)
  })
})

describe('Missing abstract section', () => {
  test('The abstract section is missing', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.content.abstract).toBeNull()
  })

  test('The abstract section is present', async () => {
    const txt = `
    ${metaTXTBlock}
    ${tableOfContentsTXTBlock}
    ${abstractTXTBlock}
    ${introductionTXTBlock}
    ${securityConsiderationsTXTBlock}
  `

    const result = await parse(txt, 'txt')
    expect(result.data.content.abstract).not.toBeNull()
    expect(result.data.content.abstract).toEqual(expect.arrayContaining([expect.stringContaining('Abstract')]))
  })
})

describe('Missing introduction section', () => {
  test('The introduction section is missing', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.content.introduction).toBeNull()
  })

  test('The introduction section is present', async () => {
    const txt = `
    ${metaTXTBlock}
    ${tableOfContentsTXTBlock}
    ${abstractTXTBlock}
    ${introductionTXTBlock}
    ${securityConsiderationsTXTBlock}
  `

    const result = await parse(txt, 'txt')
    expect(result.data.content.introduction).not.toBeNull()
    expect(result.data.content.introduction).toEqual(expect.arrayContaining([expect.stringContaining('The purpose of this document is to define the structure and standards')]))
  })
})

describe('Missing Author Address section', () => {
  test('The Author Address section is missing', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractTXTBlock}
      ${introductionTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.markers.authorAddress.start).toBe(0)
  })

  test('The Author Address section is present', async () => {
    const txt = `
    ${metaTXTBlock}
    ${tableOfContentsTXTBlock}
    ${abstractTXTBlock}
    ${introductionTXTBlock}
    ${authorAddressTXTBlock}
  `

    const result = await parse(txt, 'txt')
    expect(result.data.markers.authorAddress.start).toBeGreaterThan(0)
  })
})

describe('References (if any present) are not categorized as Normative or Informative', () => {
  test('References are not categorized', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      7. References
      7.1. Unknown references
      7.2 Uncategorizes references
    `

    const result = await parse(txt, 'txt')
    expect(result.data.content.references).toEqual(expect.not.arrayContaining([expect.stringContaining('Normative References'), expect.stringContaining('Informative References')]))
  })

  test('Reference section is not present', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.content.references).toBeNull()
  })

  test('References are categorized', async () => {
    const txt = `
    ${metaTXTBlock}
    ${tableOfContentsTXTBlock}
    ${abstractTXTBlock}
    ${introductionTXTBlock}
    ${securityConsiderationsTXTBlock}
    ${referenceTXTBlock}
  `

    const result = await parse(txt, 'txt')
    expect(result.data.content.references).toEqual(expect.arrayContaining([expect.stringContaining('Normative References'), expect.stringContaining('Informative References')]))
  })
})

describe('Abstract contains references', () => {
  test('Abstract contains references', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.content.abstract).toEqual(expect.arrayContaining([expect.stringContaining('Abstract'), expect.stringContaining('[1]')]))
  })
})

describe('Parsing FQRN', () => {
  test('Extracting FQRN domains from text', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      ${textWithFQRNTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.extractedElements.fqdnDomains).toEqual(expect.arrayContaining(['www.ietf.org', 'example.com', 'random.arpa', 'invalid.arpa']))
  })

  test('No FQRN domains found in text', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.extractedElements.fqdnDomains).toEqual([])
  })
})

describe('Parsing IPs', () => {
  test('Extracting IPs from text', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      ${textWithIPsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.extractedElements.ipv4).toEqual(expect.arrayContaining(['8.8.8.8', '123.45.67.89', '256.0.0.1', '192.0.2.300']))
    expect(result.data.extractedElements.ipv6).toEqual(expect.arrayContaining(['2001:0000:130F:0000:0000:09C0:876A:130B', '1234:5678:90ab::']))
  })

  test('No IPs found in text', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.extractedElements.ipv4).toEqual([])
    expect(result.data.extractedElements.ipv6).toEqual([])
  })
})

describe('Testing parsing RFC2119 keywords and boilerplates', () => {
  test('Parsing RFC2119 keywords', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      ${textWithRFC2119KeywordsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.extractedElements.keywords2119).toEqual(expect.arrayContaining([
      { keyword: 'MUST', line: 46 },
      { keyword: 'MUST NOT', line: 46 },
      { keyword: 'REQUIRED', line: 46 },
      { keyword: 'SHALL', line: 46 },
      { keyword: 'SHALL NOT', line: 46 },
      { keyword: 'SHOULD', line: 46 },
      { keyword: 'NOT RECOMMENDED', line: 49 }
    ]))
    expect(result.data.extractedElements.boilerplate2119Keywords).toEqual([])
  })

  test('Parsing RFC2119 boilerplate keywords', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${RFC2119BoilerplateTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.extractedElements.boilerplate2119Keywords).toEqual([
      'MUST',
      'MUST NOT',
      'REQUIRED',
      'SHALL',
      'SHALL NOT',
      'SHOULD',
      'SHOULD NOT',
      'RECOMMENDED',
      'MAY',
      'OPTIONAL'
    ])
  })

  test('Detecting RFC2119 boilerplate', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${RFC2119BoilerplateTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.boilerplate.rfc2119).toBe(true)
  })

  test('Detecting missing RFC2119 boilerplate', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.boilerplate.rfc2119).toBe(false)
  })

  test('Detecting RFC2119 reference', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      ${textWithRFC2119KeywordsTXTBlock}
      [RFC2119]
    `

    const result = await parse(txt, 'txt')
    expect(result.data.references.rfc2119).toBe(true)
  })

  test('Detecting missing RFC2119 reference', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      ${textWithRFC2119KeywordsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.references.rfc2119).toBe(false)
  })

  test('Detecting RFC8174 boilerplate', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${RFC8174BoilerplateTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.boilerplate.rfc8174).toBe(true)
  })

  test('Detecting missing RFC8174 boilerplate', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.boilerplate.rfc8174).toBe(false)
  })

  test('Detecting RFC8174 reference', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      ${textWithRFC2119KeywordsTXTBlock}
      [RFC8174]
    `

    const result = await parse(txt, 'txt')
    expect(result.data.references.rfc8174).toBe(true)
  })

  test('Detecting missing RFC8174 reference', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      ${textWithRFC2119KeywordsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.references.rfc8174).toBe(false)
  })
})

describe('Parsing similar to RFC2119 boilerplate text', () => {
  test('Similar to boilerplate text is detected, but it is not a boilerplate', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      ${textWithRFC2119KeywordsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.boilerplate.rfc2119).toEqual(false)
    expect(result.data.boilerplate.rfc8174).toEqual(false)
    expect(result.data.boilerplate.similar2119boilerplate).toEqual(true)
  })
})

describe('Reference is declared, but not used in the document', () => {
  test('Parsing declared but not used references', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      ${referenceTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.extractedElements.referenceSectionRfc).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subsection: 'normative_references', value: '4360' }),
        expect.objectContaining({ subsection: 'normative_references', value: '5701' }),
        expect.objectContaining({ subsection: 'normative_references', value: '7153' }),
        expect.objectContaining({ subsection: 'normative_references', value: '7432' }),
        expect.objectContaining({ subsection: 'normative_references', value: '2345' })
      ])
    )

    expect(result.data.extractedElements.referenceSectionDraftReferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: '[Lalalala-Refere-Sponsor]', subsection: 'normative_references' }),
        expect.objectContaining({ value: '[I-D.ietf-bess-evpn-igmp-mld-proxy]', subsection: 'informative_references' }),
        expect.objectContaining({ value: '[I-D.ietf-bess-bgp-multicast-controller]', subsection: 'informative_references' }),
        expect.objectContaining({ value: '[I-D.ietf-idr-legacy-rtc]', subsection: 'informative_references' })
      ])
    )
  })

  test('Parsing references in text (only one reference)', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      ${referenceTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.extractedElements.nonReferenceSectionDraftReferences).toContain('[1]')
    expect(result.data.extractedElements.nonReferenceSectionRfc).toHaveLength(0)
  })

  test('Parsing references in text (multiple references)', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      [RFC255], [RFC256], [RFC257], [RFC258]
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      [I-D.ietf-bess-evpn-igmp-mld-proxy], [I-D.ietf-bess-bgp-multicast-controller], [I-D.ietf-idr-legacy-rtc]
      ${securityConsiderationsTXTBlock}
      ${referenceTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.extractedElements.nonReferenceSectionDraftReferences).toContain('[1]', '[I-D.ietf-bess-evpn-igmp-mld-proxy]', '[I-D.ietf-bess-bgp-multicast-controller]', '[I-D.ietf-idr-legacy-rtc]')
    expect(result.data.extractedElements.nonReferenceSectionRfc).toContain('255', '256', '257', '258')
  })

  test('Parsing text without reference section', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.extractedElements.referenceSectionRfc).toHaveLength(0)
    expect(result.data.extractedElements.referenceSectionDraftReferences).toHaveLength(0)
  })
})

describe('Parsing references with categorization', () => {
  test('Correctly categorizes normative and informative RFC references', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      7. References
      7.1. Normative References
      [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, DOI 10.17487/RFC2119, March 1997.
      [RFC8174] Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, DOI 10.17487/RFC8174, May 2017.
      7.2. Informative References
      [RFC3552] Rescorla, E., "Guidelines for Writing RFC Text on Security Considerations", BCP 72, RFC 3552, DOI 10.17487/RFC3552, July 2003.
      [RFC7322] Flanagan, H., "RFC Style Guide", RFC 7322, DOI 10.17487/RFC7322, September 2014.
    `

    const result = await parse(txt, 'txt')

    expect(result.data.extractedElements.referenceSectionRfc).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: '2119', subsection: 'normative_references' }),
        expect.objectContaining({ value: '8174', subsection: 'normative_references' }),
        expect.objectContaining({ value: '3552', subsection: 'informative_references' }),
        expect.objectContaining({ value: '7322', subsection: 'informative_references' })
      ])
    )
  })

  test('Correctly categorizes normative and informative draft references', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      7. References
      7.1. Normative References
      [I-D.ietf-httpbis-semantics] Fielding, R., "HTTP Semantics", draft-ietf-httpbis-semantics-19, October 2021.
      [I-D.ietf-quic-http] Bishop, M., "HTTP over QUIC", draft-ietf-quic-http-34, May 2021.
      7.2. Informative References
      [I-D.ietf-httpbis-cache] Nottingham, M., "HTTP Caching", draft-ietf-httpbis-cache-09, November 2020.
      [I-D.ietf-httpbis-client-hints] Grigorik, I., "Client Hints", draft-ietf-httpbis-client-hints-10, January 2021.
    `

    const result = await parse(txt, 'txt')

    expect(result.data.extractedElements.referenceSectionDraftReferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: '[I-D.ietf-httpbis-semantics]', subsection: 'normative_references' }),
        expect.objectContaining({ value: '[I-D.ietf-quic-http]', subsection: 'normative_references' }),
        expect.objectContaining({ value: '[I-D.ietf-httpbis-cache]', subsection: 'informative_references' }),
        expect.objectContaining({ value: '[I-D.ietf-httpbis-client-hints]', subsection: 'informative_references' })
      ])
    )
  })

  test('Detects references that are not categorized as normative or informative', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      7. References
      [RFC5234] Crocker, D., "Augmented BNF for Syntax Specifications: ABNF", RFC 5234, January 2008.
      [RFC8446] Rescorla, E., "The Transport Layer Security (TLS) Protocol Version 1.3", RFC 8446, August 2018.
    `

    const result = await parse(txt, 'txt')

    expect(result.data.extractedElements.referenceSectionRfc).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: '5234', subsection: null }),
        expect.objectContaining({ value: '8446', subsection: null })
      ])
    )
  })

  test('Parses text without reference section correctly', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')

    expect(result.data.extractedElements.referenceSectionRfc).toHaveLength(0)
    expect(result.data.extractedElements.referenceSectionDraftReferences).toHaveLength(0)
  })
})
