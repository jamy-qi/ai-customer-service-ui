import { createHash, timingSafeEqual } from 'node:crypto'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPublicOrderForCustomer } from './order-service.mjs'

const DEMO_CUSTOMER_ID = 'customer_demo_001'
const DEFAULT_TOKEN = 'demo-customer-token'

function json(res, status, data, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  })
  res.end(JSON.stringify(data))
}

function tokenDigest(token) {
  return createHash('sha256').update(token).digest()
}

function tokensEqual(provided, expected) {
  return timingSafeEqual(tokenDigest(provided), tokenDigest(expected))
}

function readBearerToken(req) {
  const authorization = req.headers.authorization
  if (typeof authorization !== 'string') return null
  const match = authorization.match(/^Bearer ([^\s]+)$/i)
  return match?.[1] ?? null
}

/**
 * 独立、零依赖的只读订单 API 示例。
 * 仅监听本机；演示令牌和客户数据都不能用于生产环境。
 */
export function createOrderApiServer({ demoToken = process.env.DEMO_CUSTOMER_TOKEN ?? DEFAULT_TOKEN } = {}) {
  if (typeof demoToken !== 'string' || demoToken.length < 16) {
    throw new Error('DEMO_CUSTOMER_TOKEN 至少需要 16 个字符')
  }

  return http.createServer((req, res) => {
    if (req.method !== 'GET') {
      json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持只读查询' } }, { Allow: 'GET' })
      return
    }

    const url = new URL(req.url ?? '/', 'http://localhost')
    const match = url.pathname.match(/^\/api\/orders\/([^/]+)$/)
    if (!match) {
      json(res, 404, { error: { code: 'NOT_FOUND', message: '接口不存在' } })
      return
    }

    // customerId 只能来自服务端验证后的会话，不能读取查询参数或请求体。
    const token = readBearerToken(req)
    if (!token || !tokensEqual(token, demoToken)) {
      json(
        res,
        401,
        { error: { code: 'UNAUTHORIZED', message: '请先登录后再查询订单' } },
        { 'WWW-Authenticate': 'Bearer realm="readonly-order-api"' },
      )
      return
    }

    let orderId
    try {
      orderId = decodeURIComponent(match[1]).toUpperCase()
    } catch {
      json(res, 400, { error: { code: 'INVALID_ORDER_ID', message: '订单号格式无效' } })
      return
    }
    if (!/^[A-Z]\d{11}$/.test(orderId)) {
      json(res, 400, { error: { code: 'INVALID_ORDER_ID', message: '订单号格式无效' } })
      return
    }

    const order = getPublicOrderForCustomer(DEMO_CUSTOMER_ID, orderId)
    if (!order) {
      json(res, 404, { error: { code: 'ORDER_NOT_FOUND', message: '未查询到订单' } })
      return
    }
    json(res, 200, { order })
  })
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const port = Number(process.env.ORDER_API_PORT ?? 8790)
  const server = createOrderApiServer()
  server.listen(port, '127.0.0.1', () => {
    console.log(`Readonly order API example: http://127.0.0.1:${port}`)
    console.log('Demo only: replace token authentication and in-memory data before production use.')
  })
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close(() => process.exit(0)))
  }
}
