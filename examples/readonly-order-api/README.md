# 只读订单 API 接入示例

这是一个零依赖、可运行的 Node.js 参考实现，展示如何向现有 `tool / order_lookup` SSE 事件提供经过**服务端鉴权、订单归属校验和字段脱敏**的数据。所有客户和订单均为虚构数据，不连接真实业务系统，也不提供任何写接口。

## 运行

在项目根目录执行：

```bash
npm run example:order-api
```

服务默认监听 `127.0.0.1:8790`，演示令牌为 `demo-customer-token`。可用环境变量覆盖端口和令牌：

```bash
DEMO_CUSTOMER_TOKEN='replace-with-a-long-random-demo-token' ORDER_API_PORT=8790 npm run example:order-api
```

查询当前演示客户拥有的订单：

```bash
curl -i http://127.0.0.1:8790/api/orders/A20261101001 \
  -H 'Authorization: Bearer demo-customer-token'
```

响应中的收货人信息已脱敏，`customerId`、支付标识、内部备注、完整手机号和详细地址不会返回：

```json
{
  "order": {
    "orderId": "A20261101001",
    "itemName": "便携智能音箱 × 1",
    "statusLabel": "运输中",
    "carrier": "顺丰速运（演示）",
    "trackingNo": "SF-DEMO-20261101",
    "updatedAt": "2026-11-05 10:26",
    "recipient": {
      "name": "张**",
      "phone": "138****8000",
      "address": "浙江省 杭州市 ****"
    },
    "timeline": [
      {
        "time": "2026-11-05 10:26",
        "location": "杭州转运中心",
        "description": "包裹已发出，下一站上海转运中心"
      }
    ]
  }
}
```

## 安全行为

| 场景 | 响应 |
| --- | --- |
| 缺少或持有错误凭证 | `401 UNAUTHORIZED` |
| 订单号格式无效 | `400 INVALID_ORDER_ID` |
| 未知订单或属于其他客户 | 相同的 `404 ORDER_NOT_FOUND`，避免枚举订单归属 |
| POST 等写请求 | `405 METHOD_NOT_ALLOWED`，`Allow: GET` |
| 正常响应 | `Cache-Control: no-store`，仅包含逐字段挑选的公开 DTO |

## 接入现有聊天 SSE

在实际 RAG 后端的 `/api/chat` 流程中，先从已验证的服务端会话取得客户 ID，再查询订单并转换为工具事件：

```js
import { getPublicOrderForCustomer, toOrderLookupEvent } from './order-service.mjs'

// customer.id 必须来自服务端验证后的 session / JWT，不能信任请求中的 customerId。
const order = getPublicOrderForCustomer(customer.id, orderId)
sendEvent(res, toOrderLookupEvent(order))
```

当前前端会展示 `OrderSnapshot` 契约中的订单和物流字段；示例额外返回的 `recipient` 仅用于演示脱敏，不会显示在卡片中。如果业务需要展示，也应只保留脱敏值。

## 替换为真实系统前的必做项

1. **替换演示认证**：使用经过验证的服务端会话或 JWT，校验签发方、受众、签名、过期时间；演示固定令牌不能进入生产环境。
2. **在数据库层限定归属**：用订单号和会话客户 ID 共同查询，使用参数化查询或安全的 ORM 条件，避免 IDOR 和注入。
3. **保持响应白名单**：不要直接序列化数据库实体；支付、成本、内部备注、完整收货信息等字段默认不返回。
4. **补充传输与访问防护**：启用 HTTPS、限流、审计和告警；日志不得记录令牌、完整订单资料或详细地址。
5. **谨慎处理浏览器凭证**：优先同源部署；跨域 Cookie 需要明确的 CORS、SameSite 与 CSRF 防护，不能使用通配符 CORS 携带凭证。
6. **维持只读边界**：退款、改单和工单创建应是独立、重新鉴权并具备防重放与审计能力的接口，不应复用本查询端点。

运行安全行为测试：

```bash
npm test
```
