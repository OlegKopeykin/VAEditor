import { test, expect, Page } from '@playwright/test'
import { TIMEOUTS } from './_helpers'

const markdownText = `# Заголовок

Описание сценария.

## Подзаголовок

- Шаг первый
- Шаг второй
`

async function setupTabs(page: Page) {
  await page.goto('/index.html')
  await page.waitForFunction(() => (window as any).createVanessaTabs !== undefined)
  await page.evaluate(() => {
    const w = window as any
    w.createVanessaTabs()
  })
  await page.waitForTimeout(TIMEOUTS.VIEWER_READY)
}

test.describe('VanessaViwer — markdown viewer', () => {
  test('tabs.view создаёт viewer с типом MarkdownViwer (=2)', async ({ page }) => {
    // Arrange
    await setupTabs(page)

    // Act
    const info = await page.evaluate(({ text }) => {
      const tabs = (window as any).VanessaTabs
      const viewer = tabs.view('viewer.md', 'viewer.md', 'viewer.md', text)
      return {
        type: viewer.type,
        hasDomNode: !!viewer.domNode(),
        tabsCount: tabs.count()
      }
    }, { text: markdownText })

    // Assert
    expect(info.type).toBe(2)
    expect(info.hasDomNode).toBe(true)
    expect(info.tabsCount).toBe(1)
  })

  test('tabs.view на тот же URL возвращает существующую вкладку', async ({ page }) => {
    // Arrange
    await setupTabs(page)

    // Act
    const result = await page.evaluate(({ text }) => {
      const tabs = (window as any).VanessaTabs
      tabs.view('a.md', 'a.md', 'a.md', text)
      const before = tabs.count()
      tabs.view('a.md', 'a.md', 'a.md', text)
      const after = tabs.count()
      return { before, after }
    }, { text: markdownText })

    // Assert
    expect(result.before).toBe(1)
    expect(result.after).toBe(1)
  })

  test('tabs.isMarkdownViwer / isCodeEditor / isDiffEditor отражают активную вкладку', async ({ page }) => {
    // Arrange
    await setupTabs(page)

    // Act #1 — открыть viewer
    const flagsViewer = await page.evaluate(({ text }) => {
      const tabs = (window as any).VanessaTabs
      tabs.view('m.md', 'm.md', 'm.md', text)
      return {
        isMarkdownViwer: tabs.isMarkdownViwer,
        isCodeEditor: tabs.isCodeEditor,
        isDiffEditor: tabs.isDiffEditor
      }
    }, { text: markdownText })

    // Assert #1
    expect(flagsViewer.isMarkdownViwer).toBe(true)
    expect(flagsViewer.isCodeEditor).toBe(false)
    expect(flagsViewer.isDiffEditor).toBe(false)

    // Act #2 — открыть редактор
    const flagsEditor = await page.evaluate(() => {
      const tabs = (window as any).VanessaTabs
      tabs.edit('содержимое', 'e.feature', 'e.feature', 'e', 0, false, true)
      return {
        isMarkdownViwer: tabs.isMarkdownViwer,
        isCodeEditor: tabs.isCodeEditor,
        isDiffEditor: tabs.isDiffEditor
      }
    })

    // Assert #2
    expect(flagsEditor.isMarkdownViwer).toBe(false)
    expect(flagsEditor.isCodeEditor).toBe(true)
    expect(flagsEditor.isDiffEditor).toBe(false)
  })

  test('view-вкладка закрывается через tabs.closeAll', async ({ page }) => {
    // Arrange
    await setupTabs(page)

    // Act
    const result = await page.evaluate(({ text }) => {
      const tabs = (window as any).VanessaTabs
      tabs.view('toclose.md', 'toclose.md', 'toclose.md', text)
      const before = tabs.count()
      tabs.closeAll()
      const after = tabs.count()
      return { before, after }
    }, { text: markdownText })

    // Assert
    expect(result.before).toBe(1)
    expect(result.after).toBe(0)
  })
})
