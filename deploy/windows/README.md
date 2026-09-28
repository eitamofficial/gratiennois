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

```powershell
.\deploy\windows\demarrer-caddy.bat
```

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

Le fichier est **volontairement sans accent**. `cmd.exe` n'interprète pas un
`.bat` en UTF-8 mais dans la page de code du système : un accent y apparaît
`D-├-marrage` à l'écran. C'est une contrainte de Windows, pas une préférence.

## 4. Le pare-feu

Par défaut, Windows bloque les connexions entrantes sur le port 80. En PowerShell
**en administrateur** :

```powershell
New-NetFirewallRule -DisplayName "Wiki Caddy HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Wiki Caddy HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

Pour vérifier ce qui est ouvert :

```powershell
Get-NetFirewallRule -DisplayName "Wiki Caddy*" | Format-Table DisplayName, Enabled, Direction
```

## 5. Le sous-domaine

Sur <https://www.duckdns.org>, créez `wiki-gratiennois` et notez le jeton.
L'IP publique doit pointer vers votre box, qui doit rediriger les ports 80 et
443 vers ce PC. **Donnez-lui une IP fixe** dans le DHCP de la box.

Tant que ce n'est pas fait, `WIKI_SCHEME=http://` sert le site localement, et
rien n'est joignable de l'extérieur — c'est normal et ce n'est pas une panne.

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

## 7. Au démarrage du PC

Caddy lancé dans une fenêtre s'arrête avec elle. Pour qu'il démarre avec le
système, sans dépendre d'une session ouverte :

1. Ouvrir **Planificateur de tâches** ;
2. **Créer une tâche** — déclenchement « Au démarrage », action
   `C:\chemin\vers\projet\deploy\windows\demarrer-caddy.bat` ;
3. **Cocher « Exécuter avec des privilèges élevés »** — indispensable pour le
   port 80 ;
4. Dans **Paramètres**, décocher « Arrêter la tâche si elle s'exécute plus de
   3 jours ».

`termux-services` n'existe pas ici : c'est ce mécanisme qui joue le même rôle.

---

## Où aller maintenant, et quoi attendre

Le wiki est servi sur **trois adresses**, dès que les deux programmes tournent :

| Adresse | Quand elle répond |
|---|---|
| `http://localhost:3000` | le wiki tourne, sans Caddy |
| `http://localhost` | Caddy tourne aussi |
| `http://wiki-gratiennois.duckdns.org` | **seulement** après la redirection de port sur la box |

La dernière ligne est la source d'une confusion fréquente. Le nom DuckDNS pointe
vers l'adresse publique de votre box ; tant que celle-ci ne redirige pas le port
80 vers ce PC, le nom ne mène nulle part — **y compris depuis ce PC**. Ce n'est
pas une panne : le site répond dès que la redirection existe.

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

**Le sous-domaine ne répond pas, mais `localhost` oui** — c'est l'état normal
avant la redirection de port. Le test qui le prouve :

```powershell
curl -i http://localhost/api/health -H "Host: wiki-gratiennois.duckdns.org"
```

`200 OK` = tout fonctionne, seul le réseau manque.

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
