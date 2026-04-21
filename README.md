# SyncFiles

Logiciel de synchronisation de fichiers desktop développé dans le cadre d'un projet de fin d'études à l'**École Supérieure Polytechnique d'Antsiranana (ESP Antsiranana)**.

## Étudiant
**Gracie Raseta** — Filière EII 5ème année

## Description
SyncFiles est une application desktop qui permet de synchroniser des fichiers entre deux dossiers locaux ou réseau, avec détection intelligente des conflits et versioning automatique.

## Fonctionnalités
- Synchronisation unidirectionnelle et bidirectionnelle
- Détection des conflits avec résolution manuelle
- Versioning automatique des fichiers modifiés
- Surveillance en temps réel (chokidar)
- Planification automatique (node-cron)
- Vérification d'intégrité SHA-256
- Interface graphique moderne (React + Electron)
- Mode sombre / clair
- Authentification avec récupération de mot de passe
- Base de données MySQL

## Stack technique
| Couche | Technologie |
|--------|-------------|
| Desktop | Electron 29 |
| Frontend | React 18 + TypeScript |
| Backend | Node.js + TypeScript |
| Base de données | MySQL |
| Surveillance fichiers | Chokidar |
| Planification | Node-cron |
| Sécurité | bcryptjs + SHA-256 |

## Installation

### Prérequis
- Node.js 18+
- MySQL (XAMPP recommandé)
- Windows 10/11

### Étapes
1. Cloner le repo
   \`\`\`bash
   git clone https://github.com/gracieraseta/syncfiles.git
   cd syncfiles
   \`\`\`

2. Installer les dépendances
   \`\`\`bash
   npm install
   \`\`\`

3. Démarrer MySQL (XAMPP)

4. Créer la base de données
   - Ouvrir phpMyAdmin
   - Créer une base nommée \`syncfiles\`

5. Lancer l'application
   \`\`\`bash
   npm run start
   \`\`\`

## Build

\`\`\`bash
npm run dist:win
\`\`\`

Le fichier \`SyncFiles-Portable-1.0.0.exe\` sera généré dans le dossier \`release/\`.

## Licence
Copyright © 2026 ESP Antsiranana — Tous droits réservés