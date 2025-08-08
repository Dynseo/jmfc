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

Une fois que le client aura tous les accès, il faut suivre la documentation de RevenueCat pour ajouter la plateforme App Store (https://www.revenuecat.com/docs/projects/connect-a-store).

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

### Configurer les produits
Une fois que la plateforme App Store est ajoutée sur RevenueCat, il faut lui ajouter les produits.

Pour ça, il faut aller sur l'onglet Products >> Products, cliquer sur "New" et remplir les infos pour importer les produits depuis Apple.

Ensuite, il faut ajouter les produits nouvellement créés à l'offering "default" sous Products >> Offerings.

### Server Notifications
Pour pouvoir recevoir des notifications de RevenueCat, il faut configurer un nouveau webhook dans les "Integrations". ça doit être le même que celui qui existe déjà, à la différence qu'il doit concerner Apple.

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

Il faudra faire en sorte que ce script s'exécute en continue sur le serveur, en tâche de fond.


## Documentations importantes
- [Play Console Google](https://play.google.com/console/u/2/developers/7905041377930319579/app/4972187449897569532/tracks/4701659536371198696/releases/2/details)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Apple Developer Account](https://developer.apple.com/account)
- [Documentation Capacitor](https://capacitorjs.com/docs)
- [Documentation RevenueCat](https://docs.revenuecat.com/docs)
- [Dashboard RevenueCat](https://app.revenuecat.com)
- [Ajouter un store](https://www.revenuecat.com/docs/projects/connect-a-store)
- [Configurer les produits](https://www.revenuecat.com/docs/offerings/products-overview)
- [Offerings](https://www.revenuecat.com/docs/offerings/overview)