import { VanessaEditor } from '../../src/vanessa-editor';
import { VanessaTabs } from '../../src/vanessa-tabs';
import { initGherkinProvider } from '../provider'
let expect = require('chai').expect;

//@ts-ignore
const tabs = window.VanessaTabs as VanessaTabs;

const line1 = 'Функционал: Нормализация отступов';
const line2 = '\tСценарий: Табы и пробелы';
const line3 = '        Дано шаг с пробелами';
const line4 = '\t    Дано шаг со смешанным отступом';
const content = [line1, line2, line3, line4].join('\n');
const url = 'Отступы.feature';
const title = 'Нормализация отступов';

describe('Нормализация отступов', function () {
  let editor: VanessaEditor;

  before((done) => {
    initGherkinProvider();
    editor = tabs.edit(content, url, url, title, 0, false, true) as VanessaEditor;
    editor.setTabSize(4);
    setTimeout(done, 100);
  });
  after((done) => {
    //@ts-ignore
    tabs.current.domClose.click();
    done();
  });
  it('Приведение отступов к пробелам', () => {
    editor.setInsertSpaces(true);
    editor.normalizeIndentation();
    expect(editor.getLineContent(1)).to.equal(line1);
    expect(editor.getLineContent(2)).to.equal('    Сценарий: Табы и пробелы');
    expect(editor.getLineContent(3)).to.equal(line3);
    expect(editor.getLineContent(4)).to.equal('        Дано шаг со смешанным отступом');
  });
  it('Отмена нормализации возвращает исходный текст', () => {
    editor.trigger('test', 'undo');
    expect(editor.getContent()).to.equal(content);
  });
  it('Приведение отступов к табам', () => {
    editor.setInsertSpaces(false);
    editor.normalizeIndentation();
    expect(editor.getLineContent(1)).to.equal(line1);
    expect(editor.getLineContent(2)).to.equal(line2);
    expect(editor.getLineContent(3)).to.equal('\t\tДано шаг с пробелами');
    expect(editor.getLineContent(4)).to.equal('\t\tДано шаг со смешанным отступом');
  });
  it('Повторная нормализация не меняет текст', () => {
    const before = editor.getContent();
    const versionId = editor.getModel().getVersionId();
    editor.normalizeIndentation();
    expect(editor.getContent()).to.equal(before);
    expect(editor.getModel().getVersionId()).to.equal(versionId);
  });
});
