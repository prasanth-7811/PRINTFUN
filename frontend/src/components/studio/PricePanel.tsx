import { CURRENCY, PRICING } from '../../config/brand'

interface Props {
  basePrice: number
  hasFront: boolean
  hasBack: boolean
  totalQty: number
  couponDiscount: number
}

export default function PricePanel({ basePrice, hasFront, hasBack, totalQty, couponDiscount }: Props) {
  const qty = Math.max(totalQty, 1)
  const frontCost = hasFront ? PRICING.frontPrint : 0
  const backCost = hasBack ? PRICING.backPrint : 0
  const subtotal = (basePrice + frontCost + backCost) * qty
  const delivery = subtotal >= PRICING.freeDeliveryAbove ? 0 : PRICING.deliveryBase + Math.max(0, (qty - 1)) * PRICING.deliveryPerExtra
  const total = subtotal + delivery - couponDiscount

  const rows = [
    { label: `T-Shirt Base (×${qty})`, value: basePrice * qty },
    hasFront ? { label: 'Front Print', value: frontCost * qty } : null,
    hasBack ? { label: 'Back Print', value: backCost * qty } : null,
    { label: 'Delivery', value: delivery },
    couponDiscount > 0 ? { label: 'Discount', value: -couponDiscount } : null,
  ].filter(Boolean) as { label: string; value: number }[]

  return (
    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
      <h3 className="font-semibold text-sm text-zinc-900 mb-3">Live Price</h3>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">{r.label}</span>
            <span className={r.value < 0 ? 'text-green-600 font-medium' : 'text-zinc-700'}>
              {r.value < 0 ? '-' : ''}{CURRENCY}{Math.abs(r.value)}
            </span>
          </div>
        ))}
        {delivery === 0 && (
          <p className="text-xs text-green-600 font-medium">🎉 Free delivery!</p>
        )}
      </div>
      <div className="border-t border-zinc-200 mt-3 pt-3 flex items-center justify-between">
        <span className="font-bold text-zinc-900">Total</span>
        <span className="text-xl font-black text-zinc-900">{CURRENCY}{Math.max(0, total)}</span>
      </div>
    </div>
  )
}
