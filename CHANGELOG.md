# 📝 Changelog

Toutes les modifications notables de ce projet seront documentées ici.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

> ⚠️ Ce fichier est resté figé à la version 2.0.0 (2024-02-02) pendant environ deux ans et
> demi alors que le développement continuait activement. Les sections ci-dessous entre
> 2.1.0 et 2.5.0 ont été reconstituées en 2026-09 à partir de l'historique git pour combler
> le trou — voir `DEVLOG.md` pour le détail de cette remise à niveau et le protocole qui
> évite que ça se reproduise (mettre à jour ce fichier à chaque session qui change un
> comportement visible pour l'utilisateur).

## [Unreleased]

### ⚙️ Divisions et terrains appliqués tout de suite
- Changer le nombre de divisions ou de terrains met l'affichage à jour immédiatement, sans
  rechargement : le bouton « ✅ Appliquer » disparaît. Réduire les divisions masque les divisions
  en trop sans supprimer leurs joueurs (confirmation demandée s'il y en a).

### 🏅 Onglet Multisport seulement s'il y a à combiner
- Avec des journées Courses seulement, plus d'onglet « Multisport » en doublon : « 🏆 Classement »
  ouvre directement le classement des courses (sans barème Matchs + Courses).

### 🎨 En-tête de journée plus sobre
- Divisions / Terrains et Mode / Score réunis dans un seul bandeau neutre (plus de barre verte),
  attribution des terrains en petites pastilles ; masqué sur les journées Courses et les classements.

### ➕ Ajouter des participants : mode Tableau
- La fenêtre « ➕ Ajouter des participants » des journées Courses propose un onglet « 📊 Tableau »
  à côté de la liste : colonnes Nom, Prénom, Club, Catégorie, une ligne par participant (une
  nouvelle ligne s'ajoute toute seule, collage possible depuis Excel). Passer de la liste au
  tableau découpe la liste en colonnes pour la vérifier. L'onglet choisi est gardé.
- Astuce sous la liste : ajouter l'épreuve (et le temps d'engagement) en fin de ligne pour que
  « 🏁 Séries automatiques » crée les séries en un clic.
- Colonne « Épreuve » dans le tableau (épreuve + temps d'engagement) : « 🏁 Séries automatiques »
  s'en sert, et garde le club et la catégorie saisis dans le tableau.
- La fenêtre ne se ferme plus si on clique à côté ; « Annuler » demande confirmation quand une
  saisie est en cours.

### 👥 Liste des joueurs en tableau
- Les joueurs de chaque division s'affichent dans un tableau (Joueur, Club) au lieu de pastilles.
  Un bouton « ⋯ » au bout de chaque ligne ouvre Modifier / Détails / Supprimer.
- Cases à cocher pour sélectionner plusieurs joueurs (ou tous) et les supprimer en une fois ;
  champ de filtre pour retrouver un joueur.
- Même tableau pour les « Participants disponibles » des journées Courses (dossard, club,
  épreuve · série · couloir). « ⋯ » : Modifier, Ajouter à une série, Retirer de la liste. Les
  actions groupées (club, série, retrait) apparaissent dès qu'une ligne est cochée.
- Corrigé : la hauteur de la liste des participants agrandie à la souris n'était pas toujours gardée.
- Bouton « Colonnes ▾ » pour masquer / afficher des colonnes (club, dossard, épreuve) ; le choix est gardé.
- Tri en cliquant sur un titre de colonne : A→Z, Z→A, puis ordre d'origine.

### 🖨️ Impression des classements
- Chaque division commence sur une nouvelle page (plus de titre de division seul en bas de page).
- Onglet Classement général : fond jaune remplacé par la présentation sobre du classement de journée.
- Boutons des classements (général et journée) plus sobres : fond blanc, seul « Mettre à jour » en couleur.
- Classement général : JSON, PDF et HTML regroupés dans un bouton « 📤 Exporter ▾ ».
- Classement multisport (et natation par épreuve) : même présentation sobre, sans dégradés violets ni lignes dorées.
- Les classements imprimés (général, journée, fenêtres « Afficher », multisport, course) ne
  laissent plus de grand blanc : un long tableau continue sur la page suivante, avec l'en-tête
  des colonnes répété et aucune ligne coupée. L'aperçu garde les couleurs de l'écran.
- Les cartes « Statistiques du championnat » sont retirées des exports : le nombre de journées
  et de matchs est écrit dans l'en-tête (aussi dans l'onglet Classement général).
- En-tête compact (une ligne) ; titre et sous-titre modifiables en cliquant dessus dans la fenêtre
  d'export. Le titre modifié est mémorisé pour les exports suivants.
- Portrait ou paysage au choix dans la fenêtre d'impression ; en portrait, les tableaux sont
  resserrés pour que toutes les colonnes tiennent.
- Le classement général affiche les colonnes de sets (Sets G/P, Diff sets, Pts jeu ±).
- Corrigé : le bouton d'export HTML du classement général ne faisait rien (erreur JavaScript).

### ✨ Scores en sets
- Nouveau sélecteur **« 🎯 Score »** dans la barre de chaque journée Matchs : 2 scores (comme
  avant) ou **Sets** en BO3 / BO5 / BO7, avec points par set (11, 15, 21, 25 ou libres). Les
  nouvelles journées reprennent le format de la précédente.
- Saisie **set par set** dans les matchs par tours, les poules et la phase finale : Entrée
  passe au set suivant, le match est validé dès qu'il est gagné, les sets inutiles sont grisés,
  un set incomplet est signalé (sans blocage). Pas de match nul en sets.
- BYE et forfaits suivent le format (2-0 en BO3, 3-0 en BO5…). La fenêtre « 🎯 Score du match
  BYE » propose aussi les points de chaque set : 11-0, 11-5 ou Libre (sets gagnés seulement).
- Classements (journée, général, poules, qualification, multisport) : après la différence de
  sets, départage par la **différence de points de jeu** ; colonnes « Sets G/P », « Diff
  sets », « Pts jeu ± ». Détail des sets dans les résultats (« 2-1 : 11-8 9-11 11-5 »), la
  fiche joueur et le tableau final.
- Feuilles de match imprimées « avec sets » : une colonne par set du format. Récapitulatifs
  (par tour, terrain, poule) : colonnes « Sets » et mention « Sets gagnés (BO3 · 11 pts) ».
- Import d'un export **tennisdetable** : les sets sont repris (la journée passe en BO3) au lieu
  d'être réduits au nombre de sets gagnés ; un fichier sans configuration ne fait plus planter
  l'ajout de journée.

### 🐛 Corrections (scores)
- BYE de poule en génération « nombre de matchs limité » : en mode sets, victoire 2-0 (BO3)
  au lieu d'un 0-0 marqué gagné. En mode 2 scores, comportement inchangé.
- Export HTML du classement général et pré-remplissage des poules depuis le classement :
  `calculateGeneralRanking` n'était pas accessible depuis ces modules (erreur).

### 🎨 Apparence
- « 🎯 Matchs ▾ » ouvre un menu déroulant sous le bouton (Round-Robin, Optimisé 4-10, Par terrain,
  Système suisse) au lieu d'une fenêtre au milieu de l'écran ; utilisable au clavier (flèches, Échap).
- « ➕ Joueurs ▾ » aussi : Un joueur, Plusieurs joueurs, D'une autre journée, Gérer les clubs ; la fenêtre
  s'ouvre directement sur la partie choisie.
- Fond de page plus sobre : gris clair uni au lieu du dégradé bleu (aussi dans l'export HTML du
  classement général) ; barre d'adresse du téléphone assortie à l'en-tête.
- Barre « Mode » (Matchs / Courses) plus discrète : gris clair, le type de journée reste signalé par
  un liseré bleu (Matchs) ou orange (Courses).

### 🐛 Corrections
- Badges des terrains par division : avec moins de terrains que de divisions (ex. 1 terrain pour
  3 divisions), les divisions se partagent les terrains au lieu d'afficher « Terrains 2-1 » ;
  la dernière division ne dépasse plus le nombre de terrains (4 terrains / 3 divisions → 1-2, 3, 4).

### ✨ Finitions
- Tous les boutons écrits de la même façon (« Appliquer », « Générer poules », « Mettre à jour »
  au lieu de majuscules espacées sur une partie d'entre eux).
- Téléphone : titre de l'application plus compact (2 lignes au lieu de 3, le contenu remonte) ;
  barre « Mode » sur une ligne (le libellé « Championnat / Chronométrage », qui répétait le
  sélecteur, est masqué).
- Loupe 🔍 de l'en-tête centrée dans son cercle.
- En-tête du tableau du classement Multisport d'un seul tenant (il était découpé en blocs).

### 💬 Messages, annonces et animations
- Les messages d'information (« Aucun fichier sélectionné », « Créez d'abord une série »…)
  s'affichent dans une fenêtre de l'application, aux couleurs du thème (mode sombre compris),
  au lieu de la boîte grise du navigateur. Elle ne fige plus la page : le chrono continue de
  s'afficher pendant qu'un message est ouvert. Entrée, Échap ou OK la ferment.
- Les notifications (« Série enregistrée »…) sont lues par les lecteurs d'écran, et leurs
  couleurs sont plus contrastées.
- Avec le réglage système « réduire les animations », les fenêtres et panneaux apparaissent
  sans fondu ni glissement, et la page ne défile plus en douceur.
- Lignes atténuées (joueurs non qualifiés, DNS, séries déjà remplies) et sous-titres sur
  bandeaux colorés désormais lisibles : ils étaient affaiblis par transparence.

### 🔊 Champs annoncés correctement par les lecteurs d'écran
- Chaque case de score dit à qui elle appartient : « Score de Gai Séjour 1 contre Les
  Aquaphiles 2 » au lieu de « champ numérique, zéro » (matchs, poules, phase finale).
- Les autres champs prennent le libellé affiché à côté (Divisions, Terrains, Club, Date…), ou,
  dans un tableau, l'en-tête de colonne et le nom de la ligne (« Temps – Lucie Vandamme »).
- Mesuré sur les 48 écrans : 2 469 champs sans nom avant, 0 après.

### 📱 Plus facile au doigt sur téléphone et tablette
- Cases de score agrandies à 44×44 px (au lieu de 40×32 en matchs et 50×40 en poules), chiffres en
  16 px : plus de zoom intempestif de la page en touchant une case sur iPhone.
- Tous les boutons et éléments touchables font au moins 24×24 px : « × » des onglets de journée,
  ✏️ et × des joueurs, noms de joueurs cliquables, cases à cocher, en-têtes de matchs repliables.
- Plus aucun texte d'écran sous 11 px (badges Qualifié / Repêché, choix de génération de matchs,
  DNS / DISQ, « 3V / 3J » du classement Multisport…). Rien ne change à la souris.
- Mode sombre : le libellé « - Journée N » de la fenêtre « Ajouter des joueurs » et les points
  du podium Multisport redeviennent lisibles.

### 🎨 Textes lisibles partout (contraste)
- Les boutons et bandeaux colorés (bleu, vert, rouge, orange, turquoise, violet) prennent une
  teinte un peu plus foncée de la même couleur : le texte blanc y est désormais lisible
  (au moins 4,5:1, norme d'accessibilité WCAG AA), même en plein jour dans une salle.
- Textes gris secondaires, rangs orange, points et pourcentages verts ou bleus plus foncés.
- Badge « Terminé » des matchs, petits boutons « × » des joueurs et des matchs, pastilles
  sur les bandeaux de poules, en-tête « Total » et lignes du podium (or / argent / bronze)
  du classement Multisport corrigés.
- Mesuré écran par écran : 4 751 textes sous le seuil avant, 0 après.

### ⌨️ Fenêtres et boutons utilisables au clavier
- **Échap ferme la fenêtre ouverte** (toutes, plus seulement 3), comme si on cliquait
  sur son bouton « × », « Fermer » ou « Annuler ». Avec deux fenêtres l'une sur l'autre,
  seule celle du dessus se ferme.
- À l'ouverture d'une fenêtre, le curseur va directement dans le premier champ ; **Tab reste
  dans la fenêtre** au lieu de partir dans la page derrière ; à la fermeture, on retrouve le
  bouton qui l'avait ouverte. Sur téléphone, le clavier virtuel ne s'ouvre plus tout seul.
- Les titres repliables (journée, classement général, multisport), les cartes de choix
  (génération de matchs, pré-remplissage des poules), les lignes de classement et les séries
  s'atteignent avec Tab et s'ouvrent avec Entrée ou Espace.
- Contour bleu bien visible autour de l'élément sélectionné au clavier (et halo plus marqué
  sur les champs, y compris les cases de score), en mode clair comme en mode sombre.
- Les fenêtres sont annoncées comme telles, avec leur titre, par les lecteurs d'écran.

### 🔠 Feuilles pétanque et Boccia plus lisibles
- Titre, terrain (en gras), numéro du match et noms des équipes / joueurs écrits bien plus grands.
- Pétanque : les cases de score sont un peu moins hautes pour garder la même mise en page.
- Boccia (avec noms et vierges) : mise en page et cases de score inchangées.

### 🖨️ Feuilles Boccia vierges : un coin par tour
- Chaque page A4 porte 4 feuilles déjà marquées **Tour 1** (haut gauche), **Tour 3** (haut
  droite), **Tour 2** (bas gauche) et **Tour 4** (bas droite), comme les feuilles avec noms :
  en recto verso, le tour 3 tombe au dos du tour 1 et le tour 4 au dos du tour 2.
- La question devient « Combien de matchs par tour ? » : 1 page = 1 match de chaque tour.

### 🖨️ Feuilles de match (classiques, 2 scores, Boccia, pétanque) prêtes pour le recto verso et la découpe
- Chaque coin de la page A4 est réservé à un tour : **tour 1 en haut à gauche, tour 3 en haut
  à droite, tour 2 en bas à gauche, tour 4 en bas à droite**. En recto verso, le tour 3 tombe
  au dos du tour 1 et le tour 4 au dos du tour 2.
- S'il manque un match dans un tour, son coin reste blanc : les autres tours ne se décalent pas.
- Chaque page tient exactement sur une feuille A4 (elle débordait légèrement avant).
- Boccia : même disposition, division par division ; chaque division commence sur une
  nouvelle feuille (une page blanche est ajoutée si besoin pour garder le recto verso aligné).
- Feuilles 2 scores : 4 par page (au lieu de 5 en bandes) avec la même disposition, division
  par division. Les matchs de poule et de phase finale, sans tour, se suivent dans l'ordre.
- Feuilles de match classiques : idem, 4 par page (au lieu de 5 en bandes), division par division.

### 🐛 Renommer un joueur dans un match : vous choisissez
- En « 🔓 Modifier les matchs », changer le nom d'un joueur dans un match propose désormais :
  - **✏️ Renommer partout** : c'est le même joueur (faute de frappe) → corrigé dans tous les matchs de la
    journée (poules et phase finale comprises) et au listing, club conservé ;
  - **➕ Nouveau joueur** : un autre joueur prend sa place dans ce match seulement → il est ajouté au
    listing (et à la poule), l'ancien garde ses autres matchs.
- Avant, seul ce match changeait alors que le listing était renommé, et l'ancien nom revenait ensuite au
  listing comme un joueur de plus.

### 🧭 Boutons affichés au bon moment
- Les barres d'actions n'affichent que ce qui sert déjà ; les boutons apparaissent au fur et à mesure :
  - **Journées Matchs** : 🎯 Matchs, 🏊 Poules et 👋 BYE dès qu'il y a des joueurs ; 🏆 Classements et
    🔓 Modifier les matchs dès qu'il y a des matchs. 🖨️ reste toujours là (feuilles Boccia vierges).
  - **Journées Courses** : 💾 Exporter et 🗑️ Vider dès qu'il y a un participant ou une épreuve ;
    🏁 Séries automatiques dès qu'il y a une épreuve ; 📂 Tout déplier et 🖨️ Imprimer séries dès qu'il y a
    une série.

### ✏️ « ⚠️ Actions » devient « 🔓 Modifier les matchs »
- Le bouton des journées Matchs qui affiche la suppression des matchs (×), les noms de joueurs
  modifiables et les forfaits (F1/F2) s'appelle désormais **🔓 Modifier les matchs** ; une fois activé il
  devient **🔒 Verrouiller** (au lieu de « Actions ON / OFF »). Fonctionnement inchangé.

### 📱 Téléphone : plus rien de coupé
- Les tableaux trop larges pour l'écran (séries, classements, statistiques…) se font défiler au doigt
  au lieu d'avoir leurs dernières colonnes (Rang, Temps, Total…) coupées.
- La ligne « Ajouter un participant », les divisions d'une journée en poules, la phase finale et la
  fiche d'un joueur tiennent dans l'écran.

### 🐛 « Reprendre d'une autre journée » : divisions respectées
- Les joueurs repris d'une journée Matchs gardent leur division (ils arrivaient tous en Division 1).
- Un joueur déjà inscrit dans la journée, quelle que soit sa division, n'est plus ajouté une
  seconde fois.

### 🌙 Mode sombre lisible partout
- Toutes les fenêtres (ajout de joueurs, BYE, impression, poules, épreuves, séries, saisie des
  résultats, participants, séries automatiques…), les champs, les boutons, les classements
  (journée, général, Multisport, natation) et l'écran de course passent correctement en sombre :
  plus de panneaux blancs ni de textes gris foncé illisibles.
- Le podium du classement Multisport garde ses couleurs or / argent / bronze, en version sombre.
- Les feuilles imprimées et le second écran « 📺 Afficher » restent clairs.
- Sur téléphone : calendrier des dates, cases à cocher et listes déroulantes passent aussi en
  sombre, et la barre d'adresse du navigateur suit le thème.

### 🐛 « ➕ Match » d'une poule
- La fenêtre d'ajout manuel d'un match de poule présélectionne de nouveau un 2e joueur différent
  du 1er (une erreur JavaScript l'en empêchait).

### 🧹 Barre des journées Matchs : plus de boutons « 📋 J1, J2… »
- Les petits boutons de copie rapide des joueurs d'une journée précédente sont retirés. Pour
  reprendre les joueurs d'une autre journée : « ➕ Joueurs » → « 📥 Reprendre d'une autre journée ».

### 📥 « Importer joueurs » rangé dans la fenêtre « ➕ Joueurs »
- Le bouton quitte la barre d'actions des journées Matchs (plus de place) et devient la section
  **📥 Reprendre d'une autre journée** de la fenêtre « ➕ Joueurs » : même fenêtre d'import
  qu'avant (joueurs ou participants Courses d'une journée précédente).

### 🔢 Journées renumérotées après une suppression
- Supprimer une journée renumérote les suivantes : avec J1…J5, supprimer J2 puis J3 donne
  **J1, J2, J3** (et non plus « J1, J4, J5 »). La confirmation l'annonce.
- Tout suit le nouveau numéro : joueurs, matchs, poules, courses et leurs résultats, journées
  repliées, séries ouvertes. Refusé pendant qu'une course tourne sur une journée concernée.

### ➕ Ajouter des joueurs : tout fermé, plus de clubs factices
- La fenêtre s'ouvre avec **toutes les sections fermées** : on choisit ce qu'on veut faire.
- Un club créé en ajoutant un joueur (« + Ajouter un nouveau club… ») apparaît **tout de suite**
  dans le menu « Club » (où il reste choisi pour le joueur suivant) et dans « 🏢 Gérer les clubs » ;
  avant, il n'apparaissait qu'en rouvrant la fenêtre. Il n'est plus créé si le joueur est refusé.
- Plus de clubs prédéfinis (« Club A » … « Club J ») : la liste des clubs démarre vide et se
  remplit avec ceux que l'on ajoute. Le club reste facultatif partout. Une liste déjà
  personnalisée dans le navigateur est conservée telle quelle.

### ➕ Fenêtre « Ajouter des joueurs » épurée
- Trois sections dépliables, une seule ouverte à la fois : **👤 Ajouter un joueur** (ouverte par
  défaut), **📋 Ajouter plusieurs joueurs** (coller une liste ou importer un fichier CSV/Excel) et
  **🏢 Gérer les clubs**.
- Champs avec des libellés clairs et de grands boutons ; la gestion des clubs se fait directement
  dans la fenêtre (plus de seconde fenêtre), et le choix du club se met à jour aussitôt.

### 🧹 « 🏁 Séries automatiques » seulement en Courses
- Le bouton n'apparaît plus dans la barre d'actions d'une journée **Matchs** (championnat), où il
  ne servait à rien ; il reste dans l'écran **Courses**.

### 🎽 Un seul dossard par nageur
- Avec « 🏁 Séries automatiques », un nageur inscrit à plusieurs nages reçoit maintenant
  **le même dossard** dans toutes ses séries (avant : un dossard par inscription). Le nageur est
  reconnu par son nom et son club, sans tenir compte des majuscules ni des accents.
- Un participant déjà présent (ajouté à la main) garde son dossard ; régénérer les séries ne
  renumérote pas les nageurs déjà là ; les nouveaux prennent les numéros suivants.

### 📂 Courses : séries en accordéon
- Un clic sur le nom d'une **série** affiche ou masque ses participants (couloir, dossard, nom,
  club, catégorie, rang et temps, DNS/DISQ, « — » si pas encore nagé), dans l'ordre du bassin.
