import http from 'node:http'

const port = Number(process.env.MOCK_PORT ?? 8787)
const tokenDelay = Math.max(0, Number(process.env.MOCK_DELAY ?? 28))
const llmOff = process.env.MOCK_LLM === 'off'
const forceError = process.env.MOCK_ERROR === '1'

const meta = {
  kbId: 'customer-service-demo',
  appName: 'AI 智能客服 Demo',
  tagline: '基于企业知识库，为客户提供可追溯的即时解答',
  modes: ['qa', 'interview'],
  examples: ['如何申请退货退款？', '查询订单 A20261101001 的物流', '如何重置设备并重新配网？'],
  interviewGuides: [
    { title: '售后政策考核', desc: '检验退换货政策与沟通口径', topic: '售后政策' },
    { title: '产品使用考核', desc: '检验设备配置与故障排查能力', topic: '产品使用' },
  ],
}

const topics = [
  { name: '售后政策', count: 24 },
  { name: '订单物流', count: 28 },
  { name: '产品使用', count: 18 },
  { name: '技术支持', count: 26 },
]

const stats = {
  chunks: 96,
  llm_model: llmOff ? 'unavailable' : 'demo-service-llm',
  embed_model: 'demo-embedding',
  topics,
}

const health = {
  status: llmOff ? 'degraded' : 'ready',
  index: { ok: true, chunks: 96, error: null },
  llm: {
    ok: !llmOff,
    model: 'demo-service-llm',
    base: 'built-in-mock',
    error: llmOff ? 'MOCK_LLM=off' : null,
  },
}

const sources = [
  {
    title: '售后政策与退换货说明',
    text: '演示政策规定：商品签收后 7 天内可申请无理由退货，商品及配件需保持完好。质量问题由商家承担退货运费，退款在验收后原路退回。',
    source: 'knowledge/after-sales-policy.md',
    score: 0.93,
  },
  {
    title: '订单与物流异常处理',
    text: '物流超过 48 小时未更新时，先核对收货地址和承运单号，再生成物流核查工单。演示环境不会查询真实订单或创建真实工单。',
    source: 'knowledge/shipping-guide.md',
    score: 0.84,
  },
  {
    title: '设备重置与配网指南',
    text: '设备通电后长按重置键 5 秒，指示灯进入快闪状态后，在应用中添加设备并连接 2.4 GHz Wi-Fi。操作前应备份需要保留的配置。',
    source: 'knowledge/device-setup.md',
    score: 0.76,
  },
]

const demoOrder = {
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
    {
      time: '2026-11-04 18:40',
      location: '杭州转运中心',
      description: '包裹已到达转运中心',
    },
    {
      time: '2026-11-03 14:12',
      location: '杭州',
      description: '商家已发货',
    },
  ],
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(data))
}

function sendEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function readBody(req) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 1_000_000) throw new Error('请求体过大')
  }
  return JSON.parse(raw || '{}')
}

function answerFor(question) {
  if (question.includes('退货') || question.includes('退款')) {
    return '根据演示售后政策，商品签收后 **7 天内**可以申请无理由退货，商品、配件和包装需保持完好。[1]\n\n处理步骤：\n\n1. 在订单详情中选择“申请售后”；\n2. 填写退货原因并提交商品照片；\n3. 审核通过后按提供的地址寄回；\n4. 验收完成后，退款将原路退回。\n\n如果是质量问题，退货运费由商家承担。这里是演示环境，不会操作真实订单。'
  }
  if (question.includes('物流') || question.includes('订单')) {
    return '如果物流 **超过 48 小时没有更新**，建议先核对收货地址与承运单号，再联系承运方确认是否出现滞留或异常件。[2]\n\n仍无法解决时，可以整理订单号、承运单号和最新物流截图，提交物流核查工单。当前演示不会查询真实订单或创建真实工单。'
  }
  if (question.includes('人工') || question.includes('客服')) {
    return '当前是 AI 客服演示环境，**尚未接入人工坐席或工单系统**。实际部署时，可以在后端将此类请求路由到人工服务，并携带当前对话历史，减少客户重复描述。'
  }
  if (question.includes('重置') || question.includes('配网') || question.includes('设备')) {
    return '可以按照以下步骤重新配网：[3]\n\n1. 备份需要保留的设备配置；\n2. 保持设备通电，长按重置键 **5 秒**；\n3. 等待指示灯进入快闪状态；\n4. 在应用中添加设备，并连接 **2.4 GHz Wi-Fi**。\n\n如果指示灯没有进入快闪状态，请检查供电后再次尝试。'
  }
  return '我已收到你的咨询。当前演示知识库主要覆盖 **售后政策、订单物流、产品使用和技术支持**。你可以选择一个主题继续提问，我会给出回答并标注对应资料来源。'
}

