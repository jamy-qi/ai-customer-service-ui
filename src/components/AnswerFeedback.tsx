import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnswerFeedback as FeedbackValue } from '@/types'

interface AnswerFeedbackProps {
  value?: FeedbackValue
  onChange: (value: FeedbackValue) => void
}

export function AnswerFeedback({ value, onChange }: AnswerFeedbackProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="回答满意度反馈">
      <span className="mr-1 text-xs text-muted-foreground">回答有帮助吗？</span>
      {([
        ['up', '有用', '回答有用', ThumbsUp],
        ['down', '没用', '回答没用', ThumbsDown],
      ] as const).map(([feedback, label, ariaLabel, Icon]) => (
        <button
          key={feedback}
          type="button"
          aria-label={ariaLabel}
          aria-pressed={value === feedback}
          onClick={() => onChange(feedback)}
          className={cn(
            'flex min-h-11 items-center gap-1 rounded-md px-2 text-xs transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-8',
            value === feedback
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}
