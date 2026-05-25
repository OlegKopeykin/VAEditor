import { VanessaEditor } from '../../src/vanessa-editor';
import { VanessaTabs } from '../../src/vanessa-tabs';
import { initGherkinProvider } from '../provider';
let expect = require('chai').expect;

const tabs = (window as any).VanessaTabs as VanessaTabs;

const content = 'Шаг первый\nШаг второй\nШаг третий\nШаг четвёртый\nШаг пятый';
const url = 'runtime-progress-test.feature';
const title = 'Прогресс выполнения';

describe('Runtime progress API', function () {
  let editor: VanessaEditor;

  before((done) => {
    initGherkinProvider();
    editor = tabs.edit(content, url, url, title, 0, false, true) as VanessaEditor;
    setTimeout(done, 100);
  });

  it('setCurrentProgress + getCurrentProgress round-trip', () => {
    // Act
    editor.setCurrentProgress(3);
    const result = editor.getCurrentProgress();

    // Assert
    expect(result.lineNumber).to.equal(3);
  });

  it('setRuntimeProgress по статусу — содержит конкретные строки', () => {
    // Arrange — изолируем тест, очищая прогресс от предыдущих
    editor.clearRuntimeProgress();

    // Act — два разных статуса на разные строки
    editor.setRuntimeProgress('complete', [1, 2] as any);
    editor.setRuntimeProgress('error', [4] as any);
    const completeStr = JSON.stringify(editor.getRuntimeProgress('complete'));
    const errorStr = JSON.stringify(editor.getRuntimeProgress('error'));

    // Assert — ищем номера строк в сериализованном результате
    expect(completeStr).to.match(/[\[,]1[,\]\}]/);
    expect(completeStr).to.match(/[\[,]2[,\]\}]/);
    expect(errorStr).to.match(/[\[,]4[,\]\}]/);
  });

  it('nextRuntimeProgress продвигается по строкам', () => {
    // Arrange — стартуем с 1
    editor.setCurrentProgress(1);
    const p1 = editor.getCurrentProgress();

    // Act
    editor.nextRuntimeProgress();
    const p2 = editor.getCurrentProgress();
    editor.nextRuntimeProgress();
    const p3 = editor.getCurrentProgress();

    // Assert
    expect(p1.lineNumber).to.equal(1);
    expect(p2.lineNumber).to.be.greaterThan(p1.lineNumber);
    expect(p3.lineNumber).to.be.at.least(p2.lineNumber);
  });

  it('clearRuntimeProgress сбрасывает позицию и статусы', () => {
    // Arrange
    editor.setCurrentProgress(2);
    editor.setRuntimeProgress('complete', [1] as any);

    // Act
    editor.clearRuntimeProgress();
    const current = editor.getCurrentProgress();
    const completeAfter = JSON.stringify(editor.getRuntimeProgress('complete'));

    // Assert — текущая позиция исчезла, complete не содержит строки 1
    expect(!current).to.equal(true);
    expect(completeAfter).to.not.match(/[\[,]1[,\]\}]/);
  });

  it('setStackStatus + clearStackStatus вызываются без ошибок', () => {
    // Act — собираем ошибки от каждого вызова
    const errs: string[] = [];
    try { editor.setStackStatus(true, 2); } catch (err: any) { errs.push('set2:' + err.message); }
    try { editor.setStackStatus(true, 4); } catch (err: any) { errs.push('set4:' + err.message); }
    try { editor.clearStackStatus(); } catch (err: any) { errs.push('clear:' + err.message); }

    // Assert
    expect(errs).to.deep.equal([]);
  });

  it('Codicons: setLineCodicon + getLineCodicon + clearCodicons', () => {
    // Arrange
    editor.clearCodicons();
    editor.setLineCodicon('2', 'codicon-circle-filled');
    editor.setLineCodicon('3', 'codicon-circle-outline');

    // Act — сначала фиксируем «до», потом очищаем, фиксируем «после»
    const before = {
      line2: editor.getLineCodicon(2),
      line3: editor.getLineCodicon(3)
    };
    editor.clearCodicons();
    const after = {
      line2: editor.getLineCodicon(2),
      line3: editor.getLineCodicon(3)
    };

    // Assert
    expect(before.line2).to.include('codicon-circle-filled');
    expect(before.line3).to.include('codicon-circle-outline');
    expect(after.line2).to.not.include('codicon-circle-filled');
    expect(after.line3).to.not.include('codicon-circle-outline');
  });
});
