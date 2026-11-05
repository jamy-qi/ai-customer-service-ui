import { describe, expect, it } from 'vitest'
import { buildHandoffSummary } from './handoff'
import type { ChatMessage } from '@/types'

const messages: ChatMessage[] = [
  { id: 'u1', role: 'user', content: '我的订单怎么办？' },
  {
    id: 'a1',
    role: 'assistant',
    content: '现有资料不足，暂未生成答案。',
    handoff: { reason: 'low_confidence', message: '现有资料不足，暂未生成答案。' },
  },
]

describe('buildHandoffSummary', () => {
  it('包含主题、低置信度原因和最近对话', () => {
    const summary = buildHandoffSummary(messages, 'a1', '订单物流')
    expect(summary).toContain('知识主题：订单物流')
    expect(summary).toContain('交接原因：检索资料置信度不足')
    expect(summary).toContain('客户：我的订单怎么办？')
    expect(summary).toContain('AI 客服：现有资料不足，暂未生成答案。')
  })

  it('正常回答主动转人工时使用客户主动请求原因', () => {
    const normal: ChatMessage[] = [{ id: 'a2', role: 'assistant', content: '这是回答' }]
    expect(buildHandoffSummary(normal, 'a2', null)).toContain('交接原因：客户主动要求人工服务')
  })

  it('交接摘要最多携带目标消息前的六条对话', () => {
    const long: ChatMessage[] = Array.from({ length: 9 }, (_, index) => ({
      id: `m${index}`,
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `内容 ${index}`,
    }))
    const summary = buildHandoffSummary(long, 'm8', null)
    expect(summary).not.toContain('内容 2')
    expect(summary).toContain('内容 3')
    expect(summary).toContain('内容 8')
  })
})
