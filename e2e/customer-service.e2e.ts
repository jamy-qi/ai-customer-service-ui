import { expect, test, type Page } from '@playwright/test'

async function ask(page: Page, question: string) {
  await page.getByPlaceholder(/输入你的问题|输入你的回答/).fill(question)
  await page.getByRole('button', { name: '发送' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('售后咨询展示来源引用，满意度反馈刷新后恢复', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await ask(page, '如何申请退货退款？')
  await expect(page.getByText(/根据演示售后政策/)).toBeVisible()
  await expect(page.getByText('SOURCES · 引用资料（3）')).toBeVisible()

  await page.getByRole('link', { name: '[1]' }).click()
  await expect(page.locator('[id^="source-"]').first()).toHaveClass(/citation-flash/)

  await page.getByRole('button', { name: '回答没用' }).click()
  await expect(page.getByRole('button', { name: '回答没用' })).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.getByRole('button', { name: '回答没用' })).toHaveAttribute('aria-pressed', 'true')
  expect(errors).toEqual([])
})

test('低置信度时拒答，人工交接摘要可复制且支持 Esc 关闭', async ({ page }) => {
  await ask(page, '月球基地如何领取保修？')
  await expect(page.getByText('暂未直接回答')).toBeVisible()
  await expect(page.getByText(/为避免误导，暂未生成答案/)).toBeVisible()
  await expect(page.getByText('我已收到你的咨询。')).toHaveCount(0)

  await page.getByRole('button', { name: '查看人工交接' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const summary = await page.getByLabel('人工交接摘要').inputValue()
  expect(summary).toContain('客户：月球基地如何领取保修？')
  expect(summary).toContain('交接原因：检索资料置信度不足')
  await expect(dialog.getByText(/不会自动通知客服/)).toBeVisible()

  await dialog.getByRole('button', { name: '复制交接摘要' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(summary)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('客户主动转人工时使用对应交接原因', async ({ page }) => {
  await ask(page, '我要转人工')
  await expect(page.getByText('暂未直接回答')).toBeVisible()
  await page.getByRole('button', { name: '查看人工交接' }).click()
  await expect(page.getByLabel('人工交接摘要')).toHaveValue(/交接原因：客户主动要求人工服务/)
})

test('客服训练生成标准解析并自动收录错题', async ({ page }) => {
  await page.getByRole('tab', { name: /客服训练/ }).click()
  await page.getByRole('button', { name: /综合客服考核/ }).click()
  await expect(page.getByRole('heading', { name: /客服考核题/ })).toBeVisible()

  await ask(page, '我会先核对签收时间和商品状态，再提交售后审核')
  await expect(page.getByText('正确答案', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^错题本/ }).click()
  await expect(page.getByRole('dialog')).toContainText('客户在签收商品后的第 6 天申请无理由退货')
  await expect(page.getByRole('button', { name: '显示答案' })).toBeVisible()
})

test('只读订单查询展示物流状态卡并在刷新后恢复', async ({ page }) => {
  await ask(page, '查询订单 A20261101001 的物流')
  const card = page.getByLabel('订单查询结果')
  await expect(card).toContainText('A20261101001')
  await expect(card).toContainText('运输中')
  await expect(card).toContainText('SF-DEMO-20261101')
  await expect(card.getByRole('list', { name: '物流时间线' })).toContainText('包裹已发出')
  await expect(card).toContainText('不会执行退款、改单或其他写操作')

  await page.reload()
  await expect(page.getByLabel('订单查询结果')).toContainText('SF-DEMO-20261101')
  await expect(page.getByRole('list', { name: '物流时间线' })).toContainText('商家已发货')
})

test.describe('移动端', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('375px 未查询到订单时展示空状态且无横向溢出', async ({ page }) => {
    await ask(page, '查询订单 A12345678901 的物流')
    const card = page.getByLabel('订单查询结果')
    await expect(card).toContainText('未查询到订单')
    await expect(card).toContainText('A12345678901')
    await expect(page.getByRole('list', { name: '物流时间线' })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

  test('375px 拒答与交接弹窗无横向溢出，人工入口可触控', async ({ page }) => {
    await ask(page, '月球基地如何领取保修？')
    const handoff = page.getByRole('button', { name: '查看人工交接' })
    await expect(handoff).toBeVisible()
    expect((await handoff.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await handoff.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // 200ms 打开动画结束后再检查最终位置，而非缩放动画的中间帧。
    await expect.poll(async () => {
      const box = await dialog.boundingBox()
      return box ? box.x >= 0 && box.x + box.width <= 375 : false
    }).toBe(true)
    await dialog.getByRole('button', { name: '关闭' }).click()
    await expect(dialog).toHaveCount(0)
  })
})
