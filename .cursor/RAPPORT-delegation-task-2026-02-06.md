# Rapport — Délégation Task / sous-agents (6 février 2026)

## Contexte

Le workflow Lead Dev repose sur la **délégation automatique** : le Lead Dev lance les sous-agents (US, BDD, TDD-back-end, TDD-front-end, Designer) via l'outil **Task** quand l'utilisateur dit **GO US** ou **GO NEXT**.

## Problème observé

Dans la session du 6 février 2026, **l'outil Task n'est pas disponible** dans le contexte de l'agent Lead Dev. Lors de **GO NEXT** (passage à TDD-front-end pour US-13.1), le Lead Dev ne peut pas lancer le sous-agent. Il ne voit pas l'outil Task dans ses outils disponibles.

## Workflow attendu (tel que décrit par l'utilisateur)

1. **GO US** : Lead Dev crée l'US et lance l'agent @US avec un prompt préparé.
2. Le Lead Dev revient avec les livrables du sous-agent (ex. US écrite). Discussion, corrections si besoin.
3. **GO NEXT** : Lead Dev prépare le travail pour l'agent suivant et le lance (ex. @BDD, @TDD-back-end, @TDD-front-end).
4. Le Lead Dev peut aussi reprendre la main si un sous-agent a un doute et propose des options.

L'utilisateur communique **uniquement avec le Lead Dev** dans le même chat. Il ne voit pas directement ce qui se passe entre le Lead Dev et les sous-agents.

## Investigations menées

- **Rules/Subagents** : Settings > Rules, Skills, Subagents — option « Include third-party skills, subagents, and other configs » activée. Les agents du projet (`.cursor/agents/`) apparaissent.
- **Pas d'outil Task visible** : L'agent Lead Dev n'a pas accès à un outil « Task » dans son contexte. Les outils standards (read_file, search_replace, grep, etc.) sont présents, mais pas Task.
- **Fallback mis en place** : Création de `.cursor/commands/go-next.md` — commande que l'utilisateur peut lancer en tapant `/go-next` pour insérer @TDD-front-end + prompt. Solution de contournement, pas le flux normal.
- **Documentation Cursor** : L'outil Task est documenté dans le workflow du projet. Les sous-agents Cursor 2.4+ peuvent être lancés par un agent parent. Un bug « Sub-agent task broken in 2.4.22 » a été signalé sur le forum.

## Hypothèses

1. **État de session** : Cursor lancé depuis longtemps, conversation longue — peut-être une dégradation du contexte ou des outils injectés.
2. **Régression Cursor** : Une mise à jour pourrait avoir affecté l'injection de l'outil Task.
3. **Mode d'invocation** : Le Task pourrait ne être disponible que dans certains modes (ex. Agent plan, etc.) ou quand le Lead Dev est invoqué d'une façon précise.

## Recommandations

1. **Redémarrer Cursor** et ouvrir une **nouvelle conversation**.
2. Invoquer le Lead Dev (ex. @lead-dev ou via les rules) et tester **GO NEXT**.
3. Si le problème persiste : signaler sur le forum Cursor (Bug Reports) avec ce rapport en pièce jointe.
4. En attendant : utiliser `/go-next` comme contournement (fichier `.cursor/commands/go-next.md` contient la délégation TDD-front-end pour US-13.1).

## Fichiers créés / modifiés pendant l'incident

- `.cursor/commands/go-next.md` — commande de contournement
- `.cursor/DELEGATION-TDD-front-end-US-13.1.md` — prompt de délégation
- Rules : lead-dev-workflow.mdc, lead-dev-outils.mdc, 0. Lead-dev.md — méthode 2 (commande fichier) ajoutée en fallback

Si Task refonctionne, ces fallbacks peuvent être simplifiés ou retirés.

---

## Mise à jour — 7 février 2026

- **Test après redémarrage Cursor** : l'utilisateur a quitté et relancé Cursor, puis ouvert cette conversation.
- **Résultat** : dans cette session, le Lead Dev n'a toujours **pas** l'outil Task dans ses outils disponibles. Le problème persiste après redémarrage.
- **Conclusion** : utiliser la procédure dégradée ci-dessous jusqu'à ce que Task soit de nouveau disponible ou que Cursor fournisse une solution.

---

## Procédure dégradée (quand Task n'est pas disponible)

Quand tu dis **GO NEXT** et que le Lead Dev ne peut pas lancer le sous-agent (pas d'outil Task), suis ces étapes :

1. **Le Lead Dev** te rappelle l'étape en cours et l'agent à invoquer (ex. @TDD-front-end pour US-13.1).
2. **Toi** : dans le chat, tape **`/go-next`** (slash puis sélection de la commande `go-next` dans la liste).
3. La commande insère le contenu de `.cursor/commands/go-next.md` : mention de l'agent + prompt de délégation. **Envoie le message** (Entrée).
4. Cursor invoque l'agent cible (ex. TDD-front-end) avec ce prompt. Tu travailles alors avec cet agent dans le même fil.
5. Quand l'agent a livré, reviens dire **GO NEXT** au Lead Dev (en mentionnant @lead-dev si besoin) : le Lead Dev fera la revue et décidera de la suite (corrections, passage à l'agent suivant, ou `done`).

**Fichier à maintenir** : `.cursor/commands/go-next.md` doit contenir, en première ligne, la mention de l'agent à lancer (ex. `@TDD-front-end`), puis le prompt complet. Le Lead Dev le met à jour à chaque GO NEXT quand il prépare la délégation suivante.
