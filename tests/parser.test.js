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
  RFC8174BoilerplateTXTBlock,
  metaWithoutObsoleteAndUpdatesTXTBlock
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


describe('Parsing author address', () => {
  test('Parsing author address', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      ${authorAddressTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.content.authorAddress).toEqual(expect.arrayContaining([expect.stringContaining('Authors\' Addresses')]))
  })

  test('Parsing author address with invalid character', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
      Authors‘ Addresses
    `

    const result = await parse(txt, 'txt')
    expect(result.data.content.authorAddress).toEqual(expect.arrayContaining([expect.stringContaining('Authors‘ Addresses')]))
  })
})
      
describe('Parsing obsolete and update metadata', () => {
  test('Parsing obsolete metadata', async () => {
    const txt = `
      ${metaTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.extractedElements.obsoletesRfc).toEqual(['5678', '1234', '2345', '3456'])
    expect(result.data.extractedElements.updatesRfc).toEqual(['6789', '7890', '8901', '9012'])
  })

  test('Parsing tetxt without obsolete and update metadata', async () => {
    const txt = `
      ${metaWithoutObsoleteAndUpdatesTXTBlock}
      ${tableOfContentsTXTBlock}
      ${abstractWithReferencesTXTBlock}
      ${introductionTXTBlock}
      ${securityConsiderationsTXTBlock}
    `

    const result = await parse(txt, 'txt')
    expect(result.data.extractedElements.obsoletesRfc).toHaveLength(0)
    expect(result.data.extractedElements.updatesRfc).toHaveLength(0)
  })
})
