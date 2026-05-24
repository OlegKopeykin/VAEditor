import { test, expect } from '@playwright/test'

test.describe('Public API — window surface', () => {
  test('Все глобальные функции и объекты доступны в window', async ({ page }) => {
    await page.goto('/index.html')
    await page.waitForFunction(() => (window as any).createVanessaTabs !== undefined)
    const result = await page.evaluate(() => {
      const w = window as any
      return {
        createVanessaTabs: typeof w.createVanessaTabs,
        createVanessaEditor: typeof w.createVanessaEditor,
        createVanessaDiffEditor: typeof w.createVanessaDiffEditor,
        disposeVanessaAll: typeof w.disposeVanessaAll,
        disposeVanessaTabs: typeof w.disposeVanessaTabs,
        disposeVanessaEditor: typeof w.disposeVanessaEditor,
        disposeVanessaDiffEditor: typeof w.disposeVanessaDiffEditor,
        useVanessaDebugger: typeof w.useVanessaDebugger,
        VanessaGherkinProvider: typeof w.VanessaGherkinProvider
      }
    })
    expect(result.createVanessaTabs).toBe('function')
    expect(result.createVanessaEditor).toBe('function')
    expect(result.createVanessaDiffEditor).toBe('function')
    expect(result.disposeVanessaAll).toBe('function')
    expect(result.disposeVanessaTabs).toBe('function')
    expect(result.disposeVanessaEditor).toBe('function')
    expect(result.disposeVanessaDiffEditor).toBe('function')
    expect(result.useVanessaDebugger).toBe('function')
    expect(result.VanessaGherkinProvider).toBe('object')
  })

  test('VanessaGherkinProvider имеет все методы из контракта', async ({ page }) => {
    await page.goto('/index.html')
    await page.waitForFunction(() => (window as any).VanessaGherkinProvider !== undefined)
    const methods = await page.evaluate(() => {
      const p = (window as any).VanessaGherkinProvider
      const required = [
        'setKeypairs', 'setKeywords', 'setMetatags', 'setMessages',
        'setStepList', 'setElements', 'setVariables', 'setImports',
        'setErrorLinks', 'setSuggestWidgetWidth'
      ]
      const result: Record<string, string> = {}
      for (const m of required) result[m] = typeof p[m]
      return result
    })
    for (const [name, kind] of Object.entries(methods)) {
      expect(kind, `${name} должен быть функцией`).toBe('function')
    }
  })
})
