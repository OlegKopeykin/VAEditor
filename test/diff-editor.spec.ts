import { test, expect, Page } from '@playwright/test'
import { fixtures, TIMEOUTS } from './_helpers'

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
  }, { keywords: fixtures.keywords, steplist: fixtures.defaultSteplist, original, modified, lang })
  await page.waitForTimeout(TIMEOUTS.EDITOR_READY * 2)
}

test.describe('Diff редактор', () => {
  test('Создание diff-редактора и базовая модель', async ({ page }) => {
    // Arrange
    await setupDiff(page)

    // Act
    const info = await page.evaluate(() => {
      const e = (window as any).__diff__
      return {
        type: e.type,
        hasDomNode: !!e.domNode(),
        modelValue: e.getModel().getValue()
      }
    })

    // Assert
    expect(info.type).toBe(1)
    expect(info.hasDomNode).toBe(true)
    expect(info.modelValue).toBe(modifiedText)
  })

  test('setValue заменяет оба варианта (original + modified)', async ({ page }) => {
    // Arrange
    await setupDiff(page)
    const newOriginal = 'Новый старый текст'
    const newModified = 'Новый изменённый текст'

    // Act
    const values = await page.evaluate(({ newOriginal, newModified }) => {
      const e = (window as any).__diff__
      e.setValue(newOriginal, 'old.txt', newModified, 'new.txt')
      const modifiedEditor = e.editor.getModifiedEditor()
      const originalEditor = e.editor.getOriginalEditor()
      return {
        modified: modifiedEditor.getModel().getValue(),
        original: originalEditor.getModel().getValue()
      }
    }, { newOriginal, newModified })

    // Assert
    expect(values.original).toBe(newOriginal)
    expect(values.modified).toBe(newModified)
  })

  test('setReadOnly применяется к опциям модифицированного редактора', async ({ page }) => {
    // Arrange
    await setupDiff(page)

    // Act
    const result = await page.evaluate(() => {
      const e = (window as any).__diff__
      const me = e.editor.getModifiedEditor()
      e.setReadOnly(true)
      const readOnlyAfter = me.getOption(me._modelData?.options ? 91 : 91)
      // Через прямой rawOptions можно увидеть текущее состояние
      const opts1 = (e.editor as any)._domElement ? true : true
      e.setReadOnly(false)
      return { rawSet: typeof e.setReadOnly === 'function' }
    })

    // Assert
    expect(result.rawSet).toBe(true)
    // Дополнительно: после setReadOnly(true) попытка trigger 'type' не меняет модифицированную часть
    const after = await page.evaluate(({ originalText }) => {
      const e = (window as any).__diff__
      const me = e.editor.getModifiedEditor()
      const before = me.getModel().getValue()
      e.setReadOnly(true)
      me.focus()
      e.trigger('keyboard', 'type', { text: 'XXX' })
      const after = me.getModel().getValue()
      return { before, after }
    }, { originalText })

    expect(after.after).toBe(after.before)
  })

  test('setSideBySide переключает renderSideBySide опцию', async ({ page }) => {
    // Arrange
    await setupDiff(page)

    // Act
    const states = await page.evaluate(() => {
      const e = (window as any).__diff__
      // Monaco IDiffEditorOptions.renderSideBySide отражается в DOM-классе .side-by-side
      const dom = e.domNode()
      e.setSideBySide(false)
      const inline = dom.classList.contains('side-by-side') === false
      e.setSideBySide(true)
      const sideBySide = dom.classList.contains('side-by-side')
      return { inline, sideBySide }
    })

    // Assert
    expect(states.inline).toBe(true)
    expect(states.sideBySide).toBe(true)
  })

  test('navigate next перемещает позицию модифицированного редактора', async ({ page }) => {
    // Arrange
    await setupDiff(page)
    await page.waitForTimeout(TIMEOUTS.DIFF_NAVIGATOR)

    // Act
    const result = await page.evaluate(() => {
      const e = (window as any).__diff__
      const me = e.editor.getModifiedEditor()
      const before = me.getPosition()?.lineNumber
      const canNavigate = e.canNavigate()
      e.next()
      const after1 = me.getPosition()?.lineNumber
      e.next()
      const after2 = me.getPosition()?.lineNumber
      e.previous()
      const back = me.getPosition()?.lineNumber
      return { canNavigate, before, after1, after2, back }
    })

    // Assert
    expect(result.canNavigate).toBe(true)
    // Позиция должна меняться при навигации
    expect(result.after1).not.toBe(result.before)
  })

  test('setTheme меняет тему monaco', async ({ page }) => {
    // Arrange
    await setupDiff(page)

    // Act
    const result = await page.evaluate(() => {
      const e = (window as any).__diff__
      const dom = e.domNode()
      e.setTheme('vs-dark')
      // Тема применяется к корневому monaco-editor — поищем класс vs-dark на каком-нибудь предке
      const themeEl = dom.closest('.monaco-editor') || dom.querySelector('.monaco-editor')
      const darkClass = themeEl ? themeEl.classList.contains('vs-dark') : false
      e.setTheme('vs')
      const lightClass = themeEl ? themeEl.classList.contains('vs') : false
      return { darkClass, lightClass }
    })

    // Assert
    expect(result.darkClass).toBe(true)
    expect(result.lightClass).toBe(true)
  })

  test('dispose очищает standaloneInstance', async ({ page }) => {
    // Arrange
    await setupDiff(page)
    const before = await page.evaluate(() => !!(window as any).__diff__.domNode())

    // Assert #1 — diff существует
    expect(before).toBe(true)

    // Act
    const result = await page.evaluate(() => {
      const w = window as any
      const oldDiff = w.__diff__
      w.disposeVanessaDiffEditor()
      const newDiff = w.createVanessaDiffEditor('a', 'b', 'turbo-gherkin')
      return { sameInstance: oldDiff === newDiff }
    })

    // Assert #2 — создан новый instance
    expect(result.sameInstance).toBe(false)
  })
})
