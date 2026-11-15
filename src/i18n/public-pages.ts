import { getLanguage, setLanguage, subscribeLanguage, initializeLanguage } from './locale';
import { publicEnglish } from './public-en';

/** Only explicitly marked static content is localized; decorative DOM is untouched. */
export function initializePublicPage(): void {
  initializeLanguage();
  const textBindings = [...document.querySelectorAll<HTMLElement>('[data-i18n-es]')].map(element => ({ element, spanish: element.dataset.i18nEs!, english: element.textContent ?? '' }));
  const attributeBindings = ['content', 'aria-label', 'alt'].flatMap(attribute =>
    [...document.querySelectorAll<HTMLElement>(`[data-i18n-${attribute}-es]`)].map(element => ({ element, attribute, spanish: element.getAttribute(`data-i18n-${attribute}-es`)!, english: element.getAttribute(attribute) ?? '' }))
  );
  const selectors = [...document.querySelectorAll<HTMLSelectElement>('[data-language-select]')];
  const update = () => {
    const language = getLanguage();
    for (const { element, spanish, english } of textBindings) element.textContent = language === 'es' ? spanish : publicEnglish[spanish] ?? english;
    for (const { element, attribute, spanish, english } of attributeBindings) element.setAttribute(attribute, language === 'es' ? spanish : publicEnglish[spanish] ?? english);
    for (const selector of selectors) selector.value = language;
  };
  for (const selector of selectors) selector.addEventListener('change', () => {
    if (selector.value === 'en' || selector.value === 'es') setLanguage(selector.value);
  });
  subscribeLanguage(update);
  update();
}
