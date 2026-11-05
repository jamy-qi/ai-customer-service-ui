import type { ChatMessage, HandoffReason } from '@/types'

const REASON_LABEL: Record<HandoffReason, string> = {
  low_confidence: '检索资料置信度不足',
  user_requested: '客户主动要求人工服务',
  knowledge_gap: '知识库无法覆盖当前问题',
}

/** 生成可复制给真实坐席的最近对话摘要；前端演示不会自行发送或创建工单。 */
export function buildHandoffSummary(
  messages: ChatMessage[],
  messageId: string,
  topic: string | null,
): string {
  const targetIndex = messages.findIndex((message) => message.id === messageId)
  const end = targetIndex >= 0 ? targetIndex + 1 : messages.length
  const target = targetIndex >= 0 ? messages[targetIndex] : null
  const reason = target?.handoff?.reason ?? 'user_requested'
  const recent = messages
    .slice(Math.max(0, end - 6), end)
    .filter((message) => message.content.trim() && !message.error)

  const transcript = recent.length
    ? recent
        .map((message) => `${message.role === 'user' ? '客户' : 'AI 客服'}：${message.content.trim()}`)
        .join('\n\n')
    : '暂无可用对话内容'

  return [
    'AI 客服人工交接摘要',
    `知识主题：${topic ?? '不限定'}`,
    `交接原因：${REASON_LABEL[reason]}`,
    '',
    transcript,
  ].join('\n')
}