function interviewAnswer(question, topic) {
  const scope = topic ? `（${topic}）` : ''
  if (question.trim() === '开始') {
    return `### 客服考核题 ${scope}\n\n客户在签收商品后的第 6 天申请无理由退货，但外包装已经丢弃。作为客服，你会如何判断是否符合演示售后政策，并向客户说明？`
  }
  return `你的回答已收到。处理售后咨询时，既要把控政策边界，也要清楚说明下一步操作。\n\n### 正确答案\n客户处于签收后 7 天内，可以申请无理由退货，但商品、配件和包装需保持完好。外包装丢弃可能影响审核，应请客户补充商品及配件照片，提交售后审核，不能直接承诺一定通过。\n\n### 解析\n客服应先确认签收时间和退货原因，再核对商品完好情况。沟通时使用“可以申请，最终以售后审核为准”，避免过度承诺。\n\n下一题：客户反馈物流三天没有更新，情绪激动。你会如何安抚并处理？`
}

async function handleChat(req, res) {
  let body
  try {
    body = await readBody(req)
  } catch {
    json(res, 400, { error: '请求 JSON 格式无效' })
    return
  }

  if (body.topic && !topics.some((item) => item.name === body.topic)) {
    json(res, 400, { code: 'UNKNOWN_TOPIC', message: '未知主题', retryable: false })
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()

  let closed = false
  req.on('close', () => {
    closed = true
  })

  sendEvent(res, { type: 'status', phase: 'retrieving' })
  await sleep(Math.max(tokenDelay, 80))
  if (closed) return

  if (forceError) {
    sendEvent(res, {
      type: 'error',
      code: 'LLM_STREAM_FAILED',
      message: '演示错误：模型连接中断，请点击重试',
      retryable: true,
    })
    sendEvent(res, { type: 'done' })
    res.end()
    return
  }

  const question = String(body.question ?? '')
  const interview = body.mode === 'interview'
  const orderId = !interview
    ? (question.match(/[A-Za-z]\d{11}/)?.[0].toUpperCase() ?? null)
    : null
  const orderFound = orderId === demoOrder.orderId
  const userRequested = !interview && /人工|真人客服/.test(question)
  const supported = Boolean(orderId) || ['退货', '退款', '物流', '订单', '重置', '配网', '设备'].some((keyword) =>
    question.includes(keyword),
  )
  const handoffReason = userRequested ? 'user_requested' : !interview && !supported ? 'low_confidence' : null

  if (!interview) {
    const resultSources = userRequested
      ? []
      : handoffReason
        ? sources.slice(0, 1).map((source) => ({ ...source, score: 0.28 }))
        : sources
    sendEvent(res, { type: 'sources', sources: resultSources })
  }

  if (handoffReason) {
    sendEvent(res, {
      type: 'handoff',
      reason: handoffReason,
      message: userRequested
        ? '已为你准备人工交接入口。演示环境不会通知真实坐席，你可以复制对话摘要后交给客服人员。'
        : '当前知识库中没有足够可靠的资料支持回答。为避免误导，暂未生成答案，你可以转人工继续处理。',
    })
    sendEvent(res, { type: 'done' })
    res.end()
    return
  }

  if (orderId) {
    sendEvent(res, {
      type: 'tool',
      name: 'order_lookup',
      state: orderFound ? 'success' : 'empty',
      message: orderFound
        ? `已查询到演示订单 ${orderId} 的只读状态。`
        : `未查询到演示订单 ${orderId}，请核对订单号后重试。`,
      order: orderFound ? demoOrder : undefined,
    })
  }

  sendEvent(res, { type: 'status', phase: llmOff ? 'fallback' : 'generating' })
  const answer = interview
    ? interviewAnswer(question, body.topic)
    : orderId
      ? orderFound
        ? `订单 **${orderId}** 当前处于 **${demoOrder.statusLabel}** 状态，最新物流为：${demoOrder.timeline[0].description}。[2]\n\n下方状态卡展示了完整演示物流节点。这里是只读查询，不会执行退款、改单或其他写操作。`
        : `暂未查询到订单 **${orderId}** 的演示记录，请核对订单号。你也可以使用演示订单号 **${demoOrder.orderId}** 体验只读物流查询。`
      : llmOff
        ? `本地模型暂不可用，以下为知识库摘录：\n\n${sources[0].text}[1]`
        : answerFor(question)

  for (const char of Array.from(answer)) {
    if (closed) return
    sendEvent(res, { type: 'token', content: char })
    if (tokenDelay) await sleep(tokenDelay)
  }
  if (!closed) {
    sendEvent(res, { type: 'done' })
    res.end()
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    })
    res.end()
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/meta') return json(res, 200, meta)
  if (req.method === 'GET' && url.pathname === '/api/stats') return json(res, 200, stats)
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, health)
  if (req.method === 'POST' && url.pathname === '/api/chat') return handleChat(req, res)
  json(res, 404, { error: 'Not Found' })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Mock API ready at http://127.0.0.1:${port}`)
  if (llmOff) console.log('MOCK_LLM=off: streaming fallback responses')
  if (forceError) console.log('MOCK_ERROR=1: streaming retryable errors')
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
