import { test, expect, Page } from '@playwright/test'
const keywords = require('../example/Keywords/keywords.json')
const steplist = require('../example/StepList/ru.json')

const line1 = 'Пример текста'
const line2 = 'Вторая строка'
const content = line1 + '\n' + line2
const url = 'Браузер.feature'
const title = 'Заголовок файла'

async function initPage(page: Page) {
  await page.goto('/index.html')
  await page.waitForFunction(() => (window as any).createVanessaTabs !== undefined)

  await page.evaluate(({ keywords, steplist }) => {
    const w = window as any
    const provider = w.VanessaGherkinProvider
    provider.setKeypairs(JSON.stringify({ if: ['then'], Если: ['Тогда'] }))
    provider.setKeywords(JSON.stringify(keywords))
    provider.setStepList(JSON.stringify(steplist))
    w.createVanessaTabs()

    w.__eventsData__ = []
    document.body.addEventListener('click', (ev: Event) => {
      if (ev instanceof CustomEvent) {
        if (Number.isInteger(ev.detail)) return
        w.__eventsData__.push(ev.detail)
      }
    })
  }, { keywords, steplist })
}

async function openEditor(page: Page, content: string, url: string, title: string) {
  await page.evaluate(({ content, url, title }) => {
    const w = window as any
    w.__editor__ = w.VanessaTabs.edit(content, url, url, title, 0, false, true)
  }, { content, url, title })
  await page.waitForTimeout(100)
}

async function shiftEvent(page: Page) {
  return page.evaluate(() => {
    const e = (window as any).__eventsData__.shift()
    if (!e) return null
    return {
      name: e.name,
      data: {
        filename: e.data?.filename,
        title: e.data?.title
      }
    }
  })
}

async function clearEvents(page: Page) {
  await page.evaluate(() => { (window as any).__eventsData__ = [] })
}

test.describe.configure({ mode: 'serial' })

