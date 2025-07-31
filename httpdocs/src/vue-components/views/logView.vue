<template>
  <div class="log-view">
    <header-icon full-header="true"></header-icon>
    <div class="log-container">
      <h1>Logs</h1>
      <textarea readonly class="log-textarea" v-model="logs"></textarea>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LogView',
  data() {
    return {
      logs: ''
    };
  },
  mounted() {
    this.fetchLogs();
  },
  methods: {
    fetchLogs() {
      // Exemple de récupération des logs
      this.logs = localStorage.getItem('appLogs') || 'Aucun log disponible.';
    }
  }
};
</script>

<style scoped>
.log-view {
  padding: 20px;
}

.log-container {
  margin-top: 20px;
}

.log-textarea {
  width: 100%;
  height: 400px;
  resize: none;
  font-family: monospace;
}
</style>
