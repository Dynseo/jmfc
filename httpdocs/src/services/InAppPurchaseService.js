import { InAppPurchase } from 'cordova-plugin-inapppurchase';

class InAppPurchaseService {
    constructor() {
        this.products = {
            mensuel: {
                id: 'com.dynseo.jmfc.subscription.mensuel',
                type: 'paid subscription'
            },
            trimestriel: {
                id: 'com.dynseo.jmfc.subscription.trimestriel',
                type: 'paid subscription'
            },
            semestriel: {
                id: 'com.dynseo.jmfc.subscription.semestriel',
                type: 'paid subscription'
            },
            annuel: {
                id: 'com.dynseo.jmfc.subscription.annuel',
                type: 'paid subscription'
            }
        };
    }

    async initialize() {
        try {
            await InAppPurchase.init();
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des achats in-app:', error);
            return false;
        }
    }

    async getProducts() {
        try {
            const productIds = Object.values(this.products).map(p => p.id);
            const products = await InAppPurchase.getProducts(productIds);
            return products;
        } catch (error) {
            console.error('Erreur lors de la récupération des produits:', error);
            throw error;
        }
    }

    async purchaseSubscription(frequence) {
        try {
            const productId = this.products[frequence]?.id;
            if (!productId) {
                throw new Error('Fréquence d\'abonnement invalide');
            }

            const purchase = await InAppPurchase.order(productId);
            
            if (purchase && purchase.transaction) {
                await this.verifyPurchase(purchase, frequence);
                return purchase;
            }
            throw new Error('Achat non validé');
        } catch (error) {
            console.error('Erreur lors de l\'achat:', error);
            throw error;
        }
    }

    async verifyPurchase(purchase, frequence) {
        try {
            const response = await fetch('/api/abonnements/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactionId: purchase.transaction.id,
                    productId: purchase.productId,
                    receipt: purchase.transaction.receipt,
                    platform: this.getPlatform(),
                    frequence: frequence,
                    montant: purchase.price
                })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la vérification de l\'achat');
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'achat:', error);
            throw error;
        }
    }

    getPlatform() {
        if (window.cordova && window.cordova.platformId) {
            return window.cordova.platformId;
        }
        return 'unknown';
    }
}

export default new InAppPurchaseService(); 