test.describe('Управление редактором', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await initPage(page)
    await openEditor(page, content, url, title)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('Событие на открытие вкладки', async () => {
    const message = await shiftEvent(page)
    expect(message.name).toBe('ON_TAB_SELECT')
    expect(message.data.filename).toBe(url)
    expect(message.data.title).toBe(title)
  })

  test('Событие на закрытие вкладки', async () => {
    await clearEvents(page)
    await page.evaluate(() => (window as any).VanessaTabs.current.domClose.click())
    const message = await shiftEvent(page)
    expect(message.name).toBe('ON_TAB_CLOSING')
    expect(message.data.filename).toBe(url)
    expect(message.data.title).toBe(title)
  })

  test('Событие на запись документа', async () => {
    // Закрытие вкладки в предыдущем тесте могло удалить editor — открываем заново
    await openEditor(page, content, url, title)
    await clearEvents(page)
    await page.evaluate(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 83, ctrlKey: true, bubbles: true } as any))
    })
    const message = await shiftEvent(page)
    expect(message.name).toBe('PRESS_CTRL_S')
    expect(message.data.filename).toBe(url)
    expect(message.data.title).toBe(title)
  })

  test('Содержимое вкладки редактора', async () => {
    const data = await page.evaluate(() => {
      const e = (window as any).__editor__
      return {
        content: e.getContent(),
        line1: e.getLineContent(1),
        line2: e.getLineContent(2)
      }
    })
    expect(data.content).toBe(content)
    expect(data.line1).toBe(line1)
    expect(data.line2).toBe(line2)
  })

  test('Показать контекстное меню', async () => {
    const count = await page.evaluate(() => {
      const w = window as any
      w.VanessaTabs.showContextMenu()
      return document.querySelectorAll('.monaco-menu').length
    })
    expect(count).toBe(1)
  })

  test('Наличие строк DOM isConnected', async () => {
    const count = await page.evaluate(() =>
      (window as any).__editor__.domNode().getElementsByClassName('view-line').length
    )
    expect(count).toBe(2)
  })

  test('Выделение текста', async () => {
    const r = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setSelection(1, 1, 3, 1)
      const all = e.getSelectedContent()
      e.setSelection(1, 1, 1, 100)
      const l1 = e.getSelectedContent()
      e.setSelection(2, 1, 2, 100)
      const l2 = e.getSelectedContent()
      return { all, l1, l2 }
    })
    expect(r.all).toBe(content)
    expect(r.l1).toBe(line1)
    expect(r.l2).toBe(line2)
  })

  test('Вставка текста', async () => {
    const r = await page.evaluate((line1: string) => {
      const e = (window as any).__editor__
      e.setPosition(2, 1)
      e.insertText(line1)
      const after = e.getLineContent(2)
      e.trigger('', 'undo')
      const reverted = e.getLineContent(2)
      return { after, reverted }
    }, line1)
    expect(r.after).toBe(line1 + line2)
    expect(r.reverted).toBe(line2)
  })

  test('Команды Undo и Redo', async () => {
    const r = await page.evaluate((line1: string) => {
      const e = (window as any).__editor__
      e.setPosition(2, 1)
      e.insertText(line1)
      const inserted = e.getLineContent(2)
      e.trigger('', 'undo')
      const undone = e.getLineContent(2)
      e.trigger('', 'redo')
      const redone = e.getLineContent(2)
      return { inserted, undone, redone }
    }, line1)
    expect(r.inserted).toBe(line1 + line2)
    expect(r.undone).toBe(line2)
    expect(r.redone).toBe(line1 + line2)
  })

  test('Позиция курсора', async () => {
    const pos = await page.evaluate(() => {
      const e = (window as any).__editor__
      e.setPosition(2, 5)
      return e.getPosition()
    })
    expect(pos).toMatchObject({ lineNumber: 2, column: 5 })
  })

  test('Всплывающее сообщение', async () => {
    const message = 'Пример всплывающего сообщения'
    const text = await page.evaluate((m) => {
      const e = (window as any).__editor__
      e.showMessage(m)
      const node = document.querySelector('div.monaco-editor-overlaymessage div.message')
      return node ? node.textContent : null
    }, message)
    expect(text).toBe(message)
  })

  test('Переключение вкладок', async () => {
    const contents = ['Первый', 'Второй', 'Третий']
    await page.evaluate(({ contents }) => {
      const tabs = (window as any).VanessaTabs
      tabs.closeAll()
      contents.forEach((cont: string) => tabs.edit('Текст' + cont, cont, cont, cont, 0, false, true))
    }, { contents })

    const state1 = await page.evaluate(() => {
      const tabs = (window as any).VanessaTabs
      return {
        count: tabs.count(),
        value: tabs.current.editor.getModel().getValue(),
        title: tabs.current.title
      }
    })
    expect(state1.count).toBe(3)
    expect(state1.value).toBe('Текст' + contents[2])
    expect(state1.title).toBe(contents[2])

    await page.evaluate(() => (window as any).VanessaTabs.current.editor.focus())
    await page.evaluate(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 33, ctrlKey: true, bubbles: true } as any))
    })
    await page.waitForTimeout(50)
    const state2 = await page.evaluate(() => {
      const tabs = (window as any).VanessaTabs
      return { value: tabs.current.editor.getModel().getValue(), title: tabs.current.title }
    })
    expect(state2.value).toBe('Текст' + contents[1])
    expect(state2.title).toBe(contents[1])

    await page.evaluate(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 33, ctrlKey: true, bubbles: true } as any))
    })
    await page.waitForTimeout(50)
    const state3 = await page.evaluate(() => {
      const tabs = (window as any).VanessaTabs
      return { value: tabs.current.editor.getModel().getValue(), title: tabs.current.title }
    })
    expect(state3.value).toBe('Текст' + contents[0])
    expect(state3.title).toBe(contents[0])

    await page.evaluate(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 34, ctrlKey: true, bubbles: true } as any))
    })
    await page.waitForTimeout(50)
    const state4 = await page.evaluate(() => {
      const tabs = (window as any).VanessaTabs
      return { value: tabs.current.editor.getModel().getValue(), title: tabs.current.title }
    })
    expect(state4.value).toBe('Текст' + contents[1])
    expect(state4.title).toBe(contents[1])

    await page.evaluate(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 34, ctrlKey: true, bubbles: true } as any))
    })
    await page.waitForTimeout(50)
    const state5 = await page.evaluate(() => {
      const tabs = (window as any).VanessaTabs
      return { value: tabs.current.editor.getModel().getValue(), title: tabs.current.title }
    })
    expect(state5.value).toBe('Текст' + contents[2])
    expect(state5.title).toBe(contents[2])

    const finalCount = await page.evaluate(() => {
      const tabs = (window as any).VanessaTabs
      tabs.closeAll()
      return tabs.count()
    })
    expect(finalCount).toBe(0)
  })
})
