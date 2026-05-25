import * as monaco from 'monaco-editor';
let expect = require('chai').expect;

describe('Язык BSL (1С:Предприятие)', function () {

  it('BSL зарегистрирован в monaco', () => {
    // Act
    const languages = monaco.languages.getLanguages().map((l: any) => l.id);

    // Assert
    expect(languages).to.include('bsl');
  });

  it('Модель BSL создаётся с указанным языком', () => {
    // Arrange
    const source = 'Процедура Тест()\n\tСообщить("Привет");\nКонецПроцедуры';

    // Act
    const model = monaco.editor.createModel(source, 'bsl');
    const result = {
      languageId: (model as any).getLanguageId ? (model as any).getLanguageId() : (model as any).getModeId?.(),
      lineCount: model.getLineCount(),
      firstLine: model.getLineContent(1)
    };

    // Assert
    expect(result.languageId).to.equal('bsl');
    expect(result.lineCount).to.equal(3);
    expect(result.firstLine).to.equal('Процедура Тест()');
    model.dispose();
  });

  it('monaco.editor.tokenize работает на BSL-модели', () => {
    // Arrange — BSL зарегистрирован, но monarch-tokenizer не настроен — проверяем что вызов не падает
    const source = 'Процедура Тест()\n\tСообщить("Привет");\nКонецПроцедуры';

    // Act
    const lines = monaco.editor.tokenize(source, 'bsl');

    // Assert
    expect(lines.length).to.equal(3);
    expect(lines.every((l: any) => Array.isArray(l) && l.length > 0)).to.equal(true);
  });
});
