import { register } from 'node:module';

// Regista o resolvedor do alias `@/` e dos doubles - ver tests/node-loader.mjs.
register('./node-loader.mjs', import.meta.url);
