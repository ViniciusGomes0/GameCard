// Menu de configurações (engrenagem) estilo Balatro — gráficos e skins de baralho.
//
// Autocontido: injeta o botão e o painel no <body>, aplica tudo via classes e
// variáveis CSS no #app, e persiste no localStorage. NÃO depende do GameUI nem
// reescreve cards.ts — as skins só restilizam .cs-back/.cb-ball por [data-skin].

import * as cards from './cards';

export interface Settings {
  crt: boolean;
  bg: boolean;
  shake: boolean;
  foil: boolean;
  motion: boolean;
  skin: string;
  customBack: string | null;
}

const KEY = 'pokelatro:settings:v1';

const DEFAULTS: Settings = {
  crt: true,
  bg: true,
  shake: true,
  foil: true,
  motion: true,
  skin: 'classic',
  customBack: null,
};

interface SkinDef {
  id: string;
  name: string;
  ball: string; // classes da pokébola de preview (reusa .pb do CSS)
}

export const SKINS: SkinDef[] = [
  { id: 'classic', name: 'Clássica', ball: 'pb' },
  { id: 'great', name: 'Great', ball: 'pb pb-great' },
  { id: 'ultra', name: 'Ultra', ball: 'pb pb-ultra' },
  { id: 'master', name: 'Master', ball: 'pb pb-master' },
  { id: 'custom', name: 'Custom', ball: 'pb' },
];

const TOGGLES: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'crt', label: 'Scanlines (CRT)', hint: 'Linhas e vinheta de TV antiga' },
  { key: 'bg', label: 'Fundo animado', hint: 'Ondas e brilho do fundo' },
  { key: 'shake', label: 'Tremor de tela', hint: 'Sacudida ao pontuar' },
  { key: 'foil', label: 'Brilho foil', hint: 'Reflexo arco-íris nas cartas raras' },
  { key: 'motion', label: 'Animações', hint: 'Flutuação das cartas e efeitos' },
];

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* localStorage indisponível — ignora */
  }
}

let settings = load();

function apply(): void {
  const app = document.querySelector<HTMLElement>('#app');
  if (!app) return;
  app.classList.toggle('gfx-no-crt', !settings.crt);
  app.classList.toggle('gfx-no-bg', !settings.bg);
  app.classList.toggle('gfx-no-shake', !settings.shake);
  app.classList.toggle('gfx-no-foil', !settings.foil);
  app.classList.toggle('gfx-reduce-motion', !settings.motion);
  app.dataset.skin = settings.skin;
  if (settings.customBack) {
    app.style.setProperty('--card-back-img', `url("${settings.customBack}")`);
  }
  // Movimento das cartas (JS): usa o setter de cards.ts se existir (opcional).
  const setMotion = (cards as unknown as { setMotionScale?: (n: number) => void }).setMotionScale;
  if (typeof setMotion === 'function') setMotion(settings.motion ? 1 : 0);
}

// -------------------------------------------------------------- UI

const GEAR_SVG = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
  <path fill="currentColor" d="M19.4 13a7.8 7.8 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.8 7.8 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/>
</svg>`;

function skinSwatches(): string {
  return SKINS.map((sk) => {
    const sel = settings.skin === sk.id ? ' sel' : '';
    const inner =
      sk.id === 'custom'
        ? `<div class="sw-custom" style="${settings.customBack ? `background-image:url('${settings.customBack}')` : ''}">${settings.customBack ? '' : '＋'}</div>`
        : `<div class="${sk.ball}" style="--s:38px"></div>`;
    return `<button class="skin-sw${sel}" data-skin="${sk.id}">
      <div class="sw-ball">${inner}</div>
      <span>${sk.name}</span>
    </button>`;
  }).join('');
}

function panelHtml(): string {
  const toggles = TOGGLES.map(
    (t) => `<label class="set-row">
      <span class="set-info"><b>${t.label}</b><small>${t.hint}</small></span>
      <span class="switch"><input type="checkbox" data-key="${t.key}" ${settings[t.key] ? 'checked' : ''}/><span class="track"></span></span>
    </label>`,
  ).join('');

  return `
    <div class="set-backdrop" id="set-backdrop"></div>
    <div class="set-panel" role="dialog" aria-label="Configurações">
      <div class="set-head">
        <span>Configurações</span>
        <button class="set-close" id="set-close" aria-label="Fechar">✕</button>
      </div>
      <div class="set-body">
        <div class="set-section-title">Gráficos</div>
        ${toggles}
        <div class="set-section-title">Baralho</div>
        <div class="skin-grid" id="skin-grid">${skinSwatches()}</div>
        <p class="set-tip">Escolha o verso das suas cartas. Em <b>Custom</b>, envie sua própria imagem.</p>
      </div>
    </div>
    <input type="file" id="skin-file" accept="image/*" hidden />`;
}

let host: HTMLDivElement | null = null;

function closePanel(): void {
  host?.classList.remove('open');
}

function refreshSkins(): void {
  const grid = host?.querySelector('#skin-grid');
  if (grid) grid.innerHTML = skinSwatches();
  bindSkins();
}

function bindSkins(): void {
  host?.querySelectorAll<HTMLButtonElement>('.skin-sw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.skin!;
      if (id === 'custom') {
        host?.querySelector<HTMLInputElement>('#skin-file')?.click();
        return;
      }
      settings.skin = id;
      apply();
      save(settings);
      refreshSkins();
    });
  });
}

function openPanel(): void {
  if (!host) return;
  host.classList.add('open');
}

export function initSettings(): void {
  apply();
  if (host) return;

  host = document.createElement('div');
  host.className = 'settings-host';
  host.innerHTML = `
    <button class="gear-btn" id="gear-btn" aria-label="Configurações" title="Configurações">${GEAR_SVG}</button>
    <div class="set-modal" id="set-modal">${panelHtml()}</div>`;
  document.body.appendChild(host);

  const modal = host.querySelector<HTMLElement>('#set-modal')!;
  // mantém o modal montado, mas só visível quando .open
  host.querySelector('#gear-btn')!.addEventListener('click', openPanel);
  modal.querySelector('#set-close')!.addEventListener('click', closePanel);
  modal.querySelector('#set-backdrop')!.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  // toggles de gráficos
  modal.querySelectorAll<HTMLInputElement>('input[data-key]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const key = inp.dataset.key as keyof Settings;
      (settings as unknown as Record<string, boolean>)[key] = inp.checked;
      apply();
      save(settings);
    });
  });

  // upload de imagem custom
  const file = modal.querySelector<HTMLInputElement>('#skin-file')!;
  file.addEventListener('change', () => {
    const f = file.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      settings.customBack = String(reader.result);
      settings.skin = 'custom';
      apply();
      save(settings);
      refreshSkins();
    };
    reader.readAsDataURL(f);
    file.value = '';
  });

  bindSkins();
}
