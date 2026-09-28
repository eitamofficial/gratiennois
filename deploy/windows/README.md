# Caddy sur Windows

Le wiki servi depuis ce PC, sous un sous-domaine DuckDNS. Mêmes principes que
[`deploy/termux/`](../termux/) : Caddy est le reverse proxy, il obtient et
renouvelle seul le certificat Let's Encrypt.

Trois différences avec la tablette : le port 80 demande une élévation, il n'y a
pas de `termux-services`, et les journaux vont dans un fichier à côté.

---

## 1. Installer Caddy

```powershell
winget install --id CaddyServer.Caddy --exact
```

C'est fait sur cette machine (version 2.11.4). Le binaire est installé dans un
dossier versionné sous `WinGet\Packages` : `demarrer-caddy.bat` le retrouve tout
seul, sans dépendre du `PATH`.

## 2. Le port 80

Windows réserve les ports inférieurs à 1024 aux administrateurs. **Sans
élévation, Caddy démarre et répond sur un autre port, ou refuse de démarrer** —
et rien dans la fenêtre ne l'explique clairement.

Deux solutions, au choix.

**La plus simple** : ouvrir `demarrer-caddy.bat` en « Exécuter en tant
qu'administrateur ». Le wiki tourne alors tant que la fenêtre est ouverte, ce
qui n'est pas franchement durable.

**La plus robuste** : réserver le port 80 sans élévation, une fois pour toutes,
en administrateur :

```powershell
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=8080 connectaddress=127.0.0.1
```

Puis faire écouter Caddy sur 8080 au lieu de 80. Attention : `portproxy` ne
gère pas HTTP, seulement du TCP brut — le HTTPS de Caddy ne fonctionnerait pas
tel quel. **Cette solution est donc adaptée au mode `http://` seulement.**

En pratique, pour un service durable, la bonne méthode sur Windows est de
déplacer le wiki lui-même sur un port élevé et de laisser Caddy au-dessus :

```caddyfile
reverse_proxy 127.0.0.1:3000 {
    # Caddy est sur 8080 : caddy listen 8080 dans le Caddyfile
}
```

## 3. Démarrer

Pour un essai immédiat, deux fenêtres :

```powershell
.\deploy\windows\demarrer-wiki.bat
.\deploy\windows\demarrer-caddy.bat
```

Pour un hébergement durable, sautez directement à la section 8.

Le script :

1. trouve Caddy, même si le `PATH` n'a pas été rechargé ;
2. renseigne `WIKI_DOMAINE` et `WIKI_SCHEME` s'ils manquent ;
3. **refuse de démarrer si le port 80 est déjà occupé**, en indiquant comment
   trouver le coupable — sans ce contrôle, Caddy démarre puis s'arrête aussitôt,
   sans jamais dire pourquoi ;
4. **valide le Caddyfile avant de lancer** — une erreur de syntaxe devient un
   message lisible au lieu d'un démarrage qui s'effondre plus tard ;
5. vérifie que le wiki répond sur le port 3000, et vous prévient sinon : Caddy
   démarrerait sans erreur et toutes les pages répondraient 502.

Les deux scripts `.bat` sont **volontairement sans accent**. `cmd.exe`
n'interprète pas un `.bat` en UTF-8 mais dans la page de code du système : un
accent y apparaît `D-├-marrage` à l'écran. C'est une contrainte de Windows, pas
une préférence.

## 4. Le pare-feu

Par défaut, Windows bloque les connexions entrantes sur le port 80. C'est
**fait automatiquement** par `installer-services.ps1` (section 8). Le faire à la
main reste possible :

```powershell
New-NetFirewallRule -DisplayName "Wiki Caddy TCP 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Wiki Caddy TCP 443" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

Pour vérifier :

```powershell
Get-NetFirewallRule -DisplayName "Wiki Caddy*" | Format-Table DisplayName, Enabled, Direction
```

## 5. Le sous-domaine

Sur <https://www.duckdns.org>, créez `wiki-gratiennois` et notez le jeton.

### L'IPv6 évite toute redirection de port

Une machine connectée en IPv6 reçoit **deux adresses publiques**. Sur celle-ci :

| Adresse | Origine du suffixe | Comportement |
|---|---|---|
| `2a01:…:1578:885b:c7fc:4d90` | `Link` (dérivée de la carte réseau) | **stable**, survit aux redémarrages |
| `2a01:…:bc2c:42e6:1ec9:ff9d` | `Random` (protège la vie privée) | **change** régulièrement |

**Vérifiez lequel DuckDNS a enregistré.** Si c'est l'adresse `Random`, le nom
pointe vers une adresse abandonnée : le site devient injoignable de l'extérieur
sans que rien ne semble cassé, et le retour à la normale dépend d'une rotation
aléatoire. C'est une panne silencieuse, difficile à croire.

En IPv6, **aucune redirection de port n'est nécessaire** : la machine est
joignable directement. Vérifié de l'extérieur, le sous-domaine répond sur
`http://wiki-gratiennois.duckdns.org/` sans que la Livebox soit touchée.

