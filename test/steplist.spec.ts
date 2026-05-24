import { test, expect } from '@playwright/test'

const steplist = require('./steplist/steplist.json')

const elements = {
  ИмяКоманды: 'ЗаписатьИЗакрыть',
  ИмяКнопки: 'ФормаЗаписать',
  ИмяТаблицы: 'Номенклатура',
  ИмяКолонки: 'Наименование',
  ИмяРеквизита: 'Количество'
}
const variables = {
  Отправитель: 'Иванов Николай',
  Получатель: 'Петров Василий',
  Номенклатура: 'Столешница'
}
const keywords = require('../example/Keywords/keywords.json')

async function setupProvider(page: any) {
  await page.goto('/index.html')
  await page.waitForFunction(() => (window as any).VanessaGherkinProvider !== undefined)
  await page.evaluate(({ keywords, steplist, elements, variables }) => {
    const provider = (window as any).VanessaGherkinProvider
    provider.setKeypairs(JSON.stringify({ if: ['then'], Если: ['Тогда'] }))
    provider.setKeywords(JSON.stringify(keywords))
    provider.setStepList(JSON.stringify(steplist), true)
    provider.setElements(JSON.stringify(elements), true)
    provider.setVariables(JSON.stringify(variables), true)
  }, { keywords, steplist, elements, variables })
}

async function suggestionsFor(page: any, content: string, columnOffset = 0) {
  return page.evaluate(async ({ content, columnOffset }) => {
    const w = window as any
    const provider = w.VanessaGherkinProvider
    const model = w.monaco.editor.createModel(content, 'turbo-gherkin')
    const position = new w.monaco.Position(1, model.getLineMaxColumn(1) - columnOffset)
    const result = await provider.provideCompletionItems(model, position)
    return {
      suggestions: result.suggestions.map((s: any) => ({
        detail: s.detail,
        documentation: s.documentation,
        filterText: s.filterText,
        insertText: s.insertText,
        label: s.label,
        kind: s.kind,
        range: s.range
      }))
    }
  }, { content, columnOffset })
}

test.describe('Автоподстановка шагов при вводе', () => {
  test.beforeEach(async ({ page }) => {
    await setupProvider(page)
  })

  test('Подсказка для пустой строки', async ({ page }) => {
    const result = await suggestionsFor(page, '\t\t')
    expect(result.suggestions).toHaveLength(10)
    result.suggestions.sort((a: any, b: any) => a.kind - b.kind)
    const step = result.suggestions[0]
    expect(step.detail).toBe('UI.Таблицы.Выбор таблицы')
    expect(step.documentation).toBe('Выбирает таблицу для работы')
    expect(step.filterText).toBe('я буду работать с таблицей')
    expect(step.insertText).toBe('Затем я буду работать с таблицей "ТаблицаФормы"\n')
    expect(step.label).toBe('я буду работать с таблицей "ТаблицаФормы"')
    expect(step.kind).toBe(1)
  })

  test('Подсказка для строки с ключевым словом', async ({ page }) => {
    const result = await suggestionsFor(page, '\t\tИ это значит что')
    expect(result.suggestions).toHaveLength(6)
    result.suggestions.sort((a: any, b: any) => a.kind - b.kind)
    const step = result.suggestions[0]
    expect(step.detail).toBe('UI.Таблицы.Выбор таблицы')
    expect(step.documentation).toBe('Выбирает таблицу для работы')
    expect(step.filterText).toBe('И это значит что я буду работать с таблицей')
    expect(step.insertText).toBe('И это значит что я буду работать с таблицей "ТаблицаФормы"\n')
    expect(step.label).toBe('я буду работать с таблицей "ТаблицаФормы"')
    expect(step.kind).toBe(1)
  })

  test('Подсказка с ключевым словом и пробелом', async ({ page }) => {
    const result = await suggestionsFor(page, '\t\tИ это значит что ')
    expect(result.suggestions).toHaveLength(6)
    result.suggestions.sort((a: any, b: any) => a.kind - b.kind)
    const step = result.suggestions[0]
    expect(step.detail).toBe('UI.Таблицы.Выбор таблицы')
    expect(step.documentation).toBe('Выбирает таблицу для работы')
    expect(step.filterText).toBe('И это значит что я буду работать с таблицей')
    expect(step.insertText).toBe('И это значит что я буду работать с таблицей "ТаблицаФормы"\n')
    expect(step.label).toBe('я буду работать с таблицей "ТаблицаФормы"')
    expect(step.kind).toBe(1)
  })

  test('Подсказка для строки с началом шага', async ({ page }) => {
    const result = await suggestionsFor(page, '\t\tИ это значит что список')
    expect(result.suggestions).toHaveLength(6)
    result.suggestions.sort((a: any, b: any) => a.kind - b.kind)
    const step = result.suggestions[0]
    expect(step.detail).toBe('UI.Таблицы.Выбор таблицы')
    expect(step.documentation).toBe('Выбирает таблицу для работы')
    expect(step.filterText).toBe('И это значит что я буду работать с таблицей')
    expect(step.insertText).toBe('И это значит что я буду работать с таблицей "ТаблицаФормы"\n')
    expect(step.label).toBe('я буду работать с таблицей "ТаблицаФормы"')
    expect(step.kind).toBe(1)
  })

  test('Подсказка с заменой элементов формы', async ({ page }) => {
    const result = await suggestionsFor(page, '\t\tИ список')
    expect(result.suggestions).toHaveLength(6)
    result.suggestions.sort((a: any, b: any) => a.kind - b.kind)
    const step = result.suggestions[1]
    expect(step.filterText).toBe('И в открытой форме в таблице я нажимаю кнопку выбора у реквизита')
    expect(step.insertText).toBe('И В открытой форме в таблице "Номенклатура" я нажимаю кнопку выбора у реквизита "Наименование"\n')
    expect(step.label).toBe('В открытой форме в таблице "Номенклатура" я нажимаю кнопку выбора у реквизита "Наименование"')
  })

  test('Подстановка шага с таблицей', async ({ page }) => {
    const result = await suggestionsFor(page, '\t\tИ список')
    expect(result.suggestions).toHaveLength(6)
    result.suggestions.sort((a: any, b: any) => a.kind - b.kind)
    const step = result.suggestions[5]
    expect(step.filterText).toBe('И таблица содержит строки')
    expect(step.insertText).toBe('И таблица "Номенклатура" содержит строки:\n\t| ИмяКолонки1 | ИмяКолонки2 |\n\t| Значение1 | Значение2 |\n')
    expect(step.label).toBe('таблица "Номенклатура" содержит строки:')
  })

  test('Подстановка переменных', async ({ page }) => {
    const result = await suggestionsFor(page, '\t\tИ поле <Контрагент>', 3)
    expect(result.suggestions).toHaveLength(3)
    result.suggestions.sort((a: any, b: any) =>
      a.label < b.label ? -1 : a.label > b.label ? 1 : 0
    )
    const range = { startLineNumber: 1, startColumn: 10, endLineNumber: 1, endColumn: 22 }
    const step = result.suggestions[0]
    expect(step.range).toEqual(range)
    expect(step.label).toBe('"Номенклатура" = Столешница')
    expect(step.filterText).toBe('<Контрагент>Номенклатура')
    expect(step.insertText).toBe('<Номенклатура>')
    expect(step.kind).toBe(4)
  })
})
