/**
 * Smoke check for the storefront WhatsApp link helpers.
 *
 * Builds the same strings the UI renders. Uses ESM output executed with Node
 * (see package script "check:whatsapp") so no bundler is required.
 */
import { STORE_WHATSAPP, STORE_WHATSAPP_DISPLAY, waLink, orderEnquiryLink } from './whatsapp.ts'

const FAILS: string[] = []

function check(label: string, ok: boolean, detail = ''): void {
  const status = ok ? 'PASS' : 'FAIL'
  console.log(`${status}  ${label.padEnd(44)} ${detail}`)
  if (!ok) FAILS.push(label)
}

console.log('='.repeat(78))
console.log('STOREFRONT WHATSAPP LINK CHECK')
console.log('='.repeat(78))

check('STORE_WHATSAPP is the E.164 number', STORE_WHATSAPP === '919600650612', STORE_WHATSAPP)
check('STORE_WHATSAPP_DISPLAY is formatted', STORE_WHATSAPP_DISPLAY === '+91 96006 50612', STORE_WHATSAPP_DISPLAY)

const bare = waLink()
check('waLink() has no empty text param', bare === 'https://wa.me/919600650612', bare)
check('waLink() does not carry a stray "?"', !bare.includes('?'))

const withMsg = waLink('Hi! About my order #TZ-2024-1')
check('waLink(msg) targets the store number', withMsg.startsWith('https://wa.me/919600650612?text='), withMsg)
check('waLink(msg) percent-encodes the message', withMsg.includes('%23TZ-2024-1'), withMsg)

const enquiry = orderEnquiryLink('TZ-2024-1', 1347)
check('orderEnquiryLink targets the store number', enquiry.startsWith('https://wa.me/919600650612?text='), enquiry)
check('orderEnquiryLink includes the order number', enquiry.includes('TZ-2024-1'), enquiry)
check('orderEnquiryLink includes the total', enquiry.includes('1347'), enquiry)

// Android/iOS accept only digits between "wa.me/" and "?".
const digits = enquiry.split('?')[0].replace('https://wa.me/', '')
check('wa.me path is digits only', /^\d+$/.test(digits), digits)

console.log('='.repeat(78))
if (FAILS.length) {
  console.log(`${FAILS.length} CHECK(S) FAILED: ${FAILS}`)
} else {
  console.log('ALL CHECKS PASSED')
}
console.log('='.repeat(78))
process.exitCode = FAILS.length ? 1 : 0
