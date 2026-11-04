// Persistência de progresso no localStorage.

export interface Progress {
  bestScore: number;
  clearedGyms: string[];
}

const KEY = 'pokelatro:progress:v1';

const EMPTY: Progress = { bestScore: 0, clearedGyms: [] };

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
      clearedGyms: Array.isArray(parsed.clearedGyms) ? parsed.clearedGyms : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // localStorage indisponível (modo privado etc.) — ignora silenciosamente.
  }
}

/** Registra o fim de uma partida, atualizando recorde e ginásios vencidos. */
export function recordResult(gymId: string, score: number, won: boolean): Progress {
  const p = loadProgress();
  const next: Progress = {
    bestScore: Math.max(p.bestScore, score),
    clearedGyms: won && !p.clearedGyms.includes(gymId) ? [...p.clearedGyms, gymId] : p.clearedGyms,
  };
  saveProgress(next);
  return next;
}
