import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals'
import {
  abstractTXTBlock,
  tableOfContentsTXTBlock,
  introductionTXTBlock,
  metaTXTBlock,
  securityConsiderationsTXTBlock,
  authorAddressTXTBlock
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
