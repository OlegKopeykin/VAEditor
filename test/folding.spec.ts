import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const content = fs.readFileSync(path.join(__dirname, 'folding/example.feature'), 'utf-8')
const keywords = require('../example/Keywords/keywords.json')
const steplist = require('../example/StepList/ru.json')

interface FoldingRange { start: number; end: number; kind?: { value: string } }

test.describe('Сворачивание кода', () => {
  let result: FoldingRange[]
  let ranges: Array<{ start: number; end: number }>

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/index.html')
    await page.waitForFunction(() => (window as any).VanessaGherkinProvider !== undefined)

    result = await page.evaluate(async ({ content, keywords, steplist }) => {
      const w = window as any
      const provider = w.VanessaGherkinProvider
      provider.setKeypairs(JSON.stringify({ if: ['then'], Если: ['Тогда'] }))
      provider.setKeywords(JSON.stringify(keywords))
      provider.setStepList(JSON.stringify(steplist))
      const model = w.monaco.editor.createModel(content, 'turbo-gherkin')
      const folding = await provider.provideFoldingRanges(model, undefined, undefined)
      return folding.map((e: any) => ({
        start: e.start,
        end: e.end,
        kind: e.kind ? { value: e.kind.value } : undefined
      }))
    }, { content, keywords, steplist })

    ranges = result.map(e => ({ start: e.start, end: e.end }))
    await page.close()
  })

  test('Свертка тегов и комментариев', () => {
    expect(result[0].kind).toEqual({ value: 'comment' })
    expect(ranges).toContainEqual({ start: 1, end: 2 })
    expect(ranges).toContainEqual({ start: 3, end: 5 })
  })

  test('Свертка секций фиче-файла', () => {
    const regions = result.filter(e => e.kind && e.kind.value === 'region')
    for (let i = 0; i < regions.length - 1; ++i) {
      expect(regions[i].end + 1).toBe(regions[i + 1].start)
    }
  })

  test('Свертка описания функционала', () => {
    expect(ranges).toContainEqual({ start: 8, end: 10 })
    expect(ranges).toContainEqual({ start: 9, end: 10 })
  })

  test('Простые отступы шагов', () => {
    expect(ranges).toContainEqual({ start: 21, end: 26 })
    expect(ranges).toContainEqual({ start: 22, end: 25 })
    expect(ranges).toContainEqual({ start: 23, end: 25 })
  })

  test('Свертка таблиц и многострочных параметров', () => {
    expect(ranges).toContainEqual({ start: 30, end: 41 })
    expect(ranges).toContainEqual({ start: 43, end: 50 })
  })

  test('Группировка шагов звездочкой (*)', () => {
    expect(ranges).toContainEqual({ start: 54, end: 61 })
    expect(ranges).toContainEqual({ start: 55, end: 59 })
    expect(ranges).toContainEqual({ start: 57, end: 59 })
  })
})
