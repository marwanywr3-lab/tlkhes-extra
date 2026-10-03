class GeminiDocumentService {
  constructor() {
    this.conversationHistory = [];
    this.currentDocumentPart = null;
  }

  setDocument(base64Data, mimeType) {
    this.currentDocumentPart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    };
    this.conversationHistory = [];
  }

  clearDocument() {
    this.currentDocumentPart = null;
    this.conversationHistory = [];
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  resolveModel(modelName) {
    // إجبار الكود على منع استدعاء أي نموذج قديم أو معطل تلقائياً
    if (!modelName || modelName.includes("2.5")) {
      return "gemini-3.8-flash";
    }
    return modelName;
  }

  async generateSummary(modelName = CONFIG.DEFAULT_MODEL) {
    const apiKey = CONFIG.getApiKey();
    if (!apiKey) {
      throw new Error("يرجى إدخال مفتاح الـ API أولاً من زر الإعدادات أعلى الصفحة.");
    }

    if (!this.currentDocumentPart) {
      throw new Error("لم يتم تحديد أي مستند للتحليل.");
    }

    const activeModel = this.resolveModel(modelName);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

    const promptText = `
أنت خبير محترف ومحلل دقيق للمستندات والبيانات.
المطلوب منك مراجعة هذا المستند وتحليله بعناية فائقة، ثم تقديم ملخص تنفيذي احترافي باللغة العربية بتنسيق Markdown منسق جداً، ويحتوي على:
1. **نظرة عامة / الغرض من المستند:** سطرين يحددان ماهية المحتوى والهدف منه.
2. **أبرز النقاط والمحاور الرئيسية:** نقاط واضحة ودقيقة ومباشرة.
3. **أهم الأرقام أو القرارات أو التواريخ (إن وُجدت):** رصد دقيق للبيانات المؤثرة.
4. **الخلاصة والتوصيات:** خاتمة موجزة وعملية.

حافظ على أسلوب واضح، موضوعي، ومرتب يسهل قراءته مباشرة.
`;

    const userParts = [this.currentDocumentPart, { text: promptText }];

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: userParts
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 3000
      }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || `فشل الاتصال بالخدمة (${response.status})`;
      throw new Error(message);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const generatedText = candidate?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("لم يتم استلام أي نص صالح من النموذج. يرجى المحاولة مجدداً.");
    }

    this.conversationHistory = [
      {
        role: "user",
        parts: userParts
      },
      {
        role: "model",
        parts: [{ text: generatedText }]
      }
    ];

    return generatedText;
  }

  async sendChatMessage(userMessage, modelName = CONFIG.DEFAULT_MODEL) {
    const apiKey = CONFIG.getApiKey();
    if (!apiKey) {
      throw new Error("يرجى إدخال مفتاح الـ API أولاً من زر الإعدادات.");
    }

    if (!userMessage || !userMessage.trim()) {
      return "";
    }

    const activeModel = this.resolveModel(modelName);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

    const newHistory = [
      ...this.conversationHistory,
      {
        role: "user",
        parts: [{ text: userMessage.trim() }]
      }
    ];

    const requestBody = {
      contents: newHistory,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2500
      }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || `خطأ أثناء إرسال الرسالة (${response.status})`;
      throw new Error(message);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const replyText = candidate?.content?.parts?.[0]?.text;

    if (!replyText) {
      throw new Error("تعذر استخراج إجابة من المساعد الذكي.");
    }

    this.conversationHistory.push({
      role: "user",
      parts: [{ text: userMessage.trim() }]
    });

    this.conversationHistory.push({
      role: "model",
      parts: [{ text: replyText }]
    });

    return replyText;
  }
}

window.geminiService = new GeminiDocumentService();
