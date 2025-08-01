import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';
import { PAYWALL_RESULT } from '@revenuecat/purchases-capacitor';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { logService } from './logService.js';
import { localStorageService } from './data/localStorageService.js';
import { loginService } from './loginService.js';
import { log } from '../util/log.js';

// Fonction pour identifier l'utilisateur dans RevenueCat
export async function initializeRevenueCatForUser() {
    console.log('Initialisation de RevenueCat pour l\'utilisateur connecté');
    const currentUser = localStorageService.getLastActiveUser();
    console.log('Utilisateur actuel:', currentUser);
    if (currentUser) {
        try {
            console.log(`Identification de l'utilisateur ${currentUser} dans RevenueCat`);
            // Identifier l'utilisateur dans RevenueCat avec votre propre ID
            await Purchases.logIn({appUserID: currentUser});
            console.log(`Utilisateur ${currentUser} identifié dans RevenueCat`);
        } catch (error) {
            console.error('Erreur lors de l\'identification dans RevenueCat:', error);
        }
    }
}

export async function presentPaywall() {
    // logService.storeToLog('Tentative d\'affichage du paywall');
    console.log('Tentative d\'affichage du paywall');
    try {
        // Present paywall for current offering:
        const { result } = await RevenueCatUI.presentPaywall();
        
        // Handle result if needed.
        switch (result) {
            case PAYWALL_RESULT.NOT_PRESENTED:
            case PAYWALL_RESULT.ERROR:
            case PAYWALL_RESULT.CANCELLED:
                return false;
            case PAYWALL_RESULT.PURCHASED:
            case PAYWALL_RESULT.RESTORED:
                // logService.storeToLog('Abonnement acheté ou restauré via le paywall');
                console.log('Abonnement acheté ou restauré via le paywall');
                // Après un achat réussi, mettre à jour la base de données
                try {
                    // logService.storeToLog('Abonnement acheté ou restauré, mise à jour de la base de données');
                    const customerInfo = await Purchases.getCustomerInfo();
                    const latestTransaction = getLatestTransaction(customerInfo);
                    
                    if (latestTransaction) {
                        await updateSubscriptionInDatabase(latestTransaction);
                        console.log('Abonnement mis à jour avec succès dans la base de données');
                    }
                } catch (error) {
                    console.error('Erreur lors de la mise à jour de l\'abonnement après achat:', error);
                }
                return true;
            default:
                return false;
        }
    } catch (error) {
        console.error('Erreur lors de l\'affichage du paywall:', error);
        return false;
    }
}

function getAuthToken() {
    // Récupérer le token depuis superlogin, similaire à loginService.js
    const loginInfo = loginService.getLoggedInUserDatabase();
    if (loginInfo && loginInfo.token) {
        return loginInfo.token;
    }
    
    // Fallback: essayer de récupérer depuis localStorage
    try {
        const superloginData = JSON.parse(localStorage.getItem('superlogin.session'));
        if (superloginData && superloginData.token) {
            return superloginData.token;
        }
    } catch (error) {
        console.warn('Impossible de récupérer le token depuis localStorage:', error);
    }
    
    return null;
}

export async function checkSubscription(username) {
    try {
        const token = getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`https://jmfc.dynseo.com/api/check-subscription.php?username=${username}`, {
            headers: headers
        });
        if (!response.ok) {
            throw new Error('Erreur lors de la vérification de l\'abonnement');
        }
        const data = await response.json();
        return data.active; // L'API retourne { active: true/false }
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'abonnement :', error);
        return false;
    }
}

export async function updateSubscriptionInDatabase(purchaseInfo) {
    const currentUser = localStorageService.getLastActiveUser();
    if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
    }

    const subscriptionData = {
        username: currentUser,
        productId: purchaseInfo.productId,
        transactionId: purchaseInfo.transactionId,
        purchaseToken: purchaseInfo.purchaseToken,
        purchaseTime: purchaseInfo.purchaseTime,
        subscriptionType: getSubscriptionType(purchaseInfo.productId),
        platform: Capacitor.getPlatform()
    };

    try {
        const token = getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('https://jmfc.dynseo.com/api/update-subscription.php', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(subscriptionData)
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const result = await response.json();
        console.log('Abonnement mis à jour avec succès:', result);
        return result;
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'abonnement:', error);
        throw error;
    }
}

function getSubscriptionType(productId) {
    // Mappez les IDs de produits RevenueCat vers les types d'abonnement
    if (productId.includes('monthly')) return 'monthly';
    if (productId.includes('yearly') || productId.includes('annual')) return 'yearly';
    if (productId.includes('lifetime')) return 'lifetime';
    return 'monthly'; // Par défaut
}

export async function handlePaywallIfNeeded() {
    console.log('Vérification de l\'abonnement actif pour l\'utilisateur connecté');
    // logService.storeToLog('Vérification de l\'abonnement actif pour l\'utilisateur connecté');
    const currentUser = localStorageService.getLastActiveUser();
    console.log('Utilisateur actuel:', currentUser);
    if (!currentUser) {
        return; // Pas d'utilisateur connecté
    }
    
    const hasActiveSubscription = await checkSubscription(currentUser);
    if (!hasActiveSubscription) {
        // Afficher le paywall si pas d'abonnement actif
        const success = await presentPaywall();
        if (!success) {
            console.warn('L\'utilisateur a annulé le paywall ou une erreur s\'est produite.');
        }
    }
}

function getLatestTransaction(customerInfo) {
    console.log('Récupération de la dernière transaction pour l\'utilisateur :', JSON.stringify(customerInfo));
    // Récupérer la dernière transaction depuis les informations client RevenueCat
    const entitlements = customerInfo.customerInfo.entitlements.active;
    console.log('Entitlements actifs:', entitlements);
    
    for (const [key, entitlement] of Object.entries(entitlements)) {
        if (entitlement.isActive) {
            return {
                productId: entitlement.productIdentifier,
                transactionId: entitlement.originalPurchaseDate, // ou autre identifiant unique
                purchaseToken: entitlement.store === 'PLAY_STORE' ? entitlement.originalPurchaseDate : null,
                purchaseTime: new Date(entitlement.latestPurchaseDate).getTime()
            };
        }
    }
    
    return null;
}
