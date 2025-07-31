const logService = {
  storeToLog(message) {
    const logs = JSON.parse(localStorage.getItem('appLogs') || '[]');
    logs.push({ timestamp: new Date().toISOString(), message });
    localStorage.setItem('appLogs', JSON.stringify(logs));
  },

  getLogs() {
    return JSON.parse(localStorage.getItem('appLogs') || '[]');
  }
};

export default logService;
