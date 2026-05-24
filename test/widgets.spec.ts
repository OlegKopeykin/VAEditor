import { test, expect, Page } from '@playwright/test'

const keywords = require('../example/Keywords/keywords.json')
const steplist = require('../example/StepList/ru.json')

const content = 'Шаг первый\nШаг второй\nШаг третий\nШаг четвёртый\nШаг пятый'
const url = 'widgets.feature'
const title = 'Виджеты'

const subcodeText = 'Когда я делаю что-то\nИ ещё что-то\nТо результат правильный'

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

test.describe('Виджеты — ошибки и подсценарии', () => {
  test.beforeEach(async ({ page }) => await setup(page))

  test('showRuntimeError не падает и возвращает id', async ({ page }) => {
    const widgetId = await page.evaluate(() => {
      const e = (window as any).__editor__
      return e.showRuntimeError(2, '', 'error-data', 'Текст ошибки выполнения')
    })
    expect(widgetId).toBeTruthy()
  })

  test('clearRuntimeErrors не падает', async ({ page }) => {
    await page.evaluate(() => {
      const e = (window as any).__editor__
      e.showRuntimeError(1, '', 'd1', 'ошибка 1')
      e.showRuntimeError(3, '', 'd2', 'ошибка 2')
      e.clearRuntimeErrors()
    })
  })

  test('showRuntimeCode создаёт subcode widget в DOM', async ({ page }) => {
    await page.evaluate(({ subcodeText }) => {
      const e = (window as any).__editor__
      e.showRuntimeCode(2, subcodeText)
    }, { subcodeText })
    await page.waitForTimeout(100)
    const nodeCount = await page.evaluate(() =>
      document.querySelectorAll('div.vanessa-code-lines>span').length
    )
    expect(nodeCount).toBeGreaterThan(0)
  })

  test('clearRuntimeCodes удаляет DOM элементы subcode', async ({ page }) => {
    await page.evaluate(({ subcodeText }) => {
      const e = (window as any).__editor__
      e.showRuntimeCode(1, subcodeText)
      e.showRuntimeCode(3, subcodeText)
    }, { subcodeText })
    await page.waitForTimeout(100)
    const before = await page.evaluate(() =>
      document.querySelectorAll('div.vanessa-code-lines>span').length
    )
    expect(before).toBeGreaterThan(0)
    await page.evaluate(() => (window as any).__editor__.clearRuntimeCodes())
    await page.waitForTimeout(100)
    const after = await page.evaluate(() =>
      document.querySelectorAll('div.vanessa-code-lines>span').length
    )
    expect(after).toBeLessThan(before)
  })

  test('getWidgets / getLineWidgets возвращают валидный JSON', async ({ page }) => {
    const result = await page.evaluate(({ subcodeText }) => {
      const e = (window as any).__editor__
      e.showRuntimeCode(2, subcodeText)
      e.showRuntimeError(4, '', 'd', 'ошибка')
      return {
        all: e.getWidgets(),
        line2: e.getLineWidgets(2),
        line4: e.getLineWidgets(4)
      }
    }, { subcodeText })
    expect(() => JSON.parse(result.all)).not.toThrow()
    expect(() => JSON.parse(result.line2)).not.toThrow()
    expect(() => JSON.parse(result.line4)).not.toThrow()
  })

  test('setSubcodeFolding не падает', async ({ page }) => {
    await page.evaluate(({ subcodeText }) => {
      const e = (window as any).__editor__
      e.showRuntimeCode(2, subcodeText)
    }, { subcodeText })
    await page.waitForTimeout(100)
    await page.evaluate(() => {
      const e = (window as any).__editor__
      const widgets = JSON.parse(e.getWidgets())
      const id = widgets[0]?.id || widgets[0]?.codeWidget || ''
      e.setSubcodeFolding(2, id, true)
      e.setSubcodeFolding(2, id, false)
    })
  })
})
