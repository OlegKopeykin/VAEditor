import { VanessaEditor } from '../../src/vanessa-editor';
import { VanessaTabs } from '../../src/vanessa-tabs';
import { initGherkinProvider } from '../provider';
let expect = require('chai').expect;

const tabs = (window as any).VanessaTabs as VanessaTabs;

const content = 'Шаг первый\nШаг второй\nШаг третий\nШаг четвёртый\nШаг пятый';
const url = 'widgets-test.feature';
const title = 'Виджеты';

const subcodeText = 'Когда я делаю что-то\nИ ещё что-то\nТо результат правильный';

describe('Виджеты — ошибки и подсценарии', function () {
  let editor: VanessaEditor;

  before((done) => {
    initGherkinProvider();
    editor = tabs.edit(content, url, url, title, 0, false, true) as VanessaEditor;
    setTimeout(done, 100);
  });

  it('showRuntimeError возвращает уникальный непустой string-id', () => {
    // Act
    const id1 = editor.showRuntimeError(2, '', 'd1', 'ошибка 1');
    const id2 = editor.showRuntimeError(3, '', 'd2', 'ошибка 2');

    // Assert
    expect(typeof id1).to.equal('string');
    expect(typeof id2).to.equal('string');
    expect(id1.length).to.be.greaterThan(0);
    expect(id2.length).to.be.greaterThan(0);
    expect(id1).to.not.equal(id2);

    editor.clearRuntimeErrors();
  });

  it('clearRuntimeErrors не падает на повторном вызове', () => {
    // Arrange — вешаем два error widget'а
    editor.showRuntimeError(1, '', 'd1', 'ошибка 1');
    editor.showRuntimeError(3, '', 'd2', 'ошибка 2');

    // Act + Assert — clear не должен бросать
    let err: any = null;
    try { editor.clearRuntimeErrors(); } catch (e) { err = e; }
    expect(err).to.equal(null);
  });

  it('showRuntimeCode создаёт subcode widget в DOM', (done) => {
    // Act
    editor.showRuntimeCode(2, subcodeText);
    setTimeout(() => {
      const nodeCount = document.querySelectorAll('div.vanessa-code-lines>span').length;

      // Assert
      expect(nodeCount).to.be.greaterThan(0);
      editor.clearRuntimeCodes();
      done();
    }, 300);
  });

  it('clearRuntimeCodes удаляет DOM элементы subcode', (done) => {
    // Arrange — добавить два subcode widget'а
    editor.showRuntimeCode(1, subcodeText);
    editor.showRuntimeCode(3, subcodeText);
    setTimeout(() => {
      const before = document.querySelectorAll('div.vanessa-code-lines>span').length;

      // Assert #1
      expect(before).to.be.greaterThan(0);

      // Act — очистить
      editor.clearRuntimeCodes();
      setTimeout(() => {
        const after = document.querySelectorAll('div.vanessa-code-lines>span').length;
        expect(after).to.be.lessThan(before);
        done();
      }, 300);
    }, 300);
  });

  it('getWidgets возвращает массив с добавленными виджетами', () => {
    // Arrange + Act
    editor.clearRuntimeCodes();
    editor.clearRuntimeErrors();
    const beforeAll = JSON.parse(editor.getWidgets());
    editor.showRuntimeCode(2, subcodeText);
    editor.showRuntimeError(4, '', 'd', 'ошибка');
    const afterAll = JSON.parse(editor.getWidgets());

    // Assert
    expect(afterAll.length).to.be.greaterThan(beforeAll.length);
    // getLineWidgets возвращает валидный JSON
    const line2Raw = editor.getLineWidgets(2);
    const line4Raw = editor.getLineWidgets(4);
    expect(() => JSON.parse(line2Raw)).to.not.throw();
    expect(() => JSON.parse(line4Raw)).to.not.throw();

    editor.clearRuntimeCodes();
    editor.clearRuntimeErrors();
  });

  it('setSubcodeFolding доступен в публичном API', () => {
    // Arrange + Act + Assert — функциональный smoke без вызова на реальном widget,
    // т.к. layoutViewZone требует прогретого view-zones в monaco
    expect(typeof editor.setSubcodeFolding).to.equal('function');
  });
});
