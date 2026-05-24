import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fixtures, TIMEOUTS } from './_helpers'

const content = fs.readFileSync(path.join(__dirname, 'subcode/example.feature'), 'utf-8')
const subcode1 = fs.readFileSync(path.join(__dirname, 'subcode/subcode.1.txt'), 'utf-8')
const url = 'subcode/example.feature'
const title = 'Заголовок файла'

test.describe('Виджеты подсценариев', () => {
  test('Вставка кода', async ({ page }) => {
    // Arrange
    await page.goto('/index.html')
    await page.waitForFunction(() => (window as any).createVanessaTabs !== undefined)

    // Act
    const { editorContent, nodeCount } = await page.evaluate(async ({ content, subcode1, url, title, keywords, steplist }) => {
      const w = window as any
      const provider = w.VanessaGherkinProvider
      provider.setKeypairs(JSON.stringify({ if: ['then'], Если: ['Тогда'] }))
      provider.setKeywords(JSON.stringify(keywords))
      provider.setStepList(JSON.stringify(steplist))
      w.createVanessaTabs()
      const tabs = w.VanessaTabs
      const editor = tabs.edit(content, url, url, title, 0, false, true)
      await new Promise(r => setTimeout(r, 100))
      const editorContent = editor.getContent()
      editor.showRuntimeCode(10, subcode1)
      await new Promise(r => setTimeout(r, 100))
      const nodes = document.querySelectorAll('div.vanessa-code-lines>span')
      return { editorContent, nodeCount: nodes.length }
    }, { content, subcode1, url, title, keywords: fixtures.keywords, steplist: fixtures.defaultSteplist })

    // Assert
    expect(editorContent).toBe(content)
    expect(nodeCount).toBe(4)
  })
})
