# Analyse offres

## Développement

```bash
npm run dev
```

Lance un build TypeScript puis le serveur (port 3001). Le serveur ne redémarre pas tout seul : après une modification du code, arrêter (Ctrl+C) puis relancer `npm run dev`.

- **`npm start`** : lance le serveur une seule fois (build manuel requis). Pour prod ou run ponctuel.
- **`npm run dev`** : build + serveur. Pour le développement.

## Build et run

- **`npm run build`** : compile le TypeScript et génère `dist/app/site.css` (fusion globals + content-styles). À utiliser avant un déploiement ou `npm start`.
- **`npm run dev`** : utilise `tsc` seul (pas de script CSS) ; le serveur sert le CSS depuis `app/*.css` à la volée.

```bash
npm run build
npm start
```
