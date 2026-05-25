import { VanessaTabs } from '../../src/vanessa-tabs';
import { VanessaViwer } from '../../src/vanessa-viewer';
import { initGherkinProvider } from '../provider';
let expect = require('chai').expect;

const tabs = (window as any).VanessaTabs as VanessaTabs;

const markdownText = `# Заголовок

Описание сценария.

## Подзаголовок

- Шаг первый
- Шаг второй
`;

describe('VanessaViwer — markdown viewer', function () {

  before(() => {
    initGherkinProvider();
  });

  it('tabs.view создаёт viewer с типом MarkdownViwer (=2)', () => {
    // Act
    const viewer = tabs.view('viewer-1.md', 'viewer-1.md', 'viewer-1.md', markdownText) as VanessaViwer;

    // Assert
    expect(viewer.type).to.equal(2);
    expect(!!viewer.domNode()).to.equal(true);
  });

  it('tabs.view на тот же URL возвращает существующую вкладку', () => {
    // Arrange + Act — два вызова с одинаковым URL не плодят вкладок
    const before = tabs.count();
    tabs.view('viewer-2.md', 'viewer-2.md', 'viewer-2.md', markdownText);
    const afterFirst = tabs.count();
    tabs.view('viewer-2.md', 'viewer-2.md', 'viewer-2.md', markdownText);
    const afterSecond = tabs.count();

    // Assert — первое view увеличило счётчик, второе с тем же URL — нет
    expect(afterFirst).to.equal(before + 1);
    expect(afterSecond).to.equal(afterFirst);
  });

  it('tabs.isMarkdownViwer / isCodeEditor / isDiffEditor отражают активную вкладку', () => {
    // Act #1 — открыть viewer (становится активной)
    tabs.view('viewer-flags.md', 'viewer-flags.md', 'viewer-flags.md', markdownText);
    const flagsViewer = {
      isMarkdownViwer: tabs.isMarkdownViwer,
      isCodeEditor: tabs.isCodeEditor,
      isDiffEditor: tabs.isDiffEditor
    };

    // Assert #1
    expect(flagsViewer.isMarkdownViwer).to.equal(true);
    expect(flagsViewer.isCodeEditor).to.equal(false);
    expect(flagsViewer.isDiffEditor).to.equal(false);

    // Act #2 — открыть код-редактор поверх (становится активным)
    tabs.edit('содержимое', 'viewer-flags-edit.feature', 'viewer-flags-edit.feature', 'e', 0, false, true);
    const flagsEditor = {
      isMarkdownViwer: tabs.isMarkdownViwer,
      isCodeEditor: tabs.isCodeEditor,
      isDiffEditor: tabs.isDiffEditor
    };

    // Assert #2
    expect(flagsEditor.isMarkdownViwer).to.equal(false);
    expect(flagsEditor.isCodeEditor).to.equal(true);
    expect(flagsEditor.isDiffEditor).to.equal(false);
  });

  it('повторный view создаёт viewer с непустым DOM', () => {
    // Arrange + Act
    const viewer = tabs.view('viewer-dom.md', 'viewer-dom.md', 'viewer-dom.md', markdownText) as VanessaViwer;

    // Assert
    expect(viewer.type).to.equal(2);
    expect(viewer.domNode().childElementCount).to.be.greaterThan(0);
  });
});
