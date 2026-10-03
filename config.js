const CONFIG = {
  STORAGE_KEY: "gemini_api_key",
  DEFAULT_MODEL: "gemini-2.5-flash",
  AVAILABLE_MODELS: {
    "gemini-2.5-flash": {
      name: "Gemini 2.5 Flash",
      endpointId: "gemini-2.5-flash"
    },
    "gemini-2.5-flash-lite": {
      name: "Gemini 2.5 Flash Lite",
      endpointId: "gemini-2.5-flash-lite"
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
