// Ponto único de import do Preact + htm (JSX sem passo de build).
// Se um dia quiseres passar a ter build step (Vite), troca só este ficheiro
// por imports de "preact" / "preact/hooks" / "htm/preact" via npm.
import { h, render, Fragment, createContext } from 'https://esm.sh/preact@10.19.7';
import {
  useState, useEffect, useMemo, useCallback, useRef, useContext, useReducer,
} from 'https://esm.sh/preact@10.19.7/hooks';
import htmMod from 'https://esm.sh/htm@3.1.1';

const html = htmMod.bind(h);

export {
  h, render, Fragment, createContext, html,
  useState, useEffect, useMemo, useCallback, useRef, useContext, useReducer,
};