Si l'IPv4 doit aussi fonctionner, il faut en plus rediriger le port 80 sur la
box, avec une **IP fixe** pour ce PC dans le DHCP. En revanche, un visiteur
uniquement IPv4 ne pourra pas joindre le site tant que ce n'est pas fait.

### Recaler DuckDNS sur la bonne adresse

```powershell
.\deploy\windows\sync-duckdns.ps1 `
  -Domaine wiki-gratiennois.duckdns.org `
  -Jeton "votre-jeton"
```

Le script choisit l'adresse `Link`, ne signale à DuckDNS que lorsqu'elle a
changé, et **échoue bruyamment** si le jeton est refusé — une réponse `KO` ne
produit aucune erreur HTTP, et sans ce test on croirait avoir réussi.

Pour tenir dans la durée, faites-le exécuter toutes les dix minutes par le
Planificateur de tâches (voir section 7).

## 6. Le HTTPS

Une fois le port 80 joignable depuis Internet :

```powershell
$env:WIKI_SCHEME="https://"
.\deploy\windows\demarrer-caddy.bat
```

Pour que le réglage survive à la fermeture de la fenêtre :

```powershell
setx WIKI_SCHEME https://
```

Caddy obtient le certificat, le renouvelle, et redirige le HTTP vers le HTTPS.
Si l'obtention échoue, repassez à `http://` : le site redevient accessible.

## 7. La box (Livebox)

L'IPv6 rend le site joignable sans rien configurer sur la box. Deux choses
restent utiles.

**L'IPv4.** Un visiteur sans IPv6 ne peut pas joindre le site tant que le port
80 n'est pas redirigé. Dans l'interface de la Livebox : *Les Plus* (ou
*Paramètres avancés*) → **Redirection de ports / NAT**, puis :

| Nom | Port externe | Port interne | Adresse interne |
|---|---|---|---|
| Wiki | 80 | 80 | l'IP fixe du PC |

Le mot de passe d'administration est sur l'étiquette de la box. Le PC doit avoir
une **IP fixe**, réservée dans le DHCP de la Livebox — sinon la redirection
pointera dans le vide au prochain renouvellement.

**Le HTTPS.** Let's Encrypt valide le domaine en interrogeant le port 80 depuis
Internet. L'enregistrement `A` pointe vers la box : sans redirection, la
validation IPv4 échoue et le certificat n'est pas délivré. La redirection
ci-dessus est donc **nécessaire au HTTPS**, même si l'IPv6 suffit pour
consulter le site.

## 8. Rendre l'hébergement durable

Deux fenêtres laissées ouvertes ne constituent pas un hébergement : un
redémarrage, une mise en veille ou un Ctrl+C suffisent à tout arrêter.
`installer-services.ps1` enregistre trois tâches dans le Planificateur.

Le jeton DuckDNS est passé **en argument** de l'installeur, qui l'inscrit dans
la commande de la tâche. Puis, **en administrateur** :

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows\installer-services.ps1 `
  -JetonDuckDNS "votre-jeton"
```

Le sous-domaine et le mode HTTP ont des valeurs par défaut correctes
(`wiki-gratiennois.duckdns.org` et `http://`) : inutile de les ressaisir.
L'installeur affiche un avertissement s'il n'a pas reçu de jeton.

Cela crée les tâches, et ouvre aussi les ports 80 et 443 dans le pare-feu :

| Tâche | Déclenchement | Rôle |
|---|---|---|
| `Wiki Gratienois` | au démarrage | le wiki, relancé s'il tombe |
| `Wiki Caddy` | au démarrage | le reverse proxy |
| `Wiki DuckDNS` | toutes les 10 min | épingle l'adresse IPv6 stable |

Démarrage immédiat :

```powershell
Start-ScheduledTask -TaskName "Wiki Gratienois"
Start-ScheduledTask -TaskName "Wiki Caddy"
```

