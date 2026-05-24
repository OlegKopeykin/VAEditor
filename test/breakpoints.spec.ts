import { test, expect, Page } from '@playwright/test'

const keywords = require('../example/Keywords/keywords.json')
const steplist = require('../example/StepList/ru.json')

const content = 'Первая строка\nВторая строка\nТретья строка\nЧетвёртая строка\nПятая строка'
const url = 'breakpoints.feature'
const title = 'Точки останова'

async function setup(page: Page) {
  await page.goto('/index.html')
  await page.waitForFunction(() => (window as any).createVanessaTabs !== undefined)
  await page.evaluate(({ keywords, steplist, content, url, title }) => {
    const w = window as any
    const provider = w.VanessaGherkinProvider
    provider.setKeypairs(JSON.stringify({ if: ['then'], Если: ['Тогда'] }))
    provider.setKeywords(JSON.stringify(keywords))
    provider.setStepList(JSON.stringify(steplist))
    w.createVanessaTabs()
    w.__editor__ = w.VanessaTabs.edit(content, url, url, title, 0, false, true)
  }, { keywords, steplist, content, url, title })
  await page.waitForTimeout(100)
}

test.describe('Breakpoints API', () => {
  test.beforeEach(async ({ page }) => await setup(page))

  test('setBreakpoints + getBreakpoints round-trip', async ({ page }) => {
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      const input = [
        { lineNumber: 1, codeWidget: '', enable: true },
        { lineNumber: 3, codeWidget: '', enable: true },
        { lineNumber: 5, codeWidget: '', enable: false }
      ]
      e.setBreakpoints(JSON.stringify(input))
      return JSON.parse(e.getBreakpoints())
    })
    expect(result).toHaveLength(3)
    const sorted = [...result].sort((a: any, b: any) => a.lineNumber - b.lineNumber)
    expect(sorted[0]).toMatchObject({ lineNumber: 1, enable: true })
    expect(sorted[1]).toMatchObject({ lineNumber: 3, enable: true })
    expect(sorted[2]).toMatchObject({ lineNumber: 5, enable: false })
  })

  test('decorateBreakpoints как алиас setBreakpoints', async ({ page }) => {
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.decorateBreakpoints(JSON.stringify([{ lineNumber: 2, codeWidget: '', enable: true }]))
      return JSON.parse(e.getBreakpoints())
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ lineNumber: 2, enable: true })
  })

  test('toggleBreakpoint добавляет на пустой строке', async ({ page }) => {
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setBreakpoints(JSON.stringify([]))
      e.toggleBreakpoint(2)
      return JSON.parse(e.getBreakpoints())
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ lineNumber: 2 })
  })

  test('setBreakpoints с пустым массивом очищает все', async ({ page }) => {
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setBreakpoints(JSON.stringify([
        { lineNumber: 1, codeWidget: '', enable: true },
        { lineNumber: 2, codeWidget: '', enable: true }
      ]))
      e.setBreakpoints(JSON.stringify([]))
      return JSON.parse(e.getBreakpoints())
    })
    expect(result).toHaveLength(0)
  })

  test('toggleBreakpoint удаляет существующий', async ({ page }) => {
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setBreakpoints(JSON.stringify([{ lineNumber: 2, codeWidget: '', enable: true }]))
      e.toggleBreakpoint(2)
      return JSON.parse(e.getBreakpoints())
    })
    const onLine2 = result.filter((b: any) => b.lineNumber === 2)
    expect(onLine2).toHaveLength(0)
  })
})
