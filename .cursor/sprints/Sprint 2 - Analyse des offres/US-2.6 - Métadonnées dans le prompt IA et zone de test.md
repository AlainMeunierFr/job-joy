# US-2.6 : Métadonnées dans le prompt IA et zone de test

- **En tant que** utilisateur de l'application
- **Je souhaite** que le texte de l'offre et les métadonnées connues (poste, entreprise, ville, salaire, etc.) soient envoyés ensemble à l'IA lors de l'analyse, et que la zone de test du prompt IA permette de saisir et pré-remplir ces métadonnées
- **Afin de** ne pas fausser l'analyse lorsque les métadonnées ne figurent pas dans le corps du texte (ex. titre ou salaire affichés ailleurs sur la page)

---

## Critères d'acceptation

- **CA1 - Métadonnées incluses dans le prompt d'analyse**  
  Lors de l'analyse d'une offre (worker d'analyse et test API « Tester API »), le prompt envoyé au LLM (ClaudeCode) contient **à la fois** le **texte** de l'offre **et** les **métadonnées connues** de l'offre. Les métadonnées sont présentées de manière explicite dans le prompt (ex. bloc « Métadonnées connues : Poste = …, Entreprise = …, … ») pour que l'IA puisse les utiliser et ne pas se tromper si elles sont absentes du texte.

- **CA2 - Liste des métadonnées concernées**  
  Les métadonnées envoyées au LLM sont au minimum : **Poste**, **Entreprise**, **Ville**, **Salaire**, **Date offre** (DateOffre). Sont incluses également les métadonnées disponibles en phase 1 ou dans Airtable pour l'offre (ex. Département, autres champs cohérents avec la table Offres). Les champs vides ou non renseignés peuvent être omis ou indiqués comme « non renseigné » dans le prompt.

- **CA3 - Zone de test « Prompt IA » : champs métadonnées**  
  Dans la section **Configuration ClaudeCode** (ou zone de test du prompt IA) de la page Paramètres, des **champs de saisie** sont proposés pour les métadonnées utilisées dans le prompt : au minimum Poste, Entreprise, Ville, Salaire, Date offre. Ces champs permettent à l'utilisateur de renseigner ou modifier les métadonnées avant de lancer le test « Tester API », de sorte que le prompt de test soit construit avec **partie obligatoire + partie configurée + métadonnées saisies + texte de l'offre**.

- **CA4 - Pré-remplissage depuis une offre Airtable**  
  Lorsque l'utilisateur clique sur **« Récupérer le texte d'une offre »** :
  - L'API (ou le service) qui charge une offre depuis Airtable **retourne**, en plus du texte de l'offre, les **métadonnées** de cette offre (Poste, Entreprise, Ville, Salaire, Date offre, etc.).
  - Les champs de la zone de test (texte d'offre **et** champs métadonnées) sont **pré-remplis** avec les valeurs de l'offre récupérée. L'utilisateur peut ensuite modifier ces valeurs avant de cliquer sur « Tester API ».

- **CA5 - Cohérence worker / test API**  
  La construction du prompt (texte + métadonnées) est **cohérente** entre le **worker d'analyse** (traitement en lot des offres) et l'appel **« Tester API »** de la page Paramètres : même structure du bloc métadonnées et même ordre logique (métadonnées puis texte, ou selon spécification technique validée).

---

*Référence : Sprint 2 « Analyse des offres ». Liens : US-2.3 (construction du prompt), US-2.4 (zone de test « Récupérer le texte d'une offre », « Tester API »). Données : table Offres Airtable, parametres.json.*
