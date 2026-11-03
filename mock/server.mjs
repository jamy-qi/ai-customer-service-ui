import http from 'node:http'

const port = Number(process.env.MOCK_PORT ?? 8787)
const tokenDelay = Math.max(0, Number(process.env.MOCK_DELAY ?? 28))
const llmOff = process.env.MOCK_LLM === 'off'
const forceError = process.env.MOCK_ERROR === '1'

const meta = {
  kbId: 'demo',
  appName: '知识库问答 Demo',
  tagline: '一个后端无关、可流式交互的 RAG 聊天工作台',
  modes: ['qa', 'interview'],
  examples: ['什么是 RAG？它由哪些步骤组成？', '如何评估检索结果的质量？', '产品支持哪些使用方式？'],
  interviewGuides: [
    { title: 'RAG 专题面试', desc: '围绕检索、生成与评估连续出题', topic: '技术文档' },
    { title: '产品知识面试', desc: '检查对产品功能与边界的理解', topic: '产品手册' },
  ],
}

const topics = [
  { name: '产品手册', count: 18 },
  { name: '技术文档', count: 32 },
  { name: '常见问题', count: 12 },
]

const stats = {
  chunks: 62,
  llm_model: llmOff ? 'unavailable' : 'demo-llm',
  embed_model: 'demo-embedding',
  topics,
}

const health = {
  status: llmOff ? 'degraded' : 'ready',
  index: { ok: true, chunks: 62, error: null },
  llm: {
    ok: !llmOff,
    model: 'demo-llm',
    base: 'built-in-mock',
    error: llmOff ? 'MOCK_LLM=off' : null,
  },
}

const sources = [
  {
    title: 'RAG 技术概览',
    text: '检索增强生成先按问题召回相关知识片段，再把片段与用户问题一起交给生成模型。引用标记用于把回答映射回原始资料。',
    source: 'docs/rag-overview.md',
    score: 0.91,
  },
  {
    title: '检索质量评估',
    text: '可以从命中率、相关度、上下文覆盖率和最终回答的事实一致性等维度评估系统，不能只看生成文本是否流畅。',
    source: 'docs/retrieval-evaluation.md',
    score: 0.78,
  },
  {
    title: '产品快速入门',
    text: '系统支持知识库问答、主题过滤、Top-K 调整、会话恢复和模拟面试。所有本地演示数据均保存在当前浏览器中。',
    source: 'docs/getting-started.md',
    score: 0.67,
  },
]

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
  if (question.includes('评估') || question.includes('质量')) {
    return '评估 RAG 检索质量时，建议同时观察 **召回命中率、片段相关度和上下文覆盖率**，再检查最终回答是否被资料支持。只看语言流畅度，无法发现“答得顺但没有依据”的问题。[2]\n\n可以先建立一小组带标准答案的问题，固定 Top-K 后逐轮对比实验结果。'
  }
  if (question.includes('产品') || question.includes('使用方式')) {
    return '这个演示工作台支持 **知识库问答、主题过滤、Top-K 调整、会话恢复和模拟面试**。[3] 会话与错题本只保存在当前浏览器的 localStorage 中，不会上传或跨设备同步。'
  }
  return '**RAG（检索增强生成）** 把“找资料”和“写回答”拆成两个阶段：先根据问题检索知识库，再将相关片段作为上下文交给生成模型。[1]\n\n典型流程是：\n\n1. 文档切分并建立向量索引；\n2. 根据问题召回 Top-K 片段；\n3. 将片段注入提示词并生成回答；\n4. 用引用标记把结论关联到来源。[1]'
}

function interviewAnswer(question, topic) {
  const scope = topic ? `（${topic}）` : ''
  if (question.trim() === '开始') {
    return `### 面试题 ${scope}\n\n请解释 RAG 中“检索”与“生成”各自的职责，并说明为什么要把来源引用展示给用户。`
  }
  return `你的回答已收到。核心概念需要说清，同时也要关注答案是否能被资料验证。\n\n### 正确答案\n检索负责从知识库中找出与问题相关的证据，生成负责基于证据组织自然语言回答。展示来源可以降低核验成本，并帮助用户发现无依据或低相关度的内容。\n\n### 解析\n一个可靠的 RAG 系统不仅要“能回答”，还要让用户知道“依据是什么”。评估时应分别检查召回质量与生成的事实一致性。\n\n下一题：如果提高 Top-K 后回答仍然不准确，你会从哪些环节排查？`
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

  const interview = body.mode === 'interview'
  if (!interview) sendEvent(res, { type: 'sources', sources })
  sendEvent(res, { type: 'status', phase: llmOff ? 'fallback' : 'generating' })

  const answer = interview
    ? interviewAnswer(String(body.question ?? ''), body.topic)
    : llmOff
      ? `本地模型暂不可用，以下为知识库摘录：\n\n${sources[0].text}[1]`
      : answerFor(String(body.question ?? ''))

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
