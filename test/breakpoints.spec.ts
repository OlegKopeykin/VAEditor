import { test, expect } from '@playwright/test'
import { setupEditorPage } from './_helpers'

const content = 'Первая строка\nВторая строка\nТретья строка\nЧетвёртая строка\nПятая строка'
const url = 'breakpoints.feature'
const title = 'Точки останова'

test.describe('Breakpoints API', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange + Act (shared)
    await setupEditorPage(page, content, url, title)
  })

  test('setBreakpoints + getBreakpoints round-trip', async ({ page }) => {
    // Arrange (shared) — beforeEach инициализирует editor

    // Act
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

    // Assert
    expect(result).toHaveLength(3)
    const sorted = [...result].sort((a: any, b: any) => a.lineNumber - b.lineNumber)
    expect(sorted[0]).toMatchObject({ lineNumber: 1, enable: true })
    expect(sorted[1]).toMatchObject({ lineNumber: 3, enable: true })
    expect(sorted[2]).toMatchObject({ lineNumber: 5, enable: false })
  })

  test('decorateBreakpoints как алиас setBreakpoints', async ({ page }) => {
    // Arrange (shared) — beforeEach инициализирует editor

    // Act
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.decorateBreakpoints(JSON.stringify([{ lineNumber: 2, codeWidget: '', enable: true }]))
      return JSON.parse(e.getBreakpoints())
    })

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ lineNumber: 2, enable: true })
  })

  test('toggleBreakpoint добавляет breakpoint с enable=true', async ({ page }) => {
    // Arrange (shared) — beforeEach инициализирует editor

    // Act
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setBreakpoints(JSON.stringify([]))
      e.toggleBreakpoint(2)
      return JSON.parse(e.getBreakpoints())
    })

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ lineNumber: 2, enable: true })
    expect(typeof result[0].codeWidget).toBe('string')
  })

  test('setBreakpoints с пустым массивом очищает все', async ({ page }) => {
    // Arrange (shared) — beforeEach инициализирует editor

    // Act
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setBreakpoints(JSON.stringify([
        { lineNumber: 1, codeWidget: '', enable: true },
        { lineNumber: 2, codeWidget: '', enable: true }
      ]))
      e.setBreakpoints(JSON.stringify([]))
      return JSON.parse(e.getBreakpoints())
    })

    // Assert
    expect(result).toHaveLength(0)
  })

  test('toggleBreakpoint удаляет существующий', async ({ page }) => {
    // Arrange (shared) — beforeEach инициализирует editor

    // Act
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setBreakpoints(JSON.stringify([{ lineNumber: 2, codeWidget: '', enable: true }]))
      e.toggleBreakpoint(2)
      return JSON.parse(e.getBreakpoints())
    })

    // Assert
    const onLine2 = result.filter((b: any) => b.lineNumber === 2)
    expect(onLine2).toHaveLength(0)
  })
})
