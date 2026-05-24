/**
 * Дополнение window globals для тестов.
 * Убирает необходимость в (window as any) для стандартных публичных API.
 * Подключается через test/tsconfig.json.
 */

import '../src/types/public-api'

declare global {
  interface Window {
    monaco: typeof import('monaco-editor')
    VanessaTabs: IPublicVanessaTabs
    VanessaGherkinProvider: IPublicVanessaGherkinProvider
    createVanessaTabs(): IPublicVanessaTabs
    createVanessaEditor(content?: string, language?: string): IPublicVanessaEditor
    createVanessaDiffEditor(original?: string, modified?: string, lang?: string): IPublicVanessaDiffEditor
    disposeVanessaAll(): void
    disposeVanessaTabs(): void
    disposeVanessaEditor(): void
    disposeVanessaDiffEditor(): void
    useVanessaDebugger(value: boolean): void
    /** Текущий редактор, назначаемый в тестах */
    __editor__?: IPublicVanessaEditor
    /** Текущий diff-редактор, назначаемый в тестах */
    __diff__?: IPublicVanessaDiffEditor
    /** Лог событий, назначаемый в editor.spec.ts */
    __eventsData__?: any[]
  }
}

export {}
