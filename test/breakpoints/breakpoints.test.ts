import { VanessaEditor } from '../../src/vanessa-editor';
import { VanessaTabs } from '../../src/vanessa-tabs';
import { initGherkinProvider } from '../provider';
let expect = require('chai').expect;

const tabs = (window as any).VanessaTabs as VanessaTabs;

const content = 'Первая строка\nВторая строка\nТретья строка\nЧетвёртая строка\nПятая строка';
const url = 'breakpoints-test.feature';
const title = 'Точки останова';

describe('Breakpoints API', function () {
  let editor: VanessaEditor;

  before((done) => {
    initGherkinProvider();
    editor = tabs.edit(content, url, url, title, 0, false, true) as VanessaEditor;
    setTimeout(done, 100);
  });

  it('setBreakpoints + getBreakpoints round-trip', () => {
    // Arrange — три breakpoint с разными enable
    const input = [
      { lineNumber: 1, codeWidget: '', enable: true },
      { lineNumber: 3, codeWidget: '', enable: true },
      { lineNumber: 5, codeWidget: '', enable: false }
    ];

    // Act
    editor.setBreakpoints(JSON.stringify(input));
    const result = JSON.parse(editor.getBreakpoints(''));

    // Assert — порядок не гарантирован, сортируем по lineNumber
    expect(result).to.have.lengthOf(3);
    const sorted = [...result].sort((a: any, b: any) => a.lineNumber - b.lineNumber);
    expect(sorted[0].lineNumber).to.equal(1);
    expect(sorted[0].enable).to.equal(true);
    expect(sorted[1].lineNumber).to.equal(3);
    expect(sorted[1].enable).to.equal(true);
    expect(sorted[2].lineNumber).to.equal(5);
    expect(sorted[2].enable).to.equal(false);
  });

  it('decorateBreakpoints как алиас setBreakpoints', () => {
    // Arrange — обнуляем состояние перед проверкой
    editor.setBreakpoints(JSON.stringify([]));

    // Act
    editor.decorateBreakpoints(JSON.stringify([{ lineNumber: 2, codeWidget: '', enable: true }]));
    const result = JSON.parse(editor.getBreakpoints(''));

    // Assert
    expect(result).to.have.lengthOf(1);
    expect(result[0].lineNumber).to.equal(2);
    expect(result[0].enable).to.equal(true);
  });

  it('toggleBreakpoint добавляет breakpoint с enable=true', () => {
    // Arrange — стартуем с пустого
    editor.setBreakpoints(JSON.stringify([]));

    // Act
    editor.toggleBreakpoint(2);
    const result = JSON.parse(editor.getBreakpoints(''));

    // Assert
    expect(result).to.have.lengthOf(1);
    expect(result[0].lineNumber).to.equal(2);
    expect(result[0].enable).to.equal(true);
    expect(typeof result[0].codeWidget).to.equal('string');
  });

  it('setBreakpoints с пустым массивом очищает все', () => {
    // Arrange
    editor.setBreakpoints(JSON.stringify([
      { lineNumber: 1, codeWidget: '', enable: true },
      { lineNumber: 2, codeWidget: '', enable: true }
    ]));

    // Act
    editor.setBreakpoints(JSON.stringify([]));
    const result = JSON.parse(editor.getBreakpoints(''));

    // Assert
    expect(result).to.have.lengthOf(0);
  });

  it('toggleBreakpoint удаляет существующий', () => {
    // Arrange
    editor.setBreakpoints(JSON.stringify([{ lineNumber: 2, codeWidget: '', enable: true }]));

    // Act
    editor.toggleBreakpoint(2);
    const result = JSON.parse(editor.getBreakpoints(''));

    // Assert — на 2-й строке точек не осталось
    const onLine2 = result.filter((b: any) => b.lineNumber === 2);
    expect(onLine2).to.have.lengthOf(0);
  });
});
