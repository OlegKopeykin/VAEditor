import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const content = fs.readFileSync(path.join(__dirname, 'hyperlinks/example.feature'), 'utf-8')
const keywords = require('../example/Keywords/keywords.json')
const steplist = require('../example/StepList/ru.json')
const vars = require('./hyperlinks/example.json')

test.describe('Переменные и гиперссылки', () => {
  let initial: { links: any[] }
  let withImports: { links: any[] }

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/index.html')
    await page.waitForFunction(() => (window as any).VanessaGherkinProvider !== undefined)

    const results = await page.evaluate(async ({ content, keywords, steplist, vars }) => {
      const w = window as any
      const provider = w.VanessaGherkinProvider
      provider.setKeypairs(JSON.stringify({ if: ['then'], Если: ['Тогда'] }))
      provider.setKeywords(JSON.stringify(keywords))
      provider.setStepList(JSON.stringify(steplist))
      const model = w.monaco.editor.createModel(content, 'turbo-gherkin')

      const first = await provider.provideLinks(model, undefined)
      provider.setImports(JSON.stringify(vars))
      await new Promise(r => setTimeout(r, 100))
      const second = await provider.provideLinks(model, undefined)

      const ser = (r: any) => ({
        links: r.links.map((l: any) => ({ url: l.url, tooltip: l.tooltip }))
      })
      return { initial: ser(first), withImports: ser(second) }
    }, { content, keywords, steplist, vars })

    initial = results.initial
    withImports = results.withImports
    await page.close()
  })

  test('Навигационные ссылки', () => {
    expect(initial.links).toHaveLength(13)
    expect(initial.links[0].url).toBe('e1cib/list/Справочник.Номенклатура')
    expect(initial.links[8].url).toBe('e1cib/app/Отчет.КомпоновкаТест')
  })

  test('Простые переменные', () => {
    expect(initial.links[3].tooltip).toContain('ЗаписатьJSON')
    expect(initial.links[3].url).toBe('link:ТекстМодуля')
    expect(initial.links[4].tooltip).toBe('"Привет, Ванесса!"')
    expect(initial.links[5].tooltip).toBe('31')
    expect(initial.links[9].tooltip).toBe('"23.07.2021"')
  })

  test('Составные переменные', () => {
    expect(initial.links[6].tooltip).toBe('Табуретка')
    expect(initial.links[6].url).toBe('link:Номенклатура.Товар')
    expect(initial.links[7].tooltip).toBe('e1cib/app/Отчет.КомпоновкаТест')
    expect(initial.links[7].url).toBe('link:Номенклатура.Работа.Ссылка')
    expect(initial.links[10].tooltip).toBe('Спасская')
    expect(initial.links[10].url).toBe('link:Вятка')
    expect(initial.links[11].tooltip).toBe('Спасская')
    expect(initial.links[11].url).toBe('link:Вятка.Улица')
    expect(initial.links[12].tooltip).toBe('Металлистов')
    expect(initial.links[12].url).toBe('link:Тула.Улица')
  })

  test('Импорт файлов', () => {
    expect(withImports.links[13].tooltip).toBe('Василёк')
    expect(withImports.links[13].url).toBe('link:Контрагенты.Продавец')
    expect(withImports.links[14].tooltip).toBe('Василёк')
    expect(withImports.links[14].url).toBe('link:Контрагенты.Продавец.Код')
    expect(withImports.links[15].tooltip).toBe('Табуретка')
    expect(withImports.links[15].url).toBe('link:товар')
    expect(withImports.links[16].tooltip).toBe('Доставка')
    expect(withImports.links[16].url).toBe('link:услуга')
  })
})
