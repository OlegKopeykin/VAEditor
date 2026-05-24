import { test, expect } from '@playwright/test'
import { setupEditorPage } from './_helpers'

const content = 'Шаг первый\nШаг второй\nШаг третий\nШаг четвёртый\nШаг пятый'
const url = 'progress.feature'
const title = 'Прогресс выполнения'

test.describe('Runtime progress API', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange + Act (shared)
    await setupEditorPage(page, content, url, title)
  })

  test('setCurrentProgress + getCurrentProgress round-trip', async ({ page }) => {
    // Arrange (shared) — beforeEach инициализирует editor

    // Act
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setCurrentProgress(3)
      return e.getCurrentProgress()
    })

    // Assert
    expect(result).toMatchObject({ lineNumber: 3 })
  })

  test('setRuntimeProgress + getRuntimeProgress по статусу — содержит конкретные строки', async ({ page }) => {
    // Arrange (shared) — beforeEach инициализирует editor

    // Act
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setRuntimeProgress('complete', [1, 2])
      e.setRuntimeProgress('error', [4])
      const completeStr = JSON.stringify(e.getRuntimeProgress('complete'))
      const errorStr = JSON.stringify(e.getRuntimeProgress('error'))
      return { completeStr, errorStr }
    })

    // Assert
    // ожидаем что в complete найдутся 1 и 2, в error — 4
    expect(result.completeStr).toMatch(/[\[,]1[,\]\}]/)
    expect(result.completeStr).toMatch(/[\[,]2[,\]\}]/)
    expect(result.errorStr).toMatch(/[\[,]4[,\]\}]/)
  })

  test('nextRuntimeProgress продвигается по строкам', async ({ page }) => {
    // Arrange (shared) — beforeEach инициализирует editor

    // Act
    const positions = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setCurrentProgress(1)
      const p1 = e.getCurrentProgress()
      e.nextRuntimeProgress()
      const p2 = e.getCurrentProgress()
      e.nextRuntimeProgress()
      const p3 = e.getCurrentProgress()
      return { p1, p2, p3 }
    })

    // Assert
    expect(positions.p1.lineNumber).toBe(1)
    expect(positions.p2.lineNumber).toBeGreaterThan(positions.p1.lineNumber)
    expect(positions.p3.lineNumber).toBeGreaterThanOrEqual(positions.p2.lineNumber)
  })

  test('clearRuntimeProgress сбрасывает и позицию, и статусы строк', async ({ page }) => {
    // Arrange (shared) — beforeEach инициализирует editor

    // Act
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setCurrentProgress(2)
      e.setRuntimeProgress('complete', [1])
      e.clearRuntimeProgress()
      const completeAfter = JSON.stringify(e.getRuntimeProgress('complete'))
      return {
        current: e.getCurrentProgress(),
        completeAfter
      }
    })

    // Assert
    expect(result.current).toBeFalsy()
    // complete статус должен быть очищен — в результирующей строке не должно быть 1
    expect(result.completeAfter).not.toMatch(/[\[,]1[,\]\}]/)
  })

  test('setStackStatus + clearStackStatus вызываются успешно', async ({ page }) => {
    // Arrange (shared) — beforeEach инициализирует editor

    // Act
    const errors = await page.evaluate(() => {
      const e = (window as any).__editor__
      const errs: string[] = []
      try { e.setStackStatus(true, 2) } catch (err: any) { errs.push('set2:' + err.message) }
      try { e.setStackStatus(true, 4) } catch (err: any) { errs.push('set4:' + err.message) }
      try { e.clearStackStatus() } catch (err: any) { errs.push('clear:' + err.message) }
      return errs
    })

    // Assert
    expect(errors).toEqual([])
  })

  test('Codicons: setLineCodicon + getLineCodicon + clearCodicons', async ({ page }) => {
    // Arrange (shared) — beforeEach инициализирует editor

    // Act
    const result = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setLineCodicon('2', 'codicon-circle-filled')
      e.setLineCodicon('3', 'codicon-circle-outline')
      const before = {
        line2: e.getLineCodicon(2),
        line3: e.getLineCodicon(3)
      }
      e.clearCodicons()
      const after = {
        line2: e.getLineCodicon(2),
        line3: e.getLineCodicon(3)
      }
      return { before, after }
    })

    // Assert
    expect(result.before.line2).toContain('codicon-circle-filled')
    expect(result.before.line3).toContain('codicon-circle-outline')
    expect(result.after.line2).not.toContain('codicon-circle-filled')
    expect(result.after.line3).not.toContain('codicon-circle-outline')
  })
})
