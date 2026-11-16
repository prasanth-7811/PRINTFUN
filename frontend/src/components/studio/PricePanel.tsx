import { CURRENCY, PRINT_OPTIONS, type PrintOptionId } from '../../config/brand'

interface Props {
  basePrice: number
  printOptionId: PrintOptionId
  totalQty: number
  courierCharge: number   // passed from parent — 80 for kids round neck, admin value for others
  couponDiscount: number
}

export default function PricePanel({ basePrice, printOptionId, totalQty, courierCharge, couponDiscount }: Props) {
  const qty = Math.max(totalQty, 1)
  const option = PRINT_OPTIONS.find(o => o.id === printOptionId) || PRINT_OPTIONS[0]
  const printCost = option.frontCost + option.backCost
  const subtotal = (basePrice + printCost) * qty
  const total = subtotal + courierCharge - couponDiscount

  const rows = [
    { label: `Product (×${qty})`, value: basePrice * qty },
    printCost > 0 ? { label: option.label, value: printCost * qty } : null,
    { label: 'Courier', value: courierCharge },
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
      </div>
      <div className="border-t border-zinc-200 mt-3 pt-3 flex items-center justify-between">
        <span className="font-bold text-zinc-900">Total</span>
        <span className="text-xl font-black text-zinc-900">{CURRENCY}{Math.max(0, total)}</span>
      </div>
    </div>
  )
}
