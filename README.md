# Ledger — to-do list local-first com Google Calendar (leitura)

Implementação da Fase 0 + Fase 1 (gestão de tarefas, completa e funcional) e
da Fase 2 (Google Calendar, código completo mas **por testares** — ver aviso
mais abaixo) do documento de requisitos.

## Porque não há `npm install`

Esta app **não tem passo de build**. É HTML/CSS/JS puro, com módulos ES que
carregam React... na verdade Preact + htm diretamente de um CDN (esm.sh) no
browser. Isto foi uma decisão forçada pelo ambiente onde foi construída (sem
acesso a registos npm), mas acabou por ser coerente com o que já tinhas
decidido: sem servidor, sem passo de build a manter, funciona só a abrir o
ficheiro num alojamento estático.

Se um dia quiseres passar a ter Vite/React "a sério" com bundler, todo o
código está organizado em módulos ES normais — a migração é mecânica.

## Como correr localmente

Os módulos ES exigem `http://`, não `file://`. Escolhe uma destas opções a
partir da pasta `todo-app/`:

```bash
# Opção 1 — Python (já vem em quase todos os sistemas)
python3 -m http.server 8080

# Opção 2 — Node, sem instalar nada globalmente
npx serve .
```

Depois abre `http://localhost:8080`.

## Como publicar (recomendado antes de ligar o Google)

Como a app é só ficheiros estáticos, qualquer um destes serve, todos com
HTTPS incluído (necessário para o Google e para o service worker):

- **Netlify** — arrasta a pasta `todo-app/` para app.netlify.com/drop
- **Vercel** — `vercel deploy` dentro da pasta
- **GitHub Pages** — ativa Pages no repositório, pasta raiz `todo-app/`

## O que já funciona sem qualquer configuração

- Todas as tarefas: criar, editar, concluir, eliminar com undo, reordenar por
  arrastar-e-largar, prioridades, datas, listas, etiquetas.
- Duas áreas por omissão (Pessoal / BEST), com possibilidade de criar mais.
- Vistas Hoje, Próximas, Todas, Concluídas, Pesquisar.
- Exportação/importação em JSON, exportação em CSV.
- Tema claro/escuro/automático.
- Funcionamento offline (depois da primeira visita) e instalação como PWA.
- Atalho de teclado `N` para focar a captura rápida; `Esc` fecha painéis.

Experimenta isto primeiro — nada disto depende do Google.

## Ligar o Google Calendar (opcional, exige alguma paciência)

> **Aviso importante:** este bloco de código foi escrito seguindo a
> documentação oficial da Google Identity Services e da API do Calendar, mas
> **não foi possível testá-lo em execução real** — o ambiente onde foi
> construído não tinha acesso à rede nem, obviamente, às tuas credenciais.
> É natural que precises de afinar algum detalhe (nomes de campos, mensagens
> de erro) ao testares pela primeira vez. Se algo não bater certo, o ponto
> de partida para depurar é sempre `js/google/calendarClient.js` — está
> comentado por função.

### Passo 1 — Criar o projeto e o ecrã de consentimento

1. Vai a [console.cloud.google.com](https://console.cloud.google.com) e cria
   um projeto novo (ou usa um existente).
2. Em **APIs e serviços → Ecrã de consentimento OAuth**, escolhe **Externo**,
   preenche o nome da app e o teu e-mail. Deixa em modo **Teste** — assim não
   precisas de submeter a app à Google, mas só as contas que adicionares como
   "utilizadores de teste" conseguem autorizar-se (RF-87, secção 2.1).
3. Em **Utilizadores de teste**, adiciona a tua conta pessoal **e** a conta
   do BEST.

### Passo 2 — Ativar a API do Calendar

Em **APIs e serviços → Biblioteca**, procura "Google Calendar API" e ativa-a.

### Passo 3 — Criar o Client ID

1. Em **APIs e serviços → Credenciais → Criar credenciais → ID de cliente
   OAuth**.
2. Tipo de aplicação: **Aplicação Web**.
3. Em **Origens JavaScript autorizadas**, adiciona o endereço onde vais
   correr a app — por exemplo `http://localhost:8080` para testes locais, e
   o endereço `https://...` do Netlify/Vercel/GitHub Pages quando publicares.
   (Podes ter vários endereços na lista.)
4. Não precisas de "URIs de redirecionamento" — este fluxo não usa
   redirecionamento.
5. Copia o **Client ID** gerado (algo como `123...apps.googleusercontent.com`).

### Passo 4 — Configurar a app

Abre `js/google/config.js` e cola o Client ID:

```js
export const GOOGLE_CLIENT_ID = 'o-teu-client-id-aqui.apps.googleusercontent.com';
```

Guarda, recarrega a app, vai a **Definições → Google Calendar → Ligar conta
Google**. Repete para a segunda conta (BEST) — o browser vai pedir para
escolheres a conta na segunda vez.

### O que esperar

- Só é pedida permissão de **leitura** do calendário — a app nunca escreve
  nada no teu Google Calendar (é uma decisão fechada, não um limite técnico
  temporário).
- O token de acesso dura cerca de 1 hora; a app tenta renová-lo em silêncio
  enquanto a sessão Google continuar válida no browser. Se falhar, aparece
  um aviso com o botão "Voltar a ligar" — as tuas tarefas nunca são afetadas
  por isto.
- A conta do BEST pode estar num Google Workspace gerido pela organização.
  Se o administrador bloquear apps de terceiros, a autorização falha mesmo
  com tudo bem configurado do teu lado — isto está fora do controlo da app.

## O que ficou por fazer (fora do âmbito desta primeira entrega)

Requisitos "Could have" do documento, deliberadamente deixados para depois:
tarefas recorrentes, subtarefas, linguagem natural nas datas, vista semanal,
deteção de conflitos entre tarefas e eventos, escrita no Google Calendar
(esta última é uma decisão fechada, não um adiamento — ver secção 2.2 do
documento de requisitos).

## Estrutura do projeto

```
index.html              Ponto de entrada, Tailwind CDN, tipografia
manifest.webmanifest     PWA
sw.js                     Service worker (cache offline)
css/                      Tokens de design + estilos globais
js/
  app.js                  Arranque da app
  lib/                    Imports centralizados (Preact/htm, Dexie, datas, id)
  db/schema.js             Esquema IndexedDB, versionado, com seed inicial
  api/                     Camada de dados local (tarefas, listas, áreas, etiquetas…)
  google/                  Camada Google, isolada do resto (config + cliente)
  state/                   Store de UI + hook de consultas reativas
  components/              Componentes de interface, organizados por domínio
```
