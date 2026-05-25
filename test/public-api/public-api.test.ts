import { VanessaEditor } from '../../src/vanessa-editor';
import { VanessaTabs } from '../../src/vanessa-tabs';
import { initGherkinProvider } from '../provider';
let expect = require('chai').expect;

const tabs = (window as any).VanessaTabs as VanessaTabs;

describe('Public API — window surface', function () {

  before(() => {
    initGherkinProvider();
  });

  it('Все глобальные функции и объекты доступны в window', () => {
    // Arrange — autotest.js уже создал tabs-синглтон; проверяем сам реестр window
    const w = window as any;

    // Act — типизируем каждый ключ публичного surface
    const result = {
      createVanessaTabs: typeof w.createVanessaTabs,
      createVanessaEditor: typeof w.createVanessaEditor,
      createVanessaDiffEditor: typeof w.createVanessaDiffEditor,
      disposeVanessaAll: typeof w.disposeVanessaAll,
      disposeVanessaTabs: typeof w.disposeVanessaTabs,
      disposeVanessaEditor: typeof w.disposeVanessaEditor,
      disposeVanessaDiffEditor: typeof w.disposeVanessaDiffEditor,
      useVanessaDebugger: typeof w.useVanessaDebugger,
      VanessaGherkinProvider: typeof w.VanessaGherkinProvider
    };

    // Assert
    expect(result.createVanessaTabs).to.equal('function');
    expect(result.createVanessaEditor).to.equal('function');
    expect(result.createVanessaDiffEditor).to.equal('function');
    expect(result.disposeVanessaAll).to.equal('function');
    expect(result.disposeVanessaTabs).to.equal('function');
    expect(result.disposeVanessaEditor).to.equal('function');
    expect(result.disposeVanessaDiffEditor).to.equal('function');
    expect(result.useVanessaDebugger).to.equal('function');
    expect(result.VanessaGherkinProvider).to.equal('object');
  });

  it('VanessaGherkinProvider имеет все методы из контракта', () => {
    // Arrange
    const p = (window as any).VanessaGherkinProvider;
    const required = [
      'setKeypairs', 'setKeywords', 'setMetatags', 'setMessages',
      'setStepList', 'setElements', 'setVariables', 'setImports',
      'setErrorLinks', 'setSuggestWidgetWidth'
    ];

    // Act — собираем typeof для каждого требуемого метода
    const methods: Record<string, string> = {};
    for (const m of required) methods[m] = typeof p[m];

    // Assert
    for (const [name, kind] of Object.entries(methods)) {
      expect(kind, `${name} должен быть функцией`).to.equal('function');
    }
  });

  it('VanessaEditor имеет ключевые методы IPublicVanessaEditor', () => {
    // Arrange — берём editor через tabs.edit с уникальным URL чтобы не конфликтовать с другими тестами
    const editor = tabs.edit('пример', 'public-api-editor.feature', 'public-api-editor.feature', 'API', 0, false, true) as VanessaEditor;
    const required = [
      'getContent', 'setContent', 'getLineContent',
      'getSelection', 'setSelection', 'getSelectedContent',
      'getPosition', 'setPosition', 'insertText',
      'getBreakpoints', 'setBreakpoints', 'toggleBreakpoint',
      'setRuntimeProgress', 'getCurrentProgress', 'nextRuntimeProgress', 'clearRuntimeProgress',
      'showRuntimeError', 'showRuntimeCode', 'clearRuntimeErrors', 'clearRuntimeCodes',
      'setLineCodicon', 'getLineCodicon', 'clearCodicons',
      'setReadOnly', 'setTheme', 'revealLine', 'fireEvent', 'showMessage'
    ];

    // Act
    const methods: Record<string, string> = {};
    for (const m of required) methods[m] = typeof (editor as any)[m];

    // Assert
    for (const [name, kind] of Object.entries(methods)) {
      expect(kind, `editor.${name} должен быть функцией`).to.equal('function');
    }
  });

  it('VanessaTabs имеет ключевые методы IPublicVanessaTabs', () => {
    // Arrange
    const required = [
      'edit', 'diff', 'view', 'welcome', 'find',
      'closeAll', 'close', 'count', 'showContextMenu',
      'previousDiff', 'nextDiff', 'canNavigateDiff'
    ];

    // Act
    const methods: Record<string, string> = {};
    for (const m of required) methods[m] = typeof (tabs as any)[m];

    // Assert
    for (const [name, kind] of Object.entries(methods)) {
      expect(kind, `tabs.${name} должен быть функцией`).to.equal('function');
    }
  });
});
