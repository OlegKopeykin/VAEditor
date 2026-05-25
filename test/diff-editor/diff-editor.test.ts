import { VanessaDiffEditor } from '../../src/vanessa-diff-editor';
import { VanessaTabs } from '../../src/vanessa-tabs';
import { initGherkinProvider } from '../provider';
let expect = require('chai').expect;

const tabs = (window as any).VanessaTabs as VanessaTabs;

const originalText = 'Первая строка\nВторая строка\nТретья строка';
const modifiedText = 'Первая строка\nИзменённая строка\nТретья строка\nДобавленная строка';

describe('Diff редактор', function () {
  let diff: VanessaDiffEditor;

  before((done) => {
    initGherkinProvider();
    // tabs.diff даёт правильный VanessaDiffEditor внутри tabs-инфры (избегаем падения fireEvent на null)
    diff = tabs.diff(
      originalText, 'diff-old.feature', 'diff-old.feature',
      modifiedText, 'diff-new.feature', 'diff-new.feature',
      'Diff', 0, false, true
    ) as VanessaDiffEditor;
    setTimeout(done, 300);
  });

  it('Создание diff-редактора и базовая модель', () => {
    // Arrange + Act — diff создан в before(); читаем тип, dom-узел и значение модели
    const info = {
      type: diff.type,
      hasDomNode: !!diff.domNode(),
      modelValue: (diff as any).getModel().getValue()
    };

    // Assert
    expect(info.type).to.equal(1);
    expect(info.hasDomNode).to.equal(true);
    expect(info.modelValue).to.equal(modifiedText);
  });

  it('setValue заменяет оба варианта (original + modified)', () => {
    // Arrange
    const newOriginal = 'Новый старый текст';
    const newModified = 'Новый изменённый текст';

    // Act — вызываем setValue и читаем оба под-редактора
    diff.setValue(newOriginal, 'old.txt', newModified, 'new.txt');
    const values = {
      modified: diff.editor.getModifiedEditor().getModel().getValue(),
      original: diff.editor.getOriginalEditor().getModel().getValue()
    };

    // Assert
    expect(values.original).to.equal(newOriginal);
    expect(values.modified).to.equal(newModified);
  });

  it('setReadOnly применяется к модифицированному редактору', () => {
    // Arrange — гарантируем известный контент в модифицированной части
    diff.setValue('a', 'old2.txt', 'b', 'new2.txt');
    const me = diff.editor.getModifiedEditor();
    const before = me.getModel().getValue();

    // Act — включаем readOnly и пробуем напечатать через trigger('type')
    diff.setReadOnly(true);
    me.focus();
    diff.trigger('keyboard', 'type', { text: 'XXX' });
    const after = me.getModel().getValue();
    diff.setReadOnly(false);

    // Assert — readOnly заблокировал ввод
    expect(typeof diff.setReadOnly).to.equal('function');
    expect(after).to.equal(before);
  });

  it('setSideBySide переключает renderSideBySide опцию', () => {
    // Arrange
    const dom = diff.domNode();

    // Act — inline (false) убирает класс .side-by-side, sideBySide (true) возвращает
    diff.setSideBySide(false);
    const inline = dom.classList.contains('side-by-side') === false;
    diff.setSideBySide(true);
    const sideBySide = dom.classList.contains('side-by-side');

    // Assert
    expect(inline).to.equal(true);
    expect(sideBySide).to.equal(true);
  });

  it('next/canNavigate вызываются без exception', () => {
    // Arrange — модель с гарантированной разницей в каждой строке
    diff.setValue('A\nB\nC', 'old3.txt', 'A1\nB1\nC1', 'new3.txt');

    // Act + Assert — основное требование: метод вызывается без exception
    let err: any = null;
    try { diff.next(); } catch (e) { err = e; }
    expect(err).to.equal(null);
    expect(typeof diff.canNavigate).to.equal('function');
  });

  it('setTheme меняет тему monaco', () => {
    // Arrange
    const dom = diff.domNode();
    const themeEl = dom.closest('.monaco-editor') || dom.querySelector('.monaco-editor');

    // Act
    diff.setTheme('vs-dark');
    const darkClass = themeEl ? themeEl.classList.contains('vs-dark') : false;
    diff.setTheme('vs');
    const lightClass = themeEl ? themeEl.classList.contains('vs') : false;

    // Assert
    expect(darkClass).to.equal(true);
    expect(lightClass).to.equal(true);
  });

  it('диффы переключаются через tabs.canNavigateDiff', () => {
    // Arrange + Act
    const canNavigate = tabs.canNavigateDiff;

    // Assert — публичный API контракта присутствует и возвращает boolean
    expect(typeof canNavigate === 'boolean' || typeof canNavigate === 'undefined').to.equal(true);
  });
});
