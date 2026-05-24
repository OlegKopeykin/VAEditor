import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const f01 = fs.readFileSync(path.join(__dirname, 'syntax/example.01.feature'), 'utf-8')
const f02 = fs.readFileSync(path.join(__dirname, 'syntax/example.02.feature'), 'utf-8')
const f03 = fs.readFileSync(path.join(__dirname, 'syntax/example.03.feature'), 'utf-8')
const f04 = fs.readFileSync(path.join(__dirname, 'syntax/example.04.feature'), 'utf-8')
const keywords = require('../example/Keywords/keywords.json')
const steplist = require('../example/StepList/ru.json')

async function setupProvider(page: any) {
  await page.goto('/index.html')
  await page.waitForFunction(() => (window as any).VanessaGherkinProvider !== undefined)
  await page.evaluate(({ keywords, steplist }) => {
    const provider = (window as any).VanessaGherkinProvider
    provider.setKeypairs(JSON.stringify({ if: ['then'], Если: ['Тогда'] }))
    provider.setKeywords(JSON.stringify(keywords))
    provider.setStepList(JSON.stringify(steplist))
  }, { keywords, steplist })
}

function range(lineNumber: number) {
  return { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 }
}

async function check(page: any, content: string) {
  return page.evaluate(async ({ content }) => {
    const w = window as any
    const model = w.monaco.editor.createModel(content, 'turbo-gherkin')
    await w.VanessaGherkinProvider.checkSyntax(model)
    const markers = w.monaco.editor.getModelMarkers({ owner: 'syntax', resource: model.uri })
    return {
      markersCount: markers.length,
      values: markers.map((m: any) =>
        model.getValueInRange({ startLineNumber: m.startLineNumber, startColumn: m.startColumn, endLineNumber: m.endLineNumber, endColumn: m.endColumn })
      ),
      markers: markers.map((m: any) => ({
        startLineNumber: m.startLineNumber,
        startColumn: m.startColumn,
        endLineNumber: m.endLineNumber,
        endColumn: m.endColumn
      })),
      modelUri: model.uri.toString()
    }
  }, { content })
}

async function actionTitles(page: any, content: string, markerIndex: number) {
  return page.evaluate(async ({ content, markerIndex }) => {
    const w = window as any
    const model = w.monaco.editor.createModel(content, 'turbo-gherkin')
    const provider = w.VanessaGherkinProvider
    await provider.checkSyntax(model)
    const markers = w.monaco.editor.getModelMarkers({ owner: 'syntax', resource: model.uri })
    const m = markers[markerIndex]
    const r = new w.monaco.Range(m.startLineNumber, m.startColumn, m.endLineNumber, m.endColumn)
    const act = await provider.provideCodeActions(model, r, { markers: [m], readonly: false }, undefined)
    return {
      count: act.actions.length,
      titles: act.actions.map((a: any) => a.title)
    }
  }, { content, markerIndex })
}

async function decorationsFor(page: any, content: string) {
  return page.evaluate(async ({ content }) => {
    const w = window as any
    const provider = w.VanessaGherkinProvider
    const model = w.monaco.editor.createModel(content, 'turbo-gherkin')
    await provider.provideFoldingRanges(model, undefined, undefined)
    await provider.checkSyntax(model)
    const decorations = model.getLinesDecorations(1, model.getLineCount())
    return decorations.map((d: any) => ({
      range: {
        startLineNumber: d.range.startLineNumber,
        startColumn: d.range.startColumn,
        endLineNumber: d.range.endLineNumber,
        endColumn: d.range.endColumn
      },
      options: {
        glyphMarginClassName: d.options.glyphMarginClassName ?? null,
        inlineClassName: d.options.inlineClassName ?? null
      }
    }))
  }, { content })
}

