import { describe, expect, test } from '@jest/globals'
import { MODES } from '../lib/config/modes.mjs'
import { toContainError, ValidationWarning } from '../lib/helpers/error.mjs'
import {
  validateIPs
} from '../lib/modules/ip.mjs'
import { baseXMLDoc } from './fixtures/base-doc.mjs'
import { cloneDeep, set } from 'lodash-es'

expect.extend({
  toContainError
})

describe('document should have valid IP Address mentions', () => {
  describe('document should have valid IPv4 mentions (TXT Document Type)', () => {
    test('valid IPv4 addresses', async () => {
      const doc = {
        type: 'txt',
        data: {
          extractedElements: {
            ipv4: [
              '192.0.2.1',
              '198.51.100.23',
              '203.0.113.45',
              '233.252.0.10',
              '0.0.0.0',
              '255.255.255.255'
            ]
          }
        }
      }

      const result = await validateIPs(doc, { mode: MODES.NORMAL })
      expect(result).toHaveLength(0)
    })

    test('invalid IPv4 addresses', async () => {
      const doc = {
        type: 'txt',
        data: {
          extractedElements: {
            ipv4: [
              '256.0.0.1',
              '192.0.2.300',
              '192.0.2',
              '192.0.2.1/33',
              'abc.def.ghi.jkl'
            ]
          }
        }
      }

      const result = await validateIPs(doc, { mode: MODES.NORMAL })
      expect(result).toEqual([
        new ValidationWarning('INVALID_IPV4_ADDRESS', 'IPv4 address is invalid.', {
          ref: 'https://datatracker.ietf.org/doc/html/rfc791',
          text: '256.0.0.1'
        }),
        new ValidationWarning('INVALID_IPV4_ADDRESS', 'IPv4 address is invalid.', {
          ref: 'https://datatracker.ietf.org/doc/html/rfc791',
          text: '192.0.2.300'
        }),
        new ValidationWarning('INVALID_IPV4_ADDRESS', 'IPv4 address is invalid.', {
          ref: 'https://datatracker.ietf.org/doc/html/rfc791',
          text: '192.0.2'
        }),
        new ValidationWarning('INVALID_IPV4_ADDRESS', 'IPv4 address is invalid.', {
          ref: 'https://datatracker.ietf.org/doc/html/rfc791',
          text: '192.0.2.1/33'
        }),
        new ValidationWarning('INVALID_IPV4_ADDRESS', 'IPv4 address is invalid.', {
          ref: 'https://datatracker.ietf.org/doc/html/rfc791',
          text: 'abc.def.ghi.jkl'
        })
      ])
    })

    test('Documentation IPv4 addresses', async () => {
      const doc = {
        type: 'txt',
        data: {
          extractedElements: {
            ipv4: [
              '8.8.8.8',
              '1.1.1.1',
              '123.45.67.89'
            ]
          }
        }
      }

      const result = await validateIPs(doc, { mode: MODES.NORMAL })
      expect(result).toEqual([])
    })
  })

  describe('XML Document Type', () => {
    test('valid IP Addresses in text section', async () => {
      const doc = cloneDeep(baseXMLDoc)
      set(doc, 'data.rfc.middle.t', 'Lorem ipsum 255.0.0.123, 2001:DB8:0:0:8:800:200C:417A and 0:0:0:0:0:0:0:0.')
      await expect(validateIPs(doc)).resolves.toHaveLength(0)
    })
    test('invalid IPv4', async () => {
      const doc = cloneDeep(baseXMLDoc)
      set(doc, 'data.rfc.middle.t', 'Lorem ipsum 256.0.0.123 lorem ipsum.')
      await expect(validateIPs(doc)).resolves.toContainError('INVALID_IPV4_ADDRESS', ValidationWarning)
      await expect(validateIPs(doc, { mode: MODES.FORGIVE_CHECKLIST })).resolves.toContainError('INVALID_IPV4_ADDRESS', ValidationWarning)
      await expect(validateIPs(doc, { mode: MODES.SUBMISSION })).resolves.toHaveLength(0)
    })
    // TODO: More IPv4 variations, with cidr
    test('invalid IPv6', async () => {
      const doc = cloneDeep(baseXMLDoc)
      set(doc, 'data.rfc.middle.t', 'Lorem ipsum F:0DB8:0000:CD30:0000:0000:0000:0000/60 lorem ipsum.')
      await expect(validateIPs(doc)).resolves.toContainError('INVALID_IPV6_ADDRESS', ValidationWarning)
      await expect(validateIPs(doc, { mode: MODES.FORGIVE_CHECKLIST })).resolves.toContainError('INVALID_IPV6_ADDRESS', ValidationWarning)
      await expect(validateIPs(doc, { mode: MODES.SUBMISSION })).resolves.toHaveLength(0)
    })
    // TODO: More IPv6 variations, compressed, mix with v4, etc.
  })
})
