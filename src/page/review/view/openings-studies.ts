import { html, type SafeHtml } from '#shared/html.ts';
import type { StudyChapter } from '#page/review/practice/studies.ts';
import type { Session } from '#page/review/session.ts';
import { svgIcon } from './markup.ts';

// The user's studies on the repertoire's page: each unfolds on its chapters,
// and a chapter starts practice on its moves.

function chaptersMarkup(session: Session, chapters: readonly StudyChapter[]): SafeHtml {
  const { home } = session.language.ui.practice.page;
  if (chapters.length === 0) return html`<p class="ln-ext-openings__note">${home.noChapter}</p>`;
  return html`<ul class="ln-ext-studies__chapters">${chapters.map(
    (chapter, i) =>
      html`<li><button class="ln-ext-studies__chapter" data-ln-ext="practice-chapter" data-ln-ext-value="${i}"><i class="ln-ext-pc ln-ext-pc-${chapter.side === 'white' ? 'wk' : 'bk'}"></i><span>${chapter.name}</span><small>${home.chapterSide(chapter.side)}</small>${svgIcon('play')}</button></li>`,
  )}</ul>`;
}

function openStudy(session: Session): SafeHtml {
  const { home } = session.language.ui.practice.page;
  const { study } = session.view.openings;
  if (!study) return html``;
  const { chapters } = study;
  if (chapters.state === 'done') return chaptersMarkup(session, chapters.value);
  const note = chapters.state === 'failed' ? home.studiesFailed : home.studiesLoading;
  return html`<p class="ln-ext-openings__note">${note}</p>`;
}

export function studiesList(session: Session): SafeHtml {
  const { home } = session.language.ui.practice.page;
  const { studies, study } = session.view.openings;
  if (studies.state !== 'done') {
    const note = studies.state === 'failed' ? home.studiesFailed : home.studiesLoading;
    return html`<p class="ln-ext-openings__note">${note}</p>`;
  }
  if (studies.value.length === 0)
    return html`<p class="ln-ext-openings__note">${home.studiesNone}</p>`;
  return html`<ul class="ln-ext-studies">${studies.value.map(each => {
    const open = study?.id === each.id;
    return html`<li class="ln-ext-studies__item"><button class="ln-ext-studies__study" data-ln-ext="practice-study" data-ln-ext-value="${each.id}" aria-expanded="${String(open)}"><span class="ln-ext-studies__tile">${svgIcon('studies')}</span><span>${each.name}</span>${svgIcon('next')}</button>${open ? openStudy(session) : ''}</li>`;
  })}</ul>`;
}
