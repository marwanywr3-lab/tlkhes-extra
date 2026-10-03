const CONFIG = {
  STORAGE_KEY: "gemini_api_key",
  DEFAULT_MODEL: "gemini-3.8-flash",
  AVAILABLE_MODELS: {
    "gemini-3.8-flash": {
      name: "Gemini 3.8 Flash",
      endpointId: "gemini-3.8-flash"
    },
    "gemini-3.5-flash-lite": {
      name: "Gemini 3.5 Flash Lite",
      endpointId: "gemini-3.5-flash-lite"
    }
  },

  getApiKey() {
    return localStorage.getItem(this.STORAGE_KEY) || "";
  },

  setApiKey(key) {
    const trimmed = (key || "").trim();
    if (trimmed) {
      localStorage.setItem(this.STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  },

  hasApiKey() {
    return Boolean(this.getApiKey());
  }
};
