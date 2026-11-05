import { CircleAlert, Package, PackageSearch, Truck } from 'lucide-react'
import type { OrderLookupResult } from '@/types'

export function OrderStatusCard({ result }: { result: OrderLookupResult }) {
  if (result.state !== 'success' || !result.order) {
    const Icon = result.state === 'error' ? CircleAlert : PackageSearch
    return (
      <section
        aria-label="订单查询结果"
        className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-xs"
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="font-semibold text-foreground">
            {result.state === 'error' ? '订单查询暂不可用' : '未查询到订单'}
          </p>
          <p className="mt-1 leading-relaxed text-muted-foreground">{result.message}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">只读查询 · 演示数据</p>
        </div>
      </section>
    )
  }

  const { order } = result
  return (
    <section aria-label="订单查询结果" className="overflow-hidden rounded-xl border border-border bg-card text-xs">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
        <Package className="h-4 w-4 text-primary" />
        <p className="font-semibold text-foreground">订单 / 物流查询</p>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
          {order.statusLabel}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">只读</span>
      </div>

      <dl className="grid gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">订单号</dt>
        <dd className="font-mono font-medium break-all text-foreground">{order.orderId}</dd>
        <dt className="text-muted-foreground">商品</dt>
        <dd className="text-foreground">{order.itemName}</dd>
        <dt className="text-muted-foreground">承运方</dt>
        <dd className="text-foreground">{order.carrier}</dd>
        <dt className="text-muted-foreground">运单号</dt>
        <dd className="font-mono break-all text-foreground">{order.trackingNo}</dd>
      </dl>

      <div className="border-t border-border/70 px-4 py-3">
        <div className="mb-3 flex items-center gap-2 text-muted-foreground">
          <Truck className="h-3.5 w-3.5" />
          <span>最近更新：{order.updatedAt}</span>
        </div>
        <ol className="space-y-3" aria-label="物流时间线">
          {order.timeline.map((event, index) => (
            <li key={`${event.time}-${event.description}`} className="relative flex gap-3 pl-4">
              <span
                className={
                  index === 0
                    ? 'absolute top-1.5 left-0 h-2 w-2 rounded-full bg-primary'
                    : 'absolute top-1.5 left-0 h-2 w-2 rounded-full bg-muted-foreground/40'
                }
              />
              <div>
                <p className={index === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                  {event.description}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {event.time}{event.location ? ` · ${event.location}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="border-t border-border/70 bg-muted/60 px-4 py-2 text-[11px] text-muted-foreground">
        演示数据 · 仅查询，不会执行退款、改单或其他写操作
      </p>
    </section>
  )
}
