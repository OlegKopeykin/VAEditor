import { test, expect } from '@playwright/test'

test.describe('Public API — window surface', () => {
  test('Все глобальные функции и объекты доступны в window', async ({ page }) => {
    // Arrange
    await page.goto('/index.html')
    await page.waitForFunction(() => (window as any).createVanessaTabs !== undefined)

    // Act
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

    // Assert
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
    // Arrange
    await page.goto('/index.html')
    await page.waitForFunction(() => (window as any).VanessaGherkinProvider !== undefined)

    // Act
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

    // Assert
    for (const [name, kind] of Object.entries(methods)) {
      expect(kind, `${name} должен быть функцией`).toBe('function')
    }
  })

  test('VanessaEditor (после createVanessaEditor) имеет ключевые методы IPublicVanessaEditor', async ({ page }) => {
    // Arrange
    await page.goto('/index.html')
    await page.waitForFunction(() => (window as any).createVanessaEditor !== undefined)

    // Act
    const methods = await page.evaluate(() => {
      const editor = (window as any).createVanessaEditor('пример', 'turbo-gherkin')
      const required = [
        'getContent', 'setContent', 'getLineContent',
        'getSelection', 'setSelection', 'getSelectedContent',
        'getPosition', 'setPosition', 'insertText',
        'getBreakpoints', 'setBreakpoints', 'toggleBreakpoint',
        'setRuntimeProgress', 'getCurrentProgress', 'nextRuntimeProgress', 'clearRuntimeProgress',
        'showRuntimeError', 'showRuntimeCode', 'clearRuntimeErrors', 'clearRuntimeCodes',
        'setLineCodicon', 'getLineCodicon', 'clearCodicons',
        'setReadOnly', 'setTheme', 'revealLine', 'fireEvent', 'showMessage'
      ]
      const result: Record<string, string> = {}
      for (const m of required) result[m] = typeof (editor as any)[m]
      return result
    })

    // Assert
    for (const [name, kind] of Object.entries(methods)) {
      expect(kind, `editor.${name} должен быть функцией`).toBe('function')
    }
  })

  test('VanessaTabs (после createVanessaTabs) имеет ключевые методы IPublicVanessaTabs', async ({ page }) => {
    // Arrange
    await page.goto('/index.html')
    await page.waitForFunction(() => (window as any).createVanessaTabs !== undefined)

    // Act
    const methods = await page.evaluate(() => {
      const tabs = (window as any).createVanessaTabs()
      const required = [
        'edit', 'diff', 'view', 'welcome', 'find',
        'closeAll', 'close', 'count', 'showContextMenu',
        'previousDiff', 'nextDiff', 'canNavigateDiff'
      ]
      const result: Record<string, string> = {}
      for (const m of required) result[m] = typeof (tabs as any)[m]
      return result
    })

    // Assert
    for (const [name, kind] of Object.entries(methods)) {
      expect(kind, `tabs.${name} должен быть функцией`).toBe('function')
    }
  })
})
