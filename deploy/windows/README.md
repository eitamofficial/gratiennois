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
3. **valide le Caddyfile avant de lancer** — une erreur de syntaxe devient un
   message lisible au lieu d'un démarrage qui s'effondre plus tard ;
4. vérifie que le wiki répond sur le port 3000, et vous prévient sinon : Caddy
   démarrerait sans erreur et toutes les pages répondraient 502.

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

## Dépannage

**`curl` échoue avec « Failed to connect » sur le sous-domaine** — la redirection
de port n'est pas faite. Testez en local, sans quitter la machine :

```powershell
curl -i http://127.0.0.1/api/health -H "Host: wiki-gratiennois.duckdns.org"
```

`200 OK` = Caddy et le wiki fonctionnent, seul le réseau manque.

**Caddy ne démarre pas, ou n'écoute pas sur 80** — élévation. Ouvrez le script
en administrateur.

**Toutes les pages renvoient 502** — le wiki n'est pas lancé. Dans le projet :

```powershell
npm run build
npm run start
```

**Le site redirige vers `https://` alors que rien n'est configuré** —
`WIKI_SCHEME` est resté sur `https://`. Remettez `http://`.

**Le journal** : `deploy\windows\caddy.log`.
