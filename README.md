# Je Me Fais Comprendre - Cheat Sheet

## Explication du projet
Le projet est conçu avec Vue.js version 2. Il utilise capacitor pour créer les versions android et ios.

## Hébergement / déploiement
Le projet est sur l'ancien serveur de Test, sous le repertoire `/var/www/jmfc/`.
La base de données est également sur le serveur de Test (`jmfc_admin`).

## In-App Purchases

### Google Play
Les abonnements sont gérés via la Google Play Console, avec les identifiants suivants :
- eryn.numeric@gmail.com
- dqs*UpH874@J87B

Les différents abonnements sont configurés dans la section "Produits" de la console, sous "Abonnements".

### Apple App Store
Les abonnements sont gérés via App Store Connect, avec les identifiants suivants :
- frederic@boutique-nounou.fr
- Fanny@56890

> Pour l'instant, les abonnements ne sont pas encore configurés dans App Store Connect.

Le développeur Fabrice Coffy doit transférer la propriété de l'application au compte du client. Pour cela, il faut récupérer l'Apple ID et le Team ID du client, sûrement en créant un compte développeur Apple si le client n'en a pas déjà un.

### RevenueCat
L'application utilise RevenueCat pour gérer les abonnements. Les identifiants RevenueCat sont :
- thomas.marques@dynseo.com
- RevenueCat*2025

Sous App Providers, on retrouve Google Play et Apple App Store.

L'écran de Paywall est configuré dans l'onglet "Paywall".

Pour que le client puisse bien gérer ses abonnements, il faudra lui transférer la propriété de l'application RevenueCat. Pour cela, il faut :
- Se rendre dans les "Project settings"
- Cliquer sur "Collaborators"
- Inviter le client avec son adresse email (il faudra qu'il se crée un compte RevenueCat s'il n'en a pas déjà un)
- Sous "Actions", choisir "Transfer ownership"

## Passage de l'application en production

VOIR AVEC ALKAYA

## Synchronisation du projet Android
Pour synchroniser le projet Android avec le code source sous jmfc, il faut suivre ces étapes :
1. Ouvrir le terminal et se rendre dans le répertoire du projet :
   ```bash
   cd /var/www/jmfc/httpdocs
   ```
2. Exécuter la commande suivante pour build le projet :
   ```bash
   npm run build
   ```
3. Ensuite, syncrhoniser le projet Android avec le code source :
   ```bash
    cd /var/www/jmfc/
    npx cap sync android
    ```
4. Pour lancer le projet Android, exécuter :
   ```bash
    npx cap open android
    ```

## Synchronisation du projet iOS
Pour synchroniser le projet iOS avec le code source sous jmfc, il faut suivre ces étapes :
1. Ouvrir le terminal et se rendre dans le répertoire du projet:
   ```bash
   cd /var/www/jmfc/httpdocs/
   ```
2. Exécuter la commande suivante pour build le projet :
   ```bash
   npm run build
   ```
3. Ensuite, synchroniser le projet iOS avec le code source :
   ```bash
    cd /var/www/jmfc/
    npx cap sync ios
    ```
4. Pour lancer le projet iOS, exécuter :
   ```bash
    npx cap open ios
    ```

## Lancement du script sur le serveur
**IMPÉRATIF !** Pour que l'application fonctionne correctement, il est nécessaire de lancer la commande suivante sur le serveur :
```bash
   cd /var/www/jmfc/httpdocs/
   npm run start-auth-ssl
```


## Documentations importantes
- [Documentation Capacitor](https://capacitorjs.com/docs)
- [Documentation RevenueCat](https://docs.revenuecat.com/docs)
- [Dashboard RevenueCat](https://app.revenuecat.com)