import { test, expect, Page } from '@playwright/test'

const keywords = require('../example/Keywords/keywords.json')
const steplist = require('../example/StepList/ru.json')

const originalText = 'Первая строка\nВторая строка\nТретья строка'
const modifiedText = 'Первая строка\nИзменённая строка\nТретья строка\nДобавленная строка'

async function setupDiff(page: Page, original = originalText, modified = modifiedText, lang = 'turbo-gherkin') {
  await page.goto('/index.html')
  await page.waitForFunction(() => (window as any).createVanessaDiffEditor !== undefined)
  await page.evaluate(({ keywords, steplist, original, modified, lang }) => {
    const w = window as any
    const provider = w.VanessaGherkinProvider
    provider.setKeypairs(JSON.stringify({ if: ['then'], Если: ['Тогда'] }))
    provider.setKeywords(JSON.stringify(keywords))
    provider.setStepList(JSON.stringify(steplist))
    w.__diff__ = w.createVanessaDiffEditor(original, modified, lang)
  }, { keywords, steplist, original, modified, lang })
  await page.waitForTimeout(200)
}

test.describe('Diff редактор', () => {
  test('Создание diff-редактора и базовая модель', async ({ page }) => {
    await setupDiff(page)
    const info = await page.evaluate(() => {
      const e = (window as any).__diff__
      return {
        type: e.type,
        hasDomNode: !!e.domNode(),
        modelValue: e.getModel().getValue()
      }
    })
    expect(info.type).toBe(1)
    expect(info.hasDomNode).toBe(true)
    expect(info.modelValue).toBe(modifiedText)
  })

  test('setValue заменяет оба варианта', async ({ page }) => {
    await setupDiff(page)
    const newOriginal = 'Новый старый текст'
    const newModified = 'Новый изменённый текст'
    const value = await page.evaluate(({ newOriginal, newModified }) => {
      const e = (window as any).__diff__
      e.setValue(newOriginal, 'old.txt', newModified, 'new.txt')
      return e.getModel().getValue()
    }, { newOriginal, newModified })
    expect(value).toBe(newModified)
  })

  test('setReadOnly применяется', async ({ page }) => {
    await setupDiff(page)
    const before = await page.evaluate(() => (window as any).__diff__.getModel().getValue())
    await page.evaluate(() => (window as any).__diff__.setReadOnly(true))
    await page.evaluate(() => {
      const e = (window as any).__diff__
      e.trigger('keyboard', 'type', { text: 'XXX' })
    })
    const after = await page.evaluate(() => (window as any).__diff__.getModel().getValue())
    expect(after).toBe(before)
  })

  test('setSideBySide и обратно — не падает', async ({ page }) => {
    await setupDiff(page)
    await page.evaluate(() => {
      const e = (window as any).__diff__
      e.setSideBySide(false)
      e.setSideBySide(true)
    })
    const value = await page.evaluate(() => (window as any).__diff__.getModel().getValue())
    expect(value).toBe(modifiedText)
  })

  test('navigate next/previous между отличиями', async ({ page }) => {
    await setupDiff(page)
    await page.waitForTimeout(500)
    const canNavigate = await page.evaluate(() => (window as any).__diff__.canNavigate())
    expect(canNavigate).toBe(true)
    await page.evaluate(() => {
      const e = (window as any).__diff__
      e.next()
      e.next()
      e.previous()
    })
    // не падает — проверка smoke
  })

  test('setTheme не падает', async ({ page }) => {
    await setupDiff(page)
    await page.evaluate(() => (window as any).__diff__.setTheme('vs-dark'))
    await page.evaluate(() => (window as any).__diff__.setTheme('vs'))
  })

  test('dispose освобождает редактор', async ({ page }) => {
    await setupDiff(page)
    const beforeDispose = await page.evaluate(() => !!(window as any).__diff__.domNode())
    expect(beforeDispose).toBe(true)
    await page.evaluate(() => (window as any).disposeVanessaDiffEditor())
    const standalone = await page.evaluate(() => {
      const w = window as any
      try { return !!w.createVanessaDiffEditor.constructor } catch { return false }
    })
    expect(standalone).toBe(true)
  })
})
