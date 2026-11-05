// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { OrderStatusCard } from './OrderStatusCard'
import type { OrderLookupResult } from '@/types'

afterEach(cleanup)

const successResult: OrderLookupResult = {
  name: 'order_lookup',
  state: 'success',
  message: '已查询到演示订单',
  order: {
    orderId: 'A20261101001',
    itemName: '便携智能音箱 × 1',
    statusLabel: '运输中',
    carrier: '顺丰速运（演示）',
    trackingNo: 'SF-DEMO-20261101',
    updatedAt: '2026-11-05 10:26',
    timeline: [
      {
        time: '2026-11-05 10:26',
        location: '杭州转运中心',
        description: '包裹已发出，下一站上海转运中心',
      },
      { time: '2026-11-03 14:12', location: '杭州', description: '商家已发货' },
    ],
  },
}

describe('OrderStatusCard', () => {
  it('成功状态展示订单、运单号和完整物流时间线', () => {
    render(<OrderStatusCard result={successResult} />)

    const card = screen.getByLabelText('订单查询结果')
    expect(card).toHaveTextContent('A20261101001')
    expect(card).toHaveTextContent('运输中')
    expect(card).toHaveTextContent('SF-DEMO-20261101')
    expect(screen.getByRole('list', { name: '物流时间线' }).children).toHaveLength(2)
    expect(card).toHaveTextContent('包裹已发出，下一站上海转运中心')
    expect(card).toHaveTextContent('演示数据 · 仅查询，不会执行退款、改单或其他写操作')
  })

  it('空状态说明未查询到订单且不渲染物流时间线', () => {
    render(
      <OrderStatusCard
        result={{ name: 'order_lookup', state: 'empty', message: '请核对订单号后重试' }}
      />,
    )

    expect(screen.getByText('未查询到订单')).toBeInTheDocument()
    expect(screen.getByText('请核对订单号后重试')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '物流时间线' })).not.toBeInTheDocument()
  })
})