test.describe('Проверка синтаксиса', () => {
  test.beforeEach(async ({ page }) => {
    await setupProvider(page)
  })

  test('Ключевые слова в описании фичи', async ({ page }) => {
    const r = await check(page, f01)
    expect(r.markersCount).toBe(1)
    expect(r.values[0]).toBe('Когда есть шаг с ошибкой ситнаксиса')
  })

  test('Быстрые исправления: параметры в кавычках', async ({ page }) => {
    const r = await check(page, f02)
    expect(r.markersCount).toBe(4)
    const act = await actionTitles(page, f02, 0)
    expect(act.count).toBe(7)
    expect(act.titles[0]).toBe("в таблице 'ИмяКнопки' есть колонка с именем \"ИмяКоманды\" Тогда")
  })

  test('Быстрые исправления: параметры в угловых скобках', async ({ page }) => {
    const act = await actionTitles(page, f02, 1)
    expect(act.titles[0]).toBe('поле с именем <Фамилия> не существует')
  })

  test('Быстрые исправления: числовые параметры', async ({ page }) => {
    const act = await actionTitles(page, f02, 2)
    expect(act.titles[0]).toBe('в течение 30 секунд я выполняю')
  })

  test('Шаги с условными операторами', async ({ page }) => {
    const r = await check(page, f03)
    expect(r.markersCount).toBe(2)
    expect(r.values[0]).toBe('Если есть картинка "ИмяКартинки"')
    expect(r.values[1]).toBe('И я нажимаю ENTER Тогда')
  })

  test('Декорация групп пиктограммами', async ({ page }) => {
    const decorations = await decorationsFor(page, f04)
    expect(decorations).toHaveLength(8)
    expect(decorations[0].range).toEqual(range(16))
    expect(decorations[0].options.glyphMarginClassName).toBe('codicon-triangle-right')
    expect(decorations[0].options.inlineClassName).toBe(null)
    expect(decorations[1].range).toEqual(range(20))
    expect(decorations[1].options.glyphMarginClassName).toBe('codicon-triangle-right')
    expect(decorations[1].options.inlineClassName).toBe('vanessa-style-bold')
    expect(decorations[3].range).toEqual(range(26))
    expect(decorations[3].options.glyphMarginClassName).toBe('codicon-triangle-right')
    expect(decorations[3].options.inlineClassName).toBe('vanessa-style-bold')
    expect(decorations[7].range).toEqual(range(40))
    expect(decorations[7].options.glyphMarginClassName).toBe('codicon-triangle-right')
    expect(decorations[7].options.inlineClassName).toBe('vanessa-style-bold')
  })

  test('Декорация импортируемых подсценариев', async ({ page }) => {
    const decorations = await decorationsFor(page, f04)
    expect(decorations[2].range).toEqual({ startLineNumber: 23, startColumn: 2, endLineNumber: 23, endColumn: 74 })
    expect(decorations[2].options.glyphMarginClassName).toBe(null)
    expect(decorations[2].options.inlineClassName).toBe('vanessa-style-underline')
  })

  test('Декорация условных операторов и циклов', async ({ page }) => {
    const decorations = await decorationsFor(page, f04)
    expect(decorations[4].range).toEqual(range(28))
    expect(decorations[4].options.glyphMarginClassName).toBe('codicon-symbol-class')
    expect(decorations[4].options.inlineClassName).toBe(null)
    expect(decorations[5].range).toEqual(range(32))
    expect(decorations[5].options.glyphMarginClassName).toBe('codicon-git-compare')
    expect(decorations[5].options.inlineClassName).toBe(null)
    expect(decorations[6].range).toEqual(range(33))
    expect(decorations[6].options.glyphMarginClassName).toBe('codicon-symbol-class')
    expect(decorations[6].options.inlineClassName).toBe(null)
  })

  test('Картинки в тексте сценария', async ({ page }) => {
    const images = await page.evaluate(async ({ content }) => {
      const w = window as any
      const model = w.monaco.editor.createModel(content, 'turbo-gherkin')
      await w.VanessaGherkinProvider.checkSyntax(model)
      return (model as any).testedImages.map((img: any) => ({
        height: img.height, src: img.src, lineNumber: img.lineNumber, column: img.column
      }))
    }, { content: f03 })
    expect(images).toHaveLength(1)
    expect(images[0].height).toBe(10)
    expect(images[0].src).toBe('img/logo.png')
    expect(images[0].lineNumber).toBe(6)
    expect(images[0].column).toBe(3)
  })
})
