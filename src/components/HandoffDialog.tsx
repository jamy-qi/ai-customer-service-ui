import { useState } from 'react'
import { Check, Copy, Headphones } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface HandoffDialogProps {
  summary: string
  /** 拒答消息后使用更明确的入口文案 */
  fallback?: boolean
}

export function HandoffDialog({ summary, fallback = false }: HandoffDialogProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      toast.success('交接摘要已复制，可发送给客服人员')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('复制失败，请手动选择摘要复制')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setCopied(false)
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={fallback ? 'default' : 'ghost'}
          size="sm"
          className={
            fallback
              ? 'h-11 rounded-full px-4 md:h-9'
              : 'h-11 rounded-md px-3 text-xs text-muted-foreground hover:text-primary md:h-8 md:px-2'
          }
        >
          <Headphones className="h-3.5 w-3.5" />
          {fallback ? '查看人工交接' : '转人工'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            人工交接（演示）
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            当前项目尚未连接真实坐席或工单系统，不会自动通知客服。你可以复制以下摘要，交给人工客服继续处理。
          </DialogDescription>
        </DialogHeader>
        <Textarea
          readOnly
          aria-label="人工交接摘要"
          value={summary}
          className="min-h-56 resize-none bg-muted text-xs leading-relaxed"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              关闭
            </Button>
          </DialogClose>
          <Button type="button" onClick={() => void handleCopy()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? '已复制' : '复制交接摘要'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