Pour tout retirer :

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows\installer-services.ps1 -Desinstaller
```

**Les tâches tournent sous `SYSTEM`, pas sous votre compte.** C'est délibéré :
une tâche liée à un utilisateur n'hérite pas de son `PATH`, et le script
échouerait sur un « node n'est pas reconnu » incompréhensible. Le site est
ainsi servi dès le boot, avant même votre connexion.

Cette décision a deux contreparties, toutes deux traitées dans les scripts :

- **`setx` ne sert à rien ici.** Il écrit dans l'environnement de *votre*
  session, que `SYSTEM` ne lit pas : la tâche DuckDNS échouerait à chaque tour
  sur « `DUCKDNS_TOKEN` est obligatoire ». Le jeton est donc inscrit dans la
  commande de la tâche, lisible des seuls administrateurs — le même cercle que
  celui qui peut déjà lire votre `.env`.
- **Node doit être installé pour toute la machine.** Un Node posé dans le
  profil (via `nvm` ou un gestionnaire de versions) reste invisible de `SYSTEM`,
  et le wiki ne démarre pas. Utilisez l'installateur de nodejs.org, avec
  « Add to PATH » coché.

`termux-services` n'existe pas sur Windows : c'est ce mécanisme qui joue le
même rôle.

---

## Où aller maintenant, et quoi attendre

Le wiki est servi sur **trois adresses**, dès que les deux programmes tournent :

| Adresse | Quand elle répond |
|---|---|
| `http://localhost:3000` | le wiki tourne, sans Caddy |
| `http://localhost` | Caddy tourne aussi |
| `http://wiki-gratiennois.duckdns.org` | dès que les deux tournent **et** que DuckDNS pointe sur l'adresse IPv6 stable |

La dernière ligne est la source de deux confusions. D'abord, le nom peut mener
nulle part alors que tout fonctionne localement : DuckDNS enregistre par défaut
l'adresse IPv6 **temporaire** de la machine, qui change sans prévenir (section 5).
Ensuite, depuis ce PC, le nom ne répond qu'en IPv6 : en IPv4 il partirait vers
la box, qui ne sait pas encore revenir ici.

C'est aussi pourquoi le Caddyfile déclare `localhost` et `127.0.0.1` à côté du
domaine. Caddy n'accepte que le premier nom d'hôte qu'il connaît et renvoie une
**page vide** pour les autres : taper `http://localhost` dans le navigateur
donnait un écran blanc, indiscernable d'un site inaccessible.

## Dépannage

**Le wiki s'est arrêté, ou Caddy avec lui** — les deux tournent au premier plan
et meurent avec leur fenêtre. C'est ce qu'a montré le premier essai : le journal
`caddy.log` se terminait par `^C`. Relancez les deux.

**Caddy démarre puis s'arrête aussitôt, sans explication** — c'est le symptôme
le plus courant, et presque toujours un **port déjà occupé** : un Caddy laissé
ouvert par une fenêtre qu'on croyait fermée. `demarrer-caddy.bat` le détecte
maintenant et le dit explicitement. Sinon :

```powershell
netstat -ano | findstr ":80 " | findstr LISTENING
taskkill /PID <le-numéro> /F
```

**`npm start` échoue avec `EADDRINUSE` sur le port 3000** — un wiki tourne déjà,
souvent laissé par une session précédente :

```powershell
netstat -ano | findstr ":3000 " | findstr LISTENING
taskkill /PID <le-numéro> /F
```

À l'inverse, si `npm start` est refusé **et** que le site répond, c'est que le
wiki tourne déjà : ne lancez pas de second exemplaire.

**Le sous-domaine ne répond pas, mais `localhost` oui** — c'est presque toujours
DuckDNS pointant sur l'adresse IPv6 **temporaire** au lieu de la stable. Le
constat :

```powershell
Get-NetIPAddress -AddressFamily IPv6 |
  Select-Object IPAddress, PrefixOrigin, SuffixOrigin
nslookup wiki-gratiennois.duckdns.org
```

L'adresse enregistrée côté DuckDNS doit correspondre à celle dont
`SuffixOrigin` vaut `Link`. Sinon, lancez `sync-duckdns.ps1`.

**Le site ne répond qu'en IPv4** — il manque la redirection de port sur la box,
et le visiteur n'a pas d'IPv6. Voir la section 5.

**Une page blanche s'affiche** — Caddy ne sert que les noms d'hôte déclarés. Sur
un autre nom, il répond `200` avec **zéro octet**, ce qui donne un écran vide.
Utilisez `http://localhost`.

**Caddy ne démarre pas, ou n'écoute pas sur 80** — élévation. Ouvrez le script
en administrateur.

**Toutes les pages renvoient 502** — le wiki n'est pas lancé. Dans le projet :

```powershell
npm run build
npm run start
```

Le lanceur vous prévient dans ce cas, avant même de lancer Caddy.

**Le site redirige vers `https://` alors que rien n'est configuré** —
`WIKI_SCHEME` est resté sur `https://`. Remettez `http://`.

**Les accents s'affichent mal (`D-├-marrage`)** — un problème antique de
`cmd.exe`, qui n'interprète pas un `.bat` en UTF-8. Le script de ce dépôt est
délibérément **sans accent** pour l'éviter. Si vous en ajoutez, la page de code
de la console.Sendez la sortie dans un fichier, ou lisez le journal.

**Le journal** : `deploy\windows\caddy.log`.
