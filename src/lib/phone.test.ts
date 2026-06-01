import { describe, it, expect } from 'vitest'
import { normalizePhone, isValidPhone } from './phone'

describe('normalizePhone', () => {
  const cases: [string, string][] = [
    // Indonesian — various local/international forms
    ['628123456789', '628123456789'],   // already ID intl, unchanged
    ['08123456789', '628123456789'],     // local 0 → 62
    ['8123456789', '628123456789'],      // local 8 → 62
    ['0628123456789', '628123456789'],   // stray leading 0 on intl
    ['+62 812-3456-789', '628123456789'],// strip +, spaces, dashes
    ['62895805222125', '62895805222125'],// long ID number, unchanged

    // International — already carry a country code, must stay intact
    ['6586737636', '6586737636'],        // Singapore — the reported bug
    ['61412345678', '61412345678'],      // Australia
    ['12025550123', '12025550123'],      // USA

    // Edge cases
    ['006586737636', '6586737636'],      // drop 00 intl-exit prefix
    ['', ''],                            // empty
    ['abc', ''],                         // no digits
  ]

  it.each(cases)('normalizes %s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it('does NOT prepend 62 to a Singapore number', () => {
    expect(normalizePhone('6586737636')).not.toBe('626586737636')
  })
})

describe('isValidPhone', () => {
  const valid = ['628123456789', '6586737636', '61412345678', '12025550123', '62895805222125']
  const invalid = ['', 'abc', '628', '0628123456789', '1234567', '1'.repeat(16)]

  it.each(valid)('accepts %s', n => {
    expect(isValidPhone(n)).toBe(true)
  })

  it.each(invalid)('rejects %s', n => {
    expect(isValidPhone(n)).toBe(false)
  })
})
