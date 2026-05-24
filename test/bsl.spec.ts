import { test, expect } from '@playwright/test'

test.describe('Язык BSL (1С:Предприятие)', () => {
  test('BSL зарегистрирован в monaco', async ({ page }) => {
    await page.goto('/index.html')
    await page.waitForFunction(() => (window as any).monaco !== undefined)
    const languages = await page.evaluate(() =>
      (window as any).monaco.languages.getLanguages().map((l: any) => l.id)
    )
    expect(languages).toContain('bsl')
  })

  test('Модель BSL создаётся с указанным языком', async ({ page }) => {
    await page.goto('/index.html')
    await page.waitForFunction(() => (window as any).monaco !== undefined)
    const result = await page.evaluate(() => {
      const m = (window as any).monaco
      const source = 'Процедура Тест()\n\tСообщить("Привет");\nКонецПроцедуры'
      const model = m.editor.createModel(source, 'bsl')
      return {
        languageId: model.getLanguageId(),
        lineCount: model.getLineCount(),
        firstLine: model.getLineContent(1)
      }
    })
    expect(result.languageId).toBe('bsl')
    expect(result.lineCount).toBe(3)
    expect(result.firstLine).toBe('Процедура Тест()')
  })
})
