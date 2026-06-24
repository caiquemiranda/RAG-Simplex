# Arquivos públicos (servidos pelo Vite em `/`)

O logo é renderizado por [`src/components/Logo.tsx`](../src/components/Logo.tsx) como
um **SVG embutido** (wordmark "IBSystems" no gradiente da marca, **fundo transparente**,
escalável). Não precisa de arquivo de imagem.

Para usar o **logo oficial** da empresa, coloque um **SVG com fundo transparente** aqui:

```
frontend/public/logo.svg
```

O `Logo.tsx` prefere `/logo.svg` quando existe e cai no wordmark embutido caso
contrário. (Evite PNG com fundo — perde a transparência e não escala bem.)
