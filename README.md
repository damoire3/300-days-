# 300 – 10 mois pour changer (React + Vite)

## Lancer / construire
    npm install
    npm run dev
    npm run build

## Netlify via GitHub (depuis un téléphone aussi)
1. Crée un compte sur github.com, puis New repository (nom : app-300).
2. Add file > Upload files : envoie tout le contenu du dossier (sans node_modules), puis Commit.
3. Sur app.netlify.com : Add new site > Import an existing project > GitHub > choisis app-300.
4. Netlify lit netlify.toml (build : npm run build, dossier : dist). Clique Deploy.
5. Tu reçois un lien https://xxx.netlify.app à partager à tes amis.
Les prénoms envoyés avec consentement apparaissent dans Netlify > Forms > installs.

## APK (Capacitor)
    npm i @capacitor/core @capacitor/cli @capacitor/android
    npx cap init app300 com.eriomad.app300 --web-dir=dist
    npm run build
    npx cap add android
    npx cap sync
    npx cap open android   # puis Build > Build APK

## Données
Profils, photos de profil et photos d’évolution sont gardés dans le stockage du téléphone (localStorage), jamais envoyés.