- Un clic sur le nom d'une **épreuve** ouvre toutes ses séries d'un coup (ou les referme).
- Bouton **📂 Tout déplier / 📁 Tout replier** dans la barre d'actions de la journée.
- Vue de consultation uniquement ; l'état ouvert/fermé est conservé quand l'écran se met à jour.

### 🏆 Classement d'une série (bouton 🏆) corrigé
- Un nageur **DISQ ou DNS** n'est plus classé, même si une ancienne ligne de résultat existait
  (il pouvait apparaître 1er) ; il est listé en bas, sans rang.
- **Ex æquo au centième** : même rang (avant 1 puis 2 pour le même temps affiché).
- **Relais à durée fixe** : classement à la distance parcourue, puis au temps (avant, au temps seul).
- Ouvrir le classement d'une autre série remplace bien la fenêtre (avant, l'ancienne restait).
- La colonne **Points** (20-17-15…) n'apparaît plus en natation ni en Multisport, où ce barème
  ne s'applique pas ; colonnes Club et Distance ajoutées quand elles sont utiles ; temps au centième.
- Retirer un participant d'une série retire aussi sa ligne de résultat.
- Les points par série du classement général (Chrono) et le classement par épreuve suivent
  exactement les mêmes règles (un nageur en double dans une série n'est plus compté deux fois).

### 📂 Importer plusieurs journées : plus d'écrasement
- Un fichier contenant plusieurs journées est maintenant renuméroté à la suite des autres
  fichiers (avant, il gardait ses numéros et pouvait écraser la journée d'un autre fichier).
- Même récapitulatif et mêmes précautions que « ➕ Ajouter à la suite » ; si rien n'est
  importable, le championnat ouvert est conservé.

### ➕ Import : ajouter des journées à la suite
- Dans la fenêtre d'import, nouveau bouton **« ➕ Ajouter à la suite du championnat »** : les
  journées du ou des fichiers choisis sont ajoutées **après** celles déjà présentes, sans rien
  remplacer. Une « Journée 1 » refaite par erreur dans un autre projet devient la Journée 2
  (plusieurs fichiers « J1 » : J2, J3… dans l'ordre des noms de fichiers). Journées Matchs et
  Courses peuvent être mélangées.
- Une journée vide en fin de championnat (ou la J1 vierge d'un nouveau projet) est réutilisée ;
  les journées vides des fichiers sont ignorées.
- Précautions : refusé pendant qu'une course tourne ; une série exportée chrono en marche est
  mise en pause sur son temps ; le nombre de divisions est augmenté si besoin (jamais réduit) ;
  le récapitulatif signale les noms écrits différemment d'un jour à l'autre (« jean dupont » /
  « Jean Dupont »), qui compteraient comme deux personnes dans les classements.

### 🔍 Recherche dans la page
- Nouveau bouton **🔍** dans l'en-tête : une petite barre de recherche, comme le Ctrl+F du
  navigateur, pour retrouver un joueur, un nageur ou un club dans l'écran affiché. Sans
  tenir compte des majuscules ni des accents (« helene » trouve « Hélène »), compteur de
  résultats, ▲/▼ ou Entrée / Maj+Entrée pour naviguer, Échap pour fermer. Le surlignage
  suit les mises à jour de l'écran (score saisi, course en cours…).

### 👥 Participants disponibles : lisible après les séries automatiques
- Après « 🏁 Séries automatiques », chaque fiche (une par inscription) affiche **sur la même
  ligne** son épreuve, son temps d'engagement, sa série et son couloir :
  « 🎯 50m brasse · ⏱ 1m02,00s · Série 1, couloir 3 ». Un nageur inscrit dans deux épreuves
  n'a plus deux lignes identiques. Série et couloir suivent un déplacement (« + », 🏊).
- Les lignes **non placées** (non comprises, ou sans épreuve correspondante) sont en tête,
  surlignées, avec « ⚠️ non placée » et la raison au survol.
- La ligne d'origine s'affiche au survol du nom.
- La liste **s'agrandit à la souris** (coin en bas à droite) et garde sa hauteur.

### 🏁 Séries automatiques : la journée ouverte par défaut
- La fenêtre propose la **journée ouverte** comme source et comme destination. Avant, la
  source était la plus longue liste de toutes les journées (depuis la J2, la liste de la J1
  passait devant), et une journée ouverte sans épreuve envoyait les séries dans une autre
  journée, dont les séries étaient remplacées.
- Journée ouverte sans liste : la liste d'une autre journée est proposée, et c'est indiqué.
  Journée ouverte sans épreuve : message « Créez d'abord une épreuve dans la Journée N ».
- Depuis une journée Matchs, le bouton fonctionne comme avant (sa liste vers la journée
  Courses).

### 🏆 Classement par épreuve : le bon club, même après une correction
- Un club corrigé après la course (ex. « Les Aquaphiles » → « Aquaphiles ») n'apparaît plus
  sous l'ancien nom dans le classement par épreuve ni dans le tableau des clubs : le club du
  nageur dans sa série fait foi, comme au classement général. Les compétitions existantes
  s'affichent justes sans rien refaire.

### 🏷️ Changer un club depuis « Participants disponibles » : suivi partout
- **« 🏷️ Affecter aux cochés »** corrige aussi les résultats déjà enregistrés : avant, après
  une course, le classement par épreuve et le tableau des clubs gardaient l'ancien club.
- **✏️ sur un nageur inscrit dans plusieurs épreuves** (une ligne par épreuve après
  « 🏁 Séries automatiques ») : accepté. Avant, refusé avec « Un participant porte déjà ce
  nom ». Toutes ses inscriptions suivent (liste, séries, résultats) ; changer le club ne
  réécrit plus son dossard dans ses autres épreuves.
- Même correction pour ✏️ dans « 👥 Gérer les participants » et dans la fenêtre 🏊 des
  couloirs. Le chrono d'une course en cours prend aussi le nouveau club.

### 🎉 Épreuves « fun » hors classement des clubs
- Case **« 🎉 Épreuve fun »** dans la fenêtre de création d'épreuve (elle s'applique à toutes
  les épreuves saisies d'un coup) et dans ✏️ Modifier l'épreuve (cocher / décocher à tout
  moment). Un badge « 🎉 Fun » s'affiche sur l'épreuve.
- Une épreuve fun garde son tableau de résultats (temps, rangs, médailles) mais n'entre pas
  dans le classement des clubs : pas de colonne « Points », pas de colonne dans le tableau
  des clubs, rien dans le total. Onglet, impression, second écran 📺 et export JSON (`fun`).

### 🏆 Points par épreuve et classement des clubs
- Le classement par épreuve (natation, athlétisme en couloirs) a une colonne **Points** :
  barème 25-19-17-15-12-10-8-6-4-2. Un club ne marque **qu'une fois par épreuve**, avec son
  meilleur classé, et les clubs sont reclassés entre eux : si les deux premiers sont du club
  A et le 3e du club B, A marque 25 et B 19. Les autres nageurs du club affichent « – ».
  Nageurs sans club : classés, sans points. Ex æquo au centième → mêmes points.
- Nouveau tableau **« 🏆 Classement des clubs (toutes épreuves) »** en tête : Rang · Club ·
  une colonne par épreuve (points gagnés, « – » si le club n'y avait personne) · Total.
  À total égal, le club qui a le plus de victoires (25 points) passe devant.
- Présent dans l'onglet, l'impression / export HTML, le second écran 📺 et l'export JSON
  (`clubs`, et `clubPoints` sur chaque classé).

### ⏱️ Saisie manuelle des résultats fiabilisée
- **Ordre des couloirs** : en mode couloirs, la fenêtre ⏱️ affiche une colonne **Couloir** et
  les lignes dans l'ordre du bassin, comme la feuille imprimée (avant : ordre des temps
  d'engagement, avec le seul dossard — facile de se tromper de ligne).
- **DNS / DISQ** se tapent directement dans le champ (`DNS`, `DISQ`, `DSQ`, `DQ`) ; un DNS ou
  DISQ existant est affiché tel quel et n'est plus ré-enregistré avec son ancien temps.
- **Série terminée avec des DNS / DISQ** : une série où chacun a un temps ou est DNS/DISQ
  est terminée (carte verte « ✅ 5/5 résultats (dont 1 DNS) »), y compris si tout le monde
  est DNS/DISQ. Avant, un seul DNS laissait la carte à « 4/5 », en bleu.
- **Corrections** :
  - la saisie **plantait** sur une série générée par « 🏁 Séries automatiques » (aucun temps
    enregistré) ;
  - un temps saisi restait « Prêt » : la feuille imprimée affichait « - » ; c'est maintenant
    une arrivée complète (feuille, classements, série « terminée ») ;
  - rouvrir la course après une saisie manuelle reprenait l'ancienne progression et
    « Terminer » effaçait les temps saisis ;
  - un champ vidé ne retirait pas le temps ; une saisie illisible était ignorée en silence
    (« 1'02"35 » devenait 1 s) — formats `1'02"35` et `1:02:35` acceptés.

### 🏁 Séries automatiques : relais
- Les **relais** sont reconnus : « 4x400m », « 4 x 100 m », « 4×50m libre ». Une ligne
  « Team Alpha 4x400m 3:25.00 » va dans l'épreuve « 4x400m », jamais dans le 400m
  individuel ; « 4x400m » et « 4x400m mixte » le même jour sont départagés par « mixte ».
  Les séries de relais portent la distance totale (4x400m → 1 600 m). Avant : ces lignes
  n'étaient placées nulle part, et une épreuve 4x400m empêchait même de placer le 400m.

### 🏁 « Séries natation » devient « Séries automatiques »
- Le bouton et sa fenêtre s'appellent désormais **« 🏁 Séries automatiques »** : le même
  générateur (séries par couloirs, au temps d'engagement) sert aussi à l'athlétisme. Textes
  neutres (« participants » au lieu de « nageurs »), exemple d'athlétisme dans l'aide
  (« Marie Leroy 200m 25.40 »). Case « Mode couloirs (un bouton d'arrêt par couloir) », séries « déjà disputées ».
- **Athlétisme** : deux épreuves de même distance le même jour (« 100m » et « 100m haies »,
  « 100m Benjamins » et « 100m Minimes ») sont départagées par les mots de l'épreuve écrits sur
  la ligne ; une ligne sans précision va dans l'épreuve sans précision (« 100m »). Les séries
  d'athlétisme sont marquées « course » (plus « natation »), gardent le classement par épreuve,
  et le titre devient « 🏁 Résultats par épreuve » (« 🏊 Résultats natation par épreuve »
  reste pour une compétition 100 % natation). La natation (« 20m libre » / « 20m brasse »)
  est inchangée.

### 🎯 Épreuves en masse
- La fenêtre **« 🎯 Épreuve »** accepte **une épreuve par ligne** : collez la liste des
  épreuves (« 50m brasse », « 50m dos »…) pour toutes les créer d'un coup, avec la même date.
  Lignes vides et puces ignorées ; une épreuve qui existe déjà n'est pas recréée (le message
  le dit). Ctrl+Entrée pour valider.

### 🏊 « + » des Participants disponibles vers les séries « Séries natation »
- Le **« + »** d'un participant et le bouton **« ➕ Ajouter à une série »** (cochés) proposent
  désormais **toutes les séries**, y compris celles générées par « 🏊 Séries natation »
  (avant : seulement les séries créées à la main, et « Créez une série » après une simple
  génération). Les séries sont groupées par épreuve, avec le couloir que prendra le nageur
  (« → couloir 6 ») et « ✅ terminée » pour les séries déjà nagées.
- **Dossard toujours unique dans la série** : le nageur garde son dossard s'il est libre,
  sinon il reçoit le plus grand + 1. Avant, un ajout dans une série générée pouvait recevoir
  un dossard déjà pris (ex. la Série 2 porte les dossards 6 à 10 : le nouveau recevait 6),
  ce qui mélangeait les deux nageurs en course (DNS, ✏️, arrivées).
- **Nageur déjà dans une autre série de la même épreuve → déplacement** : la fenêtre
  l'annonce (« ⚠️ déjà en Série 2 : sera déplacé ici »), une confirmation est demandée, il est
  retiré de son ancienne série (il n'est donc jamais classé deux fois dans l'épreuve). Refusé
  s'il a déjà nagé dans l'ancienne série ; un DNS (pas parti) peut être déplacé.

### 🏊 Séries natation : ajouter ou modifier sur place
- **« ➕ Série » dans chaque épreuve**, bien visible dans son en-tête, avec une fenêtre
  **pré-remplie** (natation, 50 m, mode couloirs, « Série 8 »…). Il ne reste qu'à placer les
  nageurs avec 🏊. Avant, une série ajoutée ainsi à une épreuve générée par « Séries
  natation » **n'apparaissait pas** sous l'épreuve, et la fenêtre repartait sur « Course à
  pied, 1000 m, sans couloirs ».
- Le bouton **« 🏃 Série » de la barre d'actions est retiré** : il créait une série sans
  épreuve, ni imprimée ni classée par épreuve. Les séries « indépendantes » existantes
  restent visibles et se rattachent à une épreuve via « 📎 Rattacher à une épreuve… ».
- **🗑️ Supprimer une série** (créée par erreur, en trop) ; refusé pendant sa course, les
  temps perdus sont annoncés.
- **« 🏊 Séries natation » protégé** : régénérer remplace toutes les séries des épreuves, même
  celles déjà nagées (leurs temps étaient perdus sans prévenir). La fenêtre l'annonce
  (« 34 séries existantes seront remplacées, dont 3 déjà nagées ») et une confirmation est
  demandée.
- La suppression d'une épreuve annonce aussi ses séries générées.

### 🏊 Natation : classement par épreuve
- Pour une compétition de natation, le classement général (distance & temps, pensé pour la
  course à pied) est remplacé par un **classement par épreuve** : toutes les séries d'une même
  épreuve (ex. les 7 séries du 50m brasse) regroupées et classées au temps, avec club et série,
  ex æquo au centième, DNS/DISQ listés sans rang. Disponible dans les onglets 🏅 Multisport et
  🏆 Classement, à l'impression (« Résultats par épreuve »), sur le second écran 📺 Afficher et
  dans l'export JSON. Les compétitions de course à pied et mixtes sont inchangées.
- Temps affichés **au centième** dans les classements des courses (« 4,20s » au lieu de « 4s »).
- **Couloirs sans ambiguïté** : le gros bouton de couloir affichait le vrai couloir en grand
  ET le dossard en petit, et le tableau de course montrait le dossard (« #5 ») sans couloir.
  Le dossard se lisait comme un couloir (« le bouton 1 pour le nageur du couloir 5 »). En mode
  couloirs, le couloir est désormais écrit partout : bouton « COULOIR 1 » + nom (sans
  dossard), colonne **Couloir** dans le tableau de course (trié dans l'ordre du bassin), sur le
  second écran 🖥️ Afficher et sur la feuille « 🖨️ Imprimer séries » (feuille de départ triée
  par couloir, sans couleurs de médaille ni « Distance: undefinedm »).
- **Feuille imprimée = boutons d'arrêt** : les couloirs de la feuille « 🖨️ Imprimer séries »
  sont exactement ceux des gros boutons (attribution « Séries natation » + modifications 🏊/👥).
  Une ancienne série sans couloir reçoit ses couloirs dès l'impression, et ce sont ceux que la
  course utilisera. Les séries créées via ➕ Série apparaissent aussi sur la feuille (avant :
  « Aucune série »).

### 🧪 Outillage
- `npm run test:e2e` : test de bout en bout d'une journée natation dans un vrai navigateur, à
  relancer avant chaque compétition (`HEADED=1` pour le regarder se dérouler).

### 🐛 Corrections (test de bout en bout d'une journée natation)
- **Onglet 🏅 Multisport** : il disparaissait définitivement après un rechargement de la page,
  l'ajout d'une journée (+) ou un import JSON. Le classement combiné n'était alors plus
  accessible.
- **Nageur disqualifié après son arrivée** (✏️ → Disqualifier) : il gardait son temps dans les
  résultats et restait classé, même 1er, dans le classement de série et le Multisport. Il en
  est désormais exclu, comme un DNS.
- **Distance des séries natation** : une épreuve créée via 🎯 (ex. « 50m brasse ») donnait
  des séries à 0 m, affichées « 1000m » et « 1,00 km » par nageur. La distance est maintenant
  lue dans le nom de l'épreuve.
- **Club dans le classement Multisport** : la colonne Club affichait « - » pour tous les
  nageurs d'une journée Courses. Le club des séries est maintenant repris.

### 🛡️ Fiabilité
- **Échec de sauvegarde signalé** : si le navigateur ne peut plus enregistrer (stockage
  plein, navigation privée), un bandeau rouge persistant l'annonce avec un bouton
  « 💾 Exporter maintenant ». Il disparaît dès que la sauvegarde refonctionne. Avant, l'échec
  n'était visible que dans la console : on croyait ses données enregistrées.
- **Tests automatiques sur GitHub** : la suite de tests (`npm test`) tourne sur chaque PR et
  chaque push vers `main` (`.github/workflows/tests.yml`).

### 🎉 Ajouts
- **Mode couloirs** : les arrivées (clic sur un couloir ou touches 1-9 / 0) apparaissent
  dans l'historique 🕘 et peuvent être annulées, comme en mode normal. Le couloir redevient
  rouge et cliquable, et le nageur repart en course.
- Annuler l'arrivée qui avait arrêté le chrono général (dernier arrivé, ex. mauvais clic)
  **relance le chrono sans perdre le temps écoulé** entre-temps, dans les deux modes.

### 🐛 Corrections
- Mode couloirs : le bouton FIN du tableau met aussi à jour le gros bouton du couloir.
- **Mode couloirs** : au lancement d'une course (▶️ Course), les nageurs pouvaient ne plus
  être dans les couloirs attribués — si la série avait déjà été ouverte une fois puis
  modifiée (modale 🏊, 👥, nouvelle génération « Séries natation »), ou si la journée
  Courses avait été vidée (🗑️ Vider) puis remplie à nouveau, la course reprenait l'ancienne
  composition en cache, avec parfois des nageurs « fantômes » et d'anciens temps. La série
  de la journée fait désormais foi pour qui court et dans quel couloir.
- Le bouton 🗑️ Vider d'une journée Courses purge aussi le cache de course live (comme
  « Vider la journée » depuis la 2.5.0).
- **Arrêt automatique du chrono général** : un participant DNS ou DISQ n'empêche plus
  l'arrêt du chrono à l'arrivée du dernier participant encore en course (mode couloirs et
  mode normal). Marquer DNS/DISQ le dernier participant en course arrête aussi le chrono.

## [2.5.0] - 2026-09-15 → 2026-09-24 (fiabilisation Chrono, tests automatisés)

### 🎉 Ajouts
- Historique des actions de course (LAP/FINISH) annulable, avec bip sonore
- Catégories multiples au sein d'une même course Chrono (Solo/Équipe…), colonne Catégorie
  dans la fenêtre « Afficher »
- Tests automatisés Jest (`npm test`) et contrôle des fonctions redéfinies
  (`npm run check:duplicates`)

### 🐛 Corrections
- Import natation, mode couloirs et ajout de joueurs
- Cache de course live (raceData) non purgé par « Vider la journée »
- Bouton « Retour aux séries » cassé pendant une course Chrono
- Barre Divisions/Terrains qui ne réapparaissait pas (J1, double bascule) ; barre globale
  et sous-titre des terrains masqués sur une journée Chrono
- Classement interclub en live

### 🔧 Changements techniques
- Suppression de l'ancien système global événements/séries et du module mort
  `export.iife.js` (15 modules dans `src/`)
- Documentation `claude.md`/`AGENTS.md` réalignée sur le code

## [2.4.0] - 2026-09 (statuts course & saisie en masse)

### 🎉 Ajouts
- Statut **DISQ** (disqualifié) pour un participant en mode course
- Bouton "Afficher" : second écran de suivi de course/classement multisport mis à jour en
  temps réel
- Ajout en masse de participants cochés à une série (mode Courses), avec support du format
  `dossard + tabulation`
- Choix du score lors de la création d'un match BYE
- Suppression d'une épreuve directement en mode course (journée multisport)

### 🐛 Corrections
- Édition inline (tours/distance/temps) qui pouvait terminer ou bloquer une course en cours
- Collisions de noms entre les modules multisport et chrono (boutons "Ajouter" / ✏️ épreuve)
- Fermeture intempestive des modales d'ajout de série au clic extérieur

## [2.3.0] - 2026-08 (mode couloirs & imports natation)

### 🎉 Ajouts
- **Mode couloirs** pour la natation : assignation manuelle par série, saisie/arrêt par
  touche 1-9, sélection directe dans les "Participants disponibles" de la journée
- Édition du club/nom/dossard des nageurs depuis la modale couloirs et depuis
  "Gérer les participants"
- Import "Séries natation" façon Excel (choix du séparateur, mapping de colonnes),
  rendu tolérant aux données manquantes
- Barème de position (25/19/17…) pour le classement Multisport, avec exports alignés
  dessus

### 🔧 Changements techniques
- Le chrono général s'arrête désormais automatiquement quand le dernier couloir est stoppé
- `refactor(multisport)` : suppression d'un double appel à `getChronoResultsForDay`
- Uniformisation des libellés Matchs/Courses, exposition de `handleFileImport` sur `window`

## [2.2.0] - 2026-06 → 2026-07 (fiabilisation Pool & élimination directe)

### 🐛 Corrections
- Attribution des scores de pools à la mauvaise division
- Navigation clavier qui sautait un match d'une autre division (IDs non uniques)
- Tour de barrage au lieu d'un tour saturé de BYE en phase à élimination directe
- Croisement correct des classements importés (+ vocabulaire) en phase finale
- Affichage dynamique du nombre de tours (au lieu d'une borne en dur à 4)
- Réassignation des terrains hors plage de division à l'affichage

### 🎉 Ajouts
- Détection de noms de joueurs similaires (score de similitude, transpositions, espaces
  parasites) pour repérer les doublons avant classement
- Export PDF du classement général, avec mise en page compacte (évite les pages blanches)
- Import de classements de pools avec auto-configuration à partir du JSON importé

## [2.1.0] - 2026-06 (Clubs & édition Chrono)

### 🎉 Ajouts majeurs
- **Module Clubs** (`clubs.iife.js`) : club associé à chaque participant, dans tous les
  modes — voir `CLUBS.md`
- **Module Multisport** (`multisport.iife.js`) : journées mixtes Championship/Chrono avec
  classement combiné — voir `MULTISPORT.md`
- Édition inline (nom, dossard, club) des participants en mode Chrono, depuis la liste par
  journée et depuis "Gérer les participants"
- Classement Chrono par distance et temps (sans système de points), avec temps affiché en
  heures lisibles et détail cliquable par participant

### 🐛 Corrections
- Onglet course vide dû à un doublon d'id (`#raceInterface`)
- Propagation du club aux participants des séries et du tableau de course
- Classement combiné affiché même quand toutes les journées sont en mode Chrono
- `ReferenceError 'sorted'` qui cassait la fiche participant

## [2.0.0] - 2024-02-02

### 🎉 Ajouts majeurs
- **Refactoring complet** : Passage d'un fichier monolithique (922KB) à une architecture modulaire
- **12 modules IIFE** créés dans `src/` pour une meilleure maintenabilité
- **Documentation technique** complète dans `AGENTS.md`

### 📁 Structure modulaire
- `config.iife.js` - Configuration globale
- `utils.iife.js` - Fonctions utilitaires
- `notifications.iife.js` - Système de notifications
- `state.iife.js` - État global et persistance
- `players.iife.js` - Gestion des joueurs
- `ui.iife.js` - Interface utilisateur générale
- `matches.iife.js` - Mode Championship (matchs par tours)
- `pools.iife.js` - Mode POOL (poules + phase finale)
- `chrono.iife.js` - Mode CHRONO (courses avec chronométrage)
- `ranking.iife.js` - Classements et statistiques
- `export.iife.js` - Export PDF et données

### 🔧 Changements techniques
- Séparation des 3 modes UI : Championship, POOL, CHRONO
- Exposition des fonctions sur `window` pour compatibilité HTML
- Conservation du fichier `script.js` legacy pour la transition
- Création de backups (`script.js.backup`, `script-legacy.js`)

### 📝 Documentation
- Création de `AGENTS.md` - Documentation développeur complète
- Création de `README.md` - Documentation utilisateur
- Création de `CONTRIBUTING.md` - Guide de contribution
- Création de `CHANGELOG.md` - Ce fichier

---

## [1.x.x] - Avant 2024-02-02

### Fonctionnalités historiques
- Gestion des joueurs par division
- Génération de matchs (round-robin, système suisse)
- Mode poules avec phase finale
- Mode chrono pour courses
- Classements jour et général
- Export/Import JSON
- Impression des feuilles de match
- Gestion de 20 journées
- 1 à 6 divisions

---

## 🚀 Prochaines versions

La migration de `script.js` vers les modules et le nettoyage du code legacy annoncés ici
pour la 2.1.0 sont **terminés** (voir `AGENTS.md`). Pour la liste vivante des tâches et idées
restantes (tests, TypeScript, bundler, PWA...), voir **`TODO.md`** — ne pas dupliquer cette
liste ici pour éviter que les deux fichiers divergent à nouveau.
