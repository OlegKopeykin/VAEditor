# Test Architecture Audit

## 1. Покрытие

- 14 spec-файлов: breakpoints, bsl, diff-editor, editor, folding, hover, hyperlinks, public-api, runtime-progress, steplist, subcode, syntax, viewer, widgets
- 81 уникальный тест
- 162 запуска (81 × 2 браузера: chromium + webkit)
- Статус после рефакторинга: **162/162 passed**, ~3.3 минуты

## 2. AAA структура

Добавлены комментарии `// Arrange`, `// Act`, `// Assert` во все 14 spec-файлов.

Правила применения:
- Если setup выполнен в `beforeAll`/`beforeEach` — в теле теста `// Arrange (shared) — beforeEach инициализирует editor`, затем `// Act` и `// Assert`
- Если `beforeAll`/`beforeEach` содержит и Arrange, и Act — помечено `// Arrange + Act (shared)`
- Если `beforeAll` разделён — `// Arrange (shared)` и `// Act (shared)` отдельно
- Несколько `expect` — одна секция `// Assert`
- Тесты с двумя циклами действий — `// Act #1` / `// Assert #1` / `// Act #2` / `// Assert #2`

Примеры многофазных тестов:
- `editor.spec.ts :: Переключение вкладок` — 6 фаз Act/Assert (#1–#6)
- `diff-editor.spec.ts :: dispose очищает standaloneInstance` — 2 фазы
- `viewer.spec.ts :: isMarkdownViwer / isCodeEditor / isDiffEditor` — 2 фазы
- `widgets.spec.ts :: clearRuntimeCodes удаляет DOM элементы subcode` — 2 фазы

## 3. Helpers (`test/_helpers.ts`)

Вынесены следующие функции и константы:

### Константы `TIMEOUTS`
| Константа | Значение | Применение |
|-----------|----------|------------|
| `EDITOR_READY` | 100 мс | После создания редактора |
| `WIDGET_RENDER` | 100 мс | После showRuntimeCode/showRuntimeError |
| `DIFF_NAVIGATOR` | 500 мс | Ожидание diff-навигатора |
| `TAB_SWITCH` | 50 мс | После нажатия Ctrl+PgUp/PgDn |
| `VIEWER_READY` | 50 мс | После createVanessaTabs() в viewer |

### Объект `fixtures`
- `fixtures.keywords` — из `example/Keywords/keywords.json`
- `fixtures.defaultSteplist` — из `example/StepList/ru.json`

### Функции
| Функция | Описание |
|---------|----------|
| `initGherkinProvider(page, opts?)` | goto + waitForFunction + evaluate с provider setup |
| `createEditor(page, content, url, title)` | createVanessaTabs + edit + waitForTimeout(EDITOR_READY) |
| `createDiffEditor(page, original, modified, lang)` | createVanessaDiffEditor + waitForTimeout(DIFF_NAVIGATOR) |
| `setupEditorPage(page, content, url, title, opts?)` | Полный setup: goto + provider + tabs + editor |

## 4. Setup-pattern unification

### Выбранный паттерн
- **Стандартный** (breakpoints, runtime-progress, widgets): `test.beforeEach` + `setupEditorPage` из helpers
- **Provider-only** (steplist, syntax): локальная `setupProvider`, переписана на `fixtures` из helpers
- **beforeAll + shared state** (folding, hover, hyperlinks): сохранены с `beforeAll`, используют `fixtures`
- **Inline setup** (bsl, public-api): каждый тест делает goto сам, AAA-комментарии добавлены

### Особые случаи
- **editor.spec.ts**: сохранён с `mode: 'serial'` и `beforeAll` со shared `Page`. Перевод на стандартный `beforeEach` сломал бы тесты на события (ON_TAB_CLOSING, PRESS_CTRL_S), которые зависят от `clearEvents` между тестами в рамках одного browser-контекста.
- **diff-editor.spec.ts**: каждый тест вызывает `setupDiff` вместо `beforeEach`, т.к. некоторые тесты нуждаются в дополнительном `waitForTimeout(DIFF_NAVIGATOR)` перед Act. Локальная функция переписана на `fixtures`.
- **subcode.spec.ts**: один тест с большим `page.evaluate` — Arrange/Act/Assert внутри одного evaluate. Паттерн сохранён, добавлены комментарии вокруг evaluate.

## 5. Type safety

Создан `test/_types.d.ts`, дополняющий `window` глобалами:
- `monaco`, `VanessaTabs`, `VanessaGherkinProvider`
- Все `create*` / `dispose*` / `useVanessaDebugger` функции
- `__editor__?: IPublicVanessaEditor`
- `__diff__?: IPublicVanessaDiffEditor`
- `__eventsData__?: any[]`

Файл подключён в `test/tsconfig.json` через `files`.

### Оставшиеся `(window as any)`
В spec-файлах остались `(window as any)` в контексте `page.evaluate` — это неизбежно, т.к. `page.evaluate` сериализует функцию и исполняет её в browser-контексте, где TypeScript-типы недоступны в runtime. Типизация через `_types.d.ts` работает для IDE в Node-части (вне `page.evaluate`), но не влияет на сериализованный код внутри evaluate.

## 6. Timeouts

Все `page.waitForTimeout` заменены на TIMEOUTS-константы:

| Файл | Было | Стало |
|------|------|-------|
| `breakpoints.spec.ts` | `waitForTimeout(100)` в `setup()` | `TIMEOUTS.EDITOR_READY` в `setupEditorPage` |
| `diff-editor.spec.ts` | `waitForTimeout(200)` в `setupDiff()` | `TIMEOUTS.EDITOR_READY * 2` |
| `diff-editor.spec.ts` | `waitForTimeout(500)` перед navigate | `TIMEOUTS.DIFF_NAVIGATOR` |
| `editor.spec.ts` | `waitForTimeout(100)` в `openEditor()` | `TIMEOUTS.EDITOR_READY` |
| `editor.spec.ts` | `waitForTimeout(50)` (×4 tab switch) | `TIMEOUTS.TAB_SWITCH` |
| `runtime-progress.spec.ts` | `waitForTimeout(100)` в `setup()` | `TIMEOUTS.EDITOR_READY` в `setupEditorPage` |
| `viewer.spec.ts` | `waitForTimeout(50)` в `setupTabs()` | `TIMEOUTS.VIEWER_READY` |
| `widgets.spec.ts` | `waitForTimeout(100)` (×3) | `TIMEOUTS.WIDGET_RENDER` |

Замена на `waitForFunction` не производилась: ожидания связаны с Monaco internal rendering (не DOM-условие), замена давала бы flake.

## 7. Steplist дубликаты тестов

Три теста в `steplist.spec.ts` проверяют одинаковый expected:
- `'Подсказка для строки с ключевым словом'` — ввод `'\t\tИ это значит что'`
- `'Подсказка с ключевым словом и пробелом'` — ввод `'\t\tИ это значит что '` (пробел в конце)
- `'Подсказка для строки с началом шага'` — ввод `'\t\tИ это значит что список'`

Все три проверяют одинаковый `step.suggestions[0]`. Оценка: **intentional robustness test** — проверяют что completion работает одинаково вне зависимости от trailing space и введённого prefixа шага. Объединение нецелесообразно, т.к. каждый тест тестирует отдельный edge case фильтрации suggestions.

## 8. Известные ограничения

1. **editor.spec.ts serial mode**: перевод на `setupEditorPage` невозможен без изменения логики event-тестов. Shared page через `beforeAll` — намеренный паттерн для serial-тестирования событий.
2. **`(window as any)` внутри `page.evaluate`**: неизбежно — browser context не имеет TypeScript. Типы из `_types.d.ts` применяются только в Node-части.
3. **subcode.spec.ts**: Arrange/Act внутри одного `page.evaluate` — логика требует await внутри browser context (два `await new Promise`), разбить на отдельные evaluate без изменения семантики невозможно.
4. **diff-editor.spec.ts `setReadOnly`**: тест содержит закомментированный код с `opts1` (никогда не использован). Сохранено без изменений — не затрагивает ассерты.

## 9. Прогон

- **Результат**: 162/162 passed
- **Время**: ~3 минуты 18 секунд
- **Браузеры**: chromium + webkit
- **Команда**: `npx playwright test`
