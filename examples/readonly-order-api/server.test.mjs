import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createOrderApiServer } from './server.mjs'
import { getPublicOrderForCustomer, toOrderLookupEvent } from './order-service.mjs'

const token = 'test-token-123456'
let server
let baseUrl

beforeAll(async () => {
  server = createOrderApiServer({ demoToken: token })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
})

function request(path, options) {
  return fetch(`${baseUrl}${path}`, options)
}

describe('只读订单 API 示例', () => {
  it.each([undefined, 'Bearer wrong-token-123456'])('缺失或错误凭证时返回 401', async (authorization) => {
    const res = await request('/api/orders/A20261101001', {
      headers: authorization ? { Authorization: authorization } : {},
    })
    expect(res.status).toBe(401)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: '请先登录后再查询订单' },
    })
  })

  it('订单归属校验通过时只返回脱敏后的公开字段', async () => {
    const res = await request('/api/orders/A20261101001', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.order).toMatchObject({
      orderId: 'A20261101001',
      trackingNo: 'SF-DEMO-20261101',
      recipient: { name: '张**', phone: '138****8000', address: '浙江省 杭州市 ****' },
    })
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain('customerId')
    expect(serialized).not.toContain('paymentId')
    expect(serialized).not.toContain('internalNote')
    expect(serialized).not.toContain('13812348000')
    expect(serialized).not.toContain('西湖区文一路 1 号')
  })

  it('他人订单与未知订单返回相同的 404，避免枚举订单归属', async () => {
    for (const orderId of ['B20261101002', 'A99999999999']) {
      const res = await request(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: { code: 'ORDER_NOT_FOUND', message: '未查询到订单' } })
    }
  })

  it('拒绝无效订单号与写请求', async () => {
    const invalid = await request('/api/orders/not-an-order', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(invalid.status).toBe(400)

    const write = await request('/api/orders/A20261101001', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(write.status).toBe(405)
    expect(write.headers.get('allow')).toBe('GET')
  })

  it('公开 DTO 可直接转换为现有 order_lookup SSE 事件', () => {
    const order = getPublicOrderForCustomer('customer_demo_001', 'A20261101001')
    expect(toOrderLookupEvent(order)).toMatchObject({
      type: 'tool',
      name: 'order_lookup',
      state: 'success',
      order: { orderId: 'A20261101001' },
    })
    expect(toOrderLookupEvent(null)).toEqual({
      type: 'tool',
      name: 'order_lookup',
      state: 'empty',
      message: '未查询到订单，请核对订单号后重试。',
    })
  })
})
