import { Page } from '@playwright/test'

export const fixtures = {
  keywords: require('../example/Keywords/keywords.json'),
  defaultSteplist: require('../example/StepList/ru.json')
}

export const TIMEOUTS = {
  EDITOR_READY: 100,
  WIDGET_RENDER: 100,
  DIFF_NAVIGATOR: 500,
  TAB_SWITCH: 50,
  VIEWER_READY: 50
}

/**
 * Инициализирует VanessaGherkinProvider с ключевыми словами, steplist и опциональными параметрами.
 * Выполняет goto + waitForFunction + evaluate.
 */
export async function initGherkinProvider(page: Page, opts?: {
  steplist?: any
  variables?: any
  elements?: any
  imports?: any
}): Promise<void> {
  await page.goto('/index.html')
  await page.waitForFunction(() => (window as any).VanessaGherkinProvider !== undefined)
  await page.evaluate(({ keywords, steplist, opts }) => {
    const provider = (window as any).VanessaGherkinProvider
    provider.setKeypairs(JSON.stringify({ if: ['then'], Если: ['Тогда'] }))
    provider.setKeywords(JSON.stringify(keywords))
    provider.setStepList(JSON.stringify(steplist))
    if (opts?.variables) provider.setVariables(JSON.stringify(opts.variables))
    if (opts?.elements) provider.setElements(JSON.stringify(opts.elements), true)
    if (opts?.imports) provider.setImports(JSON.stringify(opts.imports))
  }, {
    keywords: fixtures.keywords,
    steplist: opts?.steplist ?? fixtures.defaultSteplist,
    opts: opts ?? {}
  })
}

/**
 * Создаёт VanessaTabs + открывает редактор с заданным контентом.
 * Предполагает, что страница уже загружена и VanessaGherkinProvider инициализирован
 * (или что goto выполнен ранее).
 */
export async function createEditor(page: Page, content: string,
  url = 'test.feature', title = 'Тест'): Promise<void> {
  await page.evaluate(({ content, url, title }) => {
    const w = window as any
    w.createVanessaTabs()
    w.__editor__ = w.VanessaTabs.edit(content, url, url, title, 0, false, true)
  }, { content, url, title })
  await page.waitForTimeout(TIMEOUTS.EDITOR_READY)
}

/**
 * Создаёт diff-редактор.
 * Предполагает, что страница уже загружена.
 */
export async function createDiffEditor(page: Page, original: string,
  modified: string, lang = 'turbo-gherkin'): Promise<void> {
  await page.evaluate(({ original, modified, lang }) => {
    const w = window as any
    w.__diff__ = w.createVanessaDiffEditor(original, modified, lang)
  }, { original, modified, lang })
  await page.waitForTimeout(TIMEOUTS.DIFF_NAVIGATOR)
}

/**
 * Полный setup для тестов с GherkinProvider + VanessaTabs + editor.
 * Эквивалент: initGherkinProvider + createEditor.
 */
export async function setupEditorPage(page: Page, content: string, url: string, title: string,
  opts?: { steplist?: any; variables?: any; elements?: any }): Promise<void> {
  await page.goto('/index.html')
  await page.waitForFunction(() => (window as any).createVanessaTabs !== undefined)
  await page.evaluate(({ keywords, steplist, content, url, title, opts }) => {
    const w = window as any
    const provider = w.VanessaGherkinProvider
    provider.setKeypairs(JSON.stringify({ if: ['then'], Если: ['Тогда'] }))
    provider.setKeywords(JSON.stringify(keywords))
    provider.setStepList(JSON.stringify(steplist))
    if (opts?.variables) provider.setVariables(JSON.stringify(opts.variables))
    if (opts?.elements) provider.setElements(JSON.stringify(opts.elements), true)
    w.createVanessaTabs()
    w.__editor__ = w.VanessaTabs.edit(content, url, url, title, 0, false, true)
  }, {
    keywords: fixtures.keywords,
    steplist: opts?.steplist ?? fixtures.defaultSteplist,
    content,
    url,
    title,
    opts: opts ?? {}
  })
  await page.waitForTimeout(TIMEOUTS.EDITOR_READY)
}
