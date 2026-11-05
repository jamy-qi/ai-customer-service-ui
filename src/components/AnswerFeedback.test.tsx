// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AnswerFeedback } from './AnswerFeedback'

afterEach(cleanup)

describe('AnswerFeedback', () => {
  it('提交有用和没用反馈', () => {
    const onChange = vi.fn()
    render(<AnswerFeedback onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '回答有用' }))
    fireEvent.click(screen.getByRole('button', { name: '回答没用' }))
    expect(onChange.mock.calls).toEqual([['up'], ['down']])
  })

  it('通过 aria-pressed 展示已选择的反馈', () => {
    render(<AnswerFeedback value="down" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '回答没用' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '回答有用' })).toHaveAttribute('aria-pressed', 'false')
  })
})
