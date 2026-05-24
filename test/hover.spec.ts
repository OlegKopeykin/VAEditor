import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fixtures } from './_helpers'

const content = fs.readFileSync(path.join(__dirname, 'hover/example.feature'), 'utf-8')

const variables = {
  ИмяКоманды: 'ЗаписатьИЗакрыть',
  ИмяКнопки: 'ФормаЗаписать',
  ИмяТаблицы: 'Номенклатура',
  ИмяРеквизита: 'Количество'
}

test.describe('Всплывающие подсказки', () => {
  let hoverResults: Record<number, any> = {}

  test.beforeAll(async ({ browser }) => {
    // Arrange (shared)
    const page = await browser.newPage()
    await page.goto('/index.html')
    await page.waitForFunction(() => (window as any).VanessaGherkinProvider !== undefined)

    // Act (shared)
    hoverResults = await page.evaluate(async ({ content, keywords, steplist, variables, lines }) => {
      const w = window as any
      const provider = w.VanessaGherkinProvider
      provider.setKeypairs(JSON.stringify({ if: ['then'], Если: ['Тогда'] }))
      provider.setKeywords(JSON.stringify(keywords))
      provider.setStepList(JSON.stringify(steplist))
      provider.setVariables(JSON.stringify(variables))
      const model = w.monaco.editor.createModel(content, 'turbo-gherkin')

      const out: Record<number, any> = {}
      for (const lineNumber of lines) {
        const position = new w.monaco.Position(lineNumber, model.getLineMaxColumn(lineNumber) - 1)
        const result = await provider.provideHover(model, position)
        const line = model.getLineContent(lineNumber)
        const firstCol = line.search(/\S/) + 1
        const lastCol = line.replace(/\s+$/, '').length + 1
        out[lineNumber] = {
          range: result.range
            ? {
                startLineNumber: result.range.startLineNumber,
                endLineNumber: result.range.endLineNumber,
                startColumn: result.range.startColumn,
                endColumn: result.range.endColumn
              }
            : null,
          contents: result.contents.map((c: any) => ({ value: c.value })),
          expectedRange: {
            startLineNumber: lineNumber,
            endLineNumber: lineNumber,
            startColumn: firstCol,
            endColumn: lastCol
          }
        }
      }
      return out
    }, { content, keywords: fixtures.keywords, steplist: fixtures.defaultSteplist, variables, lines: [7, 9, 10, 11, 12, 13, 14] })

    await page.close()
  })

  test('Подсказка для шага без параметров', () => {
    // Assert
    const r = hoverResults[7]
    expect(r.range).toEqual(r.expectedRange)
    expect(r.contents).toHaveLength(2)
    expect(r.contents[1].value).toBe('Условие. Проверяет, что появилось окно предупреждения.')
    expect(r.contents[0].value).toContain('**UI\\.Всплывающие окна**')
    expect(r.contents[0].value).toContain('(#info:появилось-предупреждение-тогда)')
    expect(r.contents[0].value).toContain('(#sound:7)')
  })

  test('Подсказка для шага со значением параметра', () => {
    // Assert
    const r = hoverResults[9]
    expect(r.range).toEqual(r.expectedRange)
    expect(r.contents).toHaveLength(3)
    expect(r.contents[2].value).toBe('**ИмяКнопки** = ФормаЗаписать')
  })

  test('Подсказка для шага с ошибкой', () => {
    // Assert
    const r = hoverResults[10]
    expect(r.range).toEqual(r.expectedRange)
    expect(r.contents).toHaveLength(0)
  })

  test('Подсказка для двух одинаковых параметров', () => {
    // Assert
    const r = hoverResults[11]
    expect(r.contents).toHaveLength(3)
    expect(r.contents[2].value).toBe('**ИмяКоманды** = ЗаписатьИЗакрыть')
  })

  test('Подсказка для двух разных параметров', () => {
    // Assert
    const r = hoverResults[12]
    expect(r.contents).toHaveLength(4)
    expect(r.contents[2].value).toBe('**ИмяКоманды** = ЗаписатьИЗакрыть')
    expect(r.contents[3].value).toBe('**ИмяТаблицы** = Номенклатура')
  })

  test('Параметры в угловых скобках', () => {
    // Assert
    const r = hoverResults[13]
    expect(r.contents).toHaveLength(4)
    expect(r.contents[2].value).toBe('**ИмяКоманды** = ЗаписатьИЗакрыть')
    expect(r.contents[3].value).toBe('**ИмяТаблицы** = Номенклатура')
  })

  test('Если первый параметр пустой', () => {
    // Assert
    const r = hoverResults[14]
    expect(r.contents).toHaveLength(3)
    expect(r.contents[2].value).toBe('**ИмяТаблицы** = Номенклатура')
  })
})
