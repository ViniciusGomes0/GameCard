import { defineConfig } from 'vite';

// Em produção (GitHub Pages) o site é servido em /GameCard/ (nome do repositório);
// em desenvolvimento continua na raiz (http://localhost:5173/).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/GameCard/' : '/',
}));
