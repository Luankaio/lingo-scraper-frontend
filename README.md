# LingoScrape Frontend

Uma landing page estilizada como papel rabiscado para iniciar o LingoScrape.

## Tecnologias

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/)
- [@tanstack/react-query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/)
- [Sonner](https://sonner.emilkowal.ski/) para toasts

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

## API

Defina a URL base da API em um arquivo `.env` na raiz do projeto:

```
VITE_API_URL=http://127.0.0.1:8000
```

Ao digitar um nome na landing page você será levado para `/<nome>`, e a aplicação fará uma chamada `POST /spaces` para criar ou recuperar o espaço correspondente. As edições no editor são salvas automaticamente (requere que o endpoint de atualização aceite `PATCH /spaces/{id}` ou `PUT /spaces/{id}` com a estrutura:

```json
{
	"content": ["Texto do bloco"],
	"words": ["lista", "de", "palavras"]
}
```

Caso a API use outra rota, ajuste a função `updateSpaceContent` em `src/lib/api.ts`.

## Design

A página inicial foi desenhada para lembrar papel envelhecido, utilizando uma paleta em preto, branco e bege. Texturas, sombras tortas e fontes caligráficas dão a estética de sketch.
