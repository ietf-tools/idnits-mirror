import { describe, expect, test } from '@jest/globals'
import { MODES } from '../lib/config/modes.mjs'
import { toContainError, ValidationWarning, ValidationError } from '../lib/helpers/error.mjs'
import { baseXMLDoc, baseTXTDoc } from './fixtures/base-doc.mjs'
import { cloneDeep, set } from 'lodash-es'
import { validateDownrefs } from '../lib/modules/downref.mjs'

expect.extend({
  toContainError
})

describe('validateDownrefs', () => {
  describe('TXT Document Type', () => {
    test('valid references with no downrefs', async () => {
      const doc = cloneDeep(baseTXTDoc)
      set(doc, 'data.extractedElements.referenceSectionRfc', [{ value: '4086' }, { value: '8141' }])
      set(doc, 'data.extractedElements.referenceSectionDraftReferences', [{ value: 'draft-ietf-quic-http-34' }])

      const result = await validateDownrefs(doc, { mode: MODES.NORMAL })
      expect(result).toHaveLength(0)
    })

    test('invalid downref for a draft', async () => {
      const doc = cloneDeep(baseTXTDoc)
      set(doc, 'data.extractedElements.referenceSectionDraftReferences', [{ value: 'draft-ietf-emu-aka-pfs-34' }])
      set(doc, 'data.header.category', 'Internet Standard')

      const result = await validateDownrefs(doc, { mode: MODES.NORMAL })
      expect(result).toContainError('DOWNREF_TO_LOWER_STATUS_IN_REGISTRY', ValidationError)
    })

    test('invalid downref for an RFC', async () => {
      const doc = cloneDeep(baseTXTDoc)
      set(doc, 'data.extractedElements.referenceSectionRfc', [{ value: '1234' }])
      set(doc, 'data.header.category', 'Internet Standard')

      const result = await validateDownrefs(doc, { mode: MODES.NORMAL })
      expect(result).toContainError('DOWNREF_TO_LOWER_STATUS', ValidationError)
    })

    test('FORGIVE_CHECKLIST mode returns zero warnings', async () => {
      const doc = cloneDeep(baseTXTDoc)
      set(doc, 'data.extractedElements.referenceSectionRfc', [{ value: '1094' }])
      set(doc, 'data.extractedElements.referenceSectionDraftReferences', [{ value: 'draft-ietf-quic-http-34' }])

      const result = await validateDownrefs(doc, { mode: MODES.FORGIVE_CHECKLIST })
      expect(result).toHaveLength(0)
    })
  })

  describe('XML Document Type', () => {
    test('valid XML references without downrefs', async () => {
      const doc = cloneDeep(baseXMLDoc)
      set(doc, 'data.rfc.back.references.references', [
        { reference: [{ _attr: { anchor: 'RFC9114' } }] },
        { reference: [{ _attr: { anchor: 'RFC8141' } }] }
      ])

      const result = await validateDownrefs(doc, { mode: MODES.NORMAL })
      expect(result).toHaveLength(0)
    })

    test('invalid XML ref for a draft', async () => {
      const doc = cloneDeep(baseXMLDoc)
      set(doc, 'data.rfc.back.references.references', [
        { reference: [{ _attr: { anchor: 'draft-ietf-emu-aka-pfs-34' } }] }
      ])

      const result = await validateDownrefs(doc, { mode: MODES.NORMAL })
      expect(result).toHaveLength(0)
    })

    test('FORGIVE_CHECKLIST mode returns warnings for XML', async () => {
      const doc = cloneDeep(baseXMLDoc)
      set(doc, 'data.rfc.back.references.references', [
        { reference: [{ _attr: { anchor: 'RFC7322' } }] },
        { reference: [{ _attr: { anchor: 'draft-ietf-quic-http-34' } }] }
      ])

      const result = await validateDownrefs(doc, { mode: MODES.FORGIVE_CHECKLIST })
      expect(result).toContainError('DOWNREF_TO_LOWER_STATUS', ValidationWarning)
    })

    test('valid XML references without downrefs (multiple references in a section)', async () => {
      const doc = cloneDeep(baseXMLDoc)
      set(doc, 'data.rfc.back.references.references', [
        {
          reference: [
            { _attr: { anchor: 'RFC9114' } },
            { _attr: { anchor: 'RFC8888' } },
            { _attr: { anchor: 'RFC7655' } }
          ]
        }
      ])

      const result = await validateDownrefs(doc, { mode: MODES.NORMAL })
      expect(result).toHaveLength(0)
    })

    test('invalid XML downref when multiple references exist in a section', async () => {
      const doc = cloneDeep(baseXMLDoc)
      set(doc, 'data.rfc.back.references.references', [
        {
          reference: [
            { _attr: { anchor: 'RFC2119' } },
            { _attr: { anchor: 'RFC8174' } },
            { _attr: { anchor: 'draft-ietf-emu-aka-pfs-34' } } // This is a downref
          ]
        }
      ])

      const result = await validateDownrefs(doc, { mode: MODES.NORMAL })
      expect(result).toContainError('DOWNREF_TO_LOWER_STATUS', ValidationError)
    })

    test('FORGIVE_CHECKLIST mode returns warnings when multiple references exist', async () => {
      const doc = cloneDeep(baseXMLDoc)
      set(doc, 'data.rfc.back.references.references', [
        {
          reference: [
            { _attr: { anchor: 'RFC4187' } },
            { _attr: { anchor: 'draft-ietf-quic-http-34' } } // This is a downref
          ]
        }
      ])

      const result = await validateDownrefs(doc, { mode: MODES.FORGIVE_CHECKLIST })
      expect(result).toContainError('DOWNREF_TO_LOWER_STATUS_IN_REGISTRY', ValidationWarning)
    })
  })
})
