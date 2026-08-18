import { html } from '../../lib/preact.js';

const PATHS = {
  plus: html`<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
  check: html`<polyline points="4,12 9,17 20,6"/>`,
  trash: html`<polyline points="4,7 20,7"/><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"/>`,
  calendar: html`<rect x="3.5" y="5" width="17" height="16" rx="2"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="7.5" y1="3" x2="7.5" y2="7"/><line x1="16.5" y1="3" x2="16.5" y2="7"/>`,
  sun: html`<circle cx="12" cy="12" r="4.5"/><g stroke-linecap="round"><line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/><line x1="1.5" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22.5" y2="12"/><line x1="4.5" y1="4.5" x2="6.2" y2="6.2"/><line x1="17.8" y1="17.8" x2="19.5" y2="19.5"/><line x1="4.5" y1="19.5" x2="6.2" y2="17.8"/><line x1="17.8" y1="6.2" x2="19.5" y2="4.5"/></g>`,
  moon: html`<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>`,
  search: html`<circle cx="10.5" cy="10.5" r="6.5"/><line x1="20.5" y1="20.5" x2="15.2" y2="15.2"/>`,
  chevronDown: html`<polyline points="6,9 12,15 18,9"/>`,
  chevronRight: html`<polyline points="9,6 15,12 9,18"/>`,
  chevronLeft: html`<polyline points="15,6 9,12 15,18"/>`,
  tag: html`<path d="M3 11.5V5a2 2 0 0 1 2-2h6.5a1 1 0 0 1 .7.3l9 9a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-9-9a1 1 0 0 1-.3-.7z"/><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none"/>`,
  x: html`<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>`,
  settings: html`<circle cx="12" cy="6" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="18" r="1.6"/><line x1="4" y1="6" x2="9" y2="6"/><line x1="15" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="9" y2="18"/><line x1="15" y1="18" x2="20" y2="18"/>`,
  download: html`<path d="M12 3.5v12"/><polyline points="7,11 12,16 17,11"/><line x1="4.5" y1="19.5" x2="19.5" y2="19.5"/>`,
  upload: html`<path d="M12 16.5v-12"/><polyline points="7,9 12,4 17,9"/><line x1="4.5" y1="19.5" x2="19.5" y2="19.5"/>`,
  alert: html`<path d="M12 3.5 22 20.5H2z"/><line x1="12" y1="10" x2="12" y2="14.5"/><circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none"/>`,
  menu: html`<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>`,
  building: html`<rect x="4" y="3.5" width="10" height="17" rx="1"/><rect x="16" y="9" width="4.5" height="11.5" rx="1"/><line x1="7" y1="7" x2="7" y2="7"/><line x1="7" y1="10" x2="7" y2="10"/><g stroke-linecap="round"><line x1="7" y1="7" x2="7.01" y2="7"/><line x1="11" y1="7" x2="11.01" y2="7"/><line x1="7" y1="10.5" x2="7.01" y2="10.5"/><line x1="11" y1="10.5" x2="11.01" y2="10.5"/><line x1="7" y1="14" x2="7.01" y2="14"/><line x1="11" y1="14" x2="11.01" y2="14"/></g>`,
  user: html`<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c1.5-4 4.2-6 7.5-6s6 2 7.5 6"/>`,
  more: html`<circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/>`,
  undo: html`<path d="M7 8H4.5V5.5"/><path d="M4.7 8.2A7.5 7.5 0 1 1 4.5 14"/>`,
  unlink: html`<path d="M9 15 15 9"/><path d="M13.5 6.5 15 5a3.5 3.5 0 0 1 5 5l-1.5 1.5"/><path d="M10.5 17.5 9 19a3.5 3.5 0 0 1-5-5l1.5-1.5"/><line x1="3" y1="3" x2="21" y2="21"/>`,
  link: html`<path d="M9 15 15 9"/><path d="M13.5 6.5 15 5a3.5 3.5 0 0 1 5 5l-1.5 1.5"/><path d="M10.5 17.5 9 19a3.5 3.5 0 0 1-5-5l1.5-1.5"/>`,
  refresh: html`<path d="M4 12a8 8 0 0 1 13.6-5.7L20 8.5"/><polyline points="20,3.5 20,8.5 15,8.5"/><path d="M20 12a8 8 0 0 1-13.6 5.7L4 15.5"/><polyline points="4,20.5 4,15.5 9,15.5"/>`,
  filter: html`<polygon points="3.5,4.5 20.5,4.5 14,12.5 14,18.5 10,20.5 10,12.5"/>`,
  sort: html`<line x1="6" y1="6" x2="6" y2="18"/><polyline points="3,9 6,6 9,9"/><line x1="14" y1="6" x2="21" y2="6"/><line x1="14" y1="12" x2="19" y2="12"/><line x1="14" y1="18" x2="17" y2="18"/>`,
  inbox: html`<polyline points="3.5,12 8,12 9.5,15 14.5,15 16,12 20.5,12"/><path d="M5.5 5.5h13l2 6.5v6.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-6.5z"/>`,
  dots: html`<circle cx="12" cy="5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none"/>`,
  grip: html`<circle cx="9" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.1" fill="currentColor" stroke="none"/>`,
  grid: html`<rect x="3" y="3" width="7.5" height="7.5" rx="1.2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2"/>`,
  clock: html`<circle cx="12" cy="12" r="8.5"/><polyline points="12,7 12,12 16,14"/>`,
  mapPin: html`<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.2"/>`,
};

export function Icon({ name, size = 18, class: cls = '', strokeWidth = 1.8 }) {
  const inner = PATHS[name];
  if (!inner) return null;
  return html`
    <svg
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      width=${size} height=${size} fill="none" stroke="currentColor"
      stroke-width=${strokeWidth} stroke-linecap="round" stroke-linejoin="round"
      class=${cls} aria-hidden="true"
    >${inner}</svg>
  `;
}
