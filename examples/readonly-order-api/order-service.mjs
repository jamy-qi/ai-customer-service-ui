// 虚构数据仅用于演示。真实实现应在数据库查询中同时限定 orderId 与 customerId，
// 并使用参数化查询，不能把前端传入的 customerId 作为查询依据。
const orders = [
  {
    orderId: 'A20261101001',
    customerId: 'customer_demo_001',
    itemName: '便携智能音箱 × 1',
    statusLabel: '运输中',
    carrier: '顺丰速运（演示）',
    trackingNo: 'SF-DEMO-20261101',
    updatedAt: '2026-11-05 10:26',
    recipientName: '张小明',
    recipientPhone: '13812348000',
    recipientRegion: '浙江省 杭州市',
    recipientAddressDetail: '西湖区文一路 1 号',
    paymentId: 'pay_internal_001',
    internalNote: '内部备注，绝不能返回客户端',
    timeline: [
      {
        time: '2026-11-05 10:26',
        location: '杭州转运中心',
        description: '包裹已发出，下一站上海转运中心',
      },
      {
        time: '2026-11-04 18:40',
        location: '杭州转运中心',
        description: '包裹已到达转运中心',
      },
      { time: '2026-11-03 14:12', location: '杭州', description: '商家已发货' },
    ],
  },
  {
    orderId: 'B20261101002',
    customerId: 'customer_demo_002',
    itemName: '其他客户的订单',
    statusLabel: '已签收',
    carrier: '演示物流',
    trackingNo: 'DEMO-OTHER-CUSTOMER',
    updatedAt: '2026-11-04 09:00',
    recipientName: '李雷',
    recipientPhone: '13900001111',
    recipientRegion: '上海市',
    recipientAddressDetail: '浦东新区示例路 2 号',
    paymentId: 'pay_internal_002',
    internalNote: '其他客户的内部数据',
    timeline: [],
  },
]

function maskName(name) {
  const chars = Array.from(name)
  return chars.length > 0 ? `${chars[0]}${'*'.repeat(Math.max(1, chars.length - 1))}` : '*'
}

function maskPhone(phone) {
  return /^\d{11}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '***'
}

/**
 * 同时按订单与客户限定读取，并逐字段构建公开 DTO。
 * 未知订单和他人订单都返回 null，避免泄露订单是否存在。
 */
export function getPublicOrderForCustomer(customerId, orderId) {
  const order = orders.find((item) => item.orderId === orderId && item.customerId === customerId)
  if (!order) return null

  return {
    orderId: order.orderId,
    itemName: order.itemName,
    statusLabel: order.statusLabel,
    carrier: order.carrier,
    trackingNo: order.trackingNo,
    updatedAt: order.updatedAt,
    recipient: {
      name: maskName(order.recipientName),
      phone: maskPhone(order.recipientPhone),
      address: `${order.recipientRegion} ****`,
    },
    timeline: order.timeline.map(({ time, location, description }) => ({
      time,
      location,
      description,
    })),
  }
}

/** 将已通过身份与归属校验的结果转换为前端现有 SSE 工具事件。 */
export function toOrderLookupEvent(order) {
  return {
    type: 'tool',
    name: 'order_lookup',
    state: order ? 'success' : 'empty',
    message: order ? '已查询到订单的只读状态。' : '未查询到订单，请核对订单号后重试。',
    ...(order ? { order } : {}),
  }
}
