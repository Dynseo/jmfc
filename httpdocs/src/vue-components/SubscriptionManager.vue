<template>
  <div class="subscription-manager">
    <div v-if="loading" class="loading">
      {{ $t('subscription.loading') }}
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else>
      <h2>{{ $t('subscription.title') }}</h2>
      
      <div v-if="!hasActiveSubscription" class="subscription-options">
        <div v-for="product in products" :key="product.id" class="subscription-card">
          <h3>{{ getFrequencyLabel(product.id) }}</h3>
          <p class="price">{{ product.price }}</p>
          <button 
            @click="handlePurchase(getFrequencyFromId(product.id))"
            :disabled="purchasing"
            class="purchase-button"
          >
            {{ $t('subscription.purchase') }}
          </button>
        </div>
      </div>
      
      <div v-else class="active-subscription">
        <h3>{{ $t('subscription.active') }}</h3>
        <p>{{ $t('subscription.expires', { date: formatDate(activeSubscription.date_fin) }) }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import InAppPurchaseService from '../services/InAppPurchaseService';

export default {
  name: 'SubscriptionManager',
  
  data() {
    return {
      loading: true,
      error: null,
      products: [],
      purchasing: false,
      hasActiveSubscription: false,
      activeSubscription: null,
      isMobile: false
    };
  },
  
  async created() {
    try {
      // Vérifier si nous sommes sur mobile
      this.isMobile = window.cordova !== undefined;
      
      if (this.isMobile) {
        await this.initialize();
        await this.loadProducts();
      }
      await this.checkActiveSubscription();
    } catch (error) {
      this.error = error.message;
    } finally {
      this.loading = false;
    }
  },
  
  methods: {
    async initialize() {
      const initialized = await InAppPurchaseService.initialize();
      if (!initialized) {
        throw new Error(this.$t('subscription.init_error'));
      }
    },
    
    async loadProducts() {
      if (!this.isMobile) {
        this.products = [];
        return;
      }
      this.products = await InAppPurchaseService.getProducts();
    },
    
    async checkActiveSubscription() {
      try {
        const response = await fetch('/api/abonnements/status');
        const data = await response.json();
        this.hasActiveSubscription = data.active;
        this.activeSubscription = data.subscription;
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'abonnement:', error);
      }
    },
    
    async handlePurchase(frequence) {
      if (!this.isMobile) {
        this.error = this.$t('subscription.mobile_only');
        return;
      }

      this.purchasing = true;
      try {
        const purchase = await InAppPurchaseService.purchaseSubscription(frequence);
        await this.checkActiveSubscription();
        this.$emit('subscription-updated');
      } catch (error) {
        this.error = error.message;
      } finally {
        this.purchasing = false;
      }
    },
    
    getFrequencyFromId(productId) {
      const frequencies = {
        'mensuel': 'mensuel',
        'trimestriel': 'trimestriel',
        'semestriel': 'semestriel',
        'annuel': 'annuel'
      };
      
      for (const [key, value] of Object.entries(frequencies)) {
        if (productId.includes(key)) {
          return value;
        }
      }
      return null;
    },
    
    getFrequencyLabel(productId) {
      const labels = {
        'mensuel': this.$t('subscription.monthly'),
        'trimestriel': this.$t('subscription.quarterly'),
        'semestriel': this.$t('subscription.semiannual'),
        'annuel': this.$t('subscription.annual')
      };
      
      const frequence = this.getFrequencyFromId(productId);
      return labels[frequence] || frequence;
    },
    
    formatDate(date) {
      return new Date(date).toLocaleDateString(this.$i18n.locale);
    }
  }
};
</script>

<style scoped>
.subscription-manager {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.loading, .error {
  text-align: center;
  padding: 20px;
}

.error {
  color: #ff4444;
}

.subscription-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.subscription-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.subscription-card h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.price {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin: 10px 0;
}

.purchase-button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.purchase-button:hover {
  background-color: #3aa876;
}

.purchase-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.active-subscription {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-top: 20px;
}
</style> 