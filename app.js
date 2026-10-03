// State Management
let currentFile = null;
let currentSummaryText = "";

// DOM Elements
const dropZone = document.getElementById("drop-zone");
const dropPrompt = document.getElementById("drop-prompt");
const fileInput = document.getElementById("file-input");
const filePreviewContainer = document.getElementById("file-preview-container");
const previewThumbnail = document.getElementById("preview-thumbnail");
const fileNameLabel = document.getElementById("file-name");
const fileSizeLabel = document.getElementById("file-size");
const removeFileBtn = document.getElementById("remove-file-btn");

const modelSelect = document.getElementById("model-select");
const generateSummaryBtn = document.getElementById("generate-summary-btn");
const btnSpinner = document.getElementById("btn-spinner");
const btnLabel = document.getElementById("btn-label");

const summarySkeleton = document.getElementById("summary-skeleton");
const summaryContent = document.getElementById("summary-content");
const copySummaryBtn = document.getElementById("copy-summary-btn");
const downloadSummaryBtn = document.getElementById("download-summary-btn");

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");
const chatMessages = document.getElementById("chat-messages");
const clearChatBtn = document.getElementById("clear-chat-btn");

// API Modal Elements
const openSettingsBtn = document.getElementById("open-settings-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const apiModal = document.getElementById("api-modal");
const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  apiKeyInput.value = CONFIG.getApiKey();

  // If no API key is present, prompt the user smoothly
  if (!CONFIG.hasApiKey()) {
    openModal();
  }
});

// Modal Logic
function openModal() {
  apiKeyInput.value = CONFIG.getApiKey();
  apiModal.classList.remove("hidden");
}

function closeModal() {
  apiModal.classList.add("hidden");
}

openSettingsBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
apiModal.addEventListener("click", (e) => {
  if (e.target === apiModal) closeModal();
});

saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  CONFIG.setApiKey(key);
  closeModal();
});

// File Handling & Drag-and-Drop
dropZone.addEventListener("click", (e) => {
  if (e.target.closest("#remove-file-btn")) return;
  fileInput.click();
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-active");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-active");
  });
});

dropZone.addEventListener("drop", (e) => {
  const files = e.dataTransfer.files;
  if (files && files[0]) {
    handleFileSelected(files[0]);
  }
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) {
    handleFileSelected(e.target.files[0]);
  }
});

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function handleFileSelected(file) {
  currentFile = file;
  fileNameLabel.textContent = file.name;
  fileSizeLabel.textContent = formatFileSize(file.size);

  // Set thumbnail indicator
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewThumbnail.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
    };
    reader.readAsDataURL(file);
  } else if (file.type === "application/pdf") {
    previewThumbnail.innerHTML = `<span class="text-red-500 font-bold">PDF</span>`;
  } else {
    previewThumbnail.innerHTML = `<span class="text-warm-accent font-bold">TXT</span>`;
  }

  dropPrompt.classList.add("hidden");
  filePreviewContainer.classList.remove("hidden");
  generateSummaryBtn.disabled = false;
}

removeFileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  currentFile = null;
  fileInput.value = "";
  window.geminiService.clearDocument();

  dropPrompt.classList.remove("hidden");
  filePreviewContainer.classList.add("hidden");
  previewThumbnail.innerHTML = "DOC";
  generateSummaryBtn.disabled = true;

  // Disable Chat until a new file is summarized
  chatInput.disabled = true;
  chatSendBtn.disabled = true;
});

// Convert File to Base64 (stripping the data url prefix for Gemini inlineData)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Generate Summary
generateSummaryBtn.addEventListener("click", async () => {
  if (!currentFile) return;

  if (!CONFIG.hasApiKey()) {
    openModal();
    return;
  }

  // Update UI Loading State
  generateSummaryBtn.disabled = true;
  btnSpinner.classList.remove("hidden");
  btnLabel.textContent = "جاري قراءة وتحليل المستند...";
  summarySkeleton.classList.remove("hidden");
  summaryContent.innerHTML = "";

  try {
    const base64Data = await fileToBase64(currentFile);
    let mimeType = currentFile.type;
    if (!mimeType) {
      if (currentFile.name.endsWith(".pdf")) mimeType = "application/pdf";
      else if (currentFile.name.endsWith(".txt")) mimeType = "text/plain";
      else mimeType = "application/octet-stream";
    }

    window.geminiService.setDocument(base64Data, mimeType);

    const selectedModel = modelSelect.value;
    const summaryMarkdown = await window.geminiService.generateSummary(selectedModel);

    currentSummaryText = summaryMarkdown;
    summaryContent.innerHTML = marked.parse(summaryMarkdown);

    // Enable interactive chat
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    appendBotMessage("لقد انتهيت من قراءة وتلخيص المستند! يمكنك الآن سؤالي عن أي جزئية، أو طلبي لإعادة صياغة وتعديل أقسام معينة.");

  } catch (error) {
    summaryContent.innerHTML = `
      <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 text-xs leading-relaxed">
        <strong>حدث خطأ أثناء المعالجة:</strong> ${error.message}
      </div>
    `;
  } finally {
    generateSummaryBtn.disabled = false;
    btnSpinner.classList.add("hidden");
    btnLabel.textContent = "إعادة تحليل وتلخيص المستند";
    summarySkeleton.classList.add("hidden");
  }
});

// Copy Summary Action
copySummaryBtn.addEventListener("click", async () => {
  if (!currentSummaryText) return;
  try {
    await navigator.clipboard.writeText(currentSummaryText);
    const originalText = copySummaryBtn.querySelector("span").textContent;
    copySummaryBtn.querySelector("span").textContent = "تم النسخ!";
    setTimeout(() => {
      copySummaryBtn.querySelector("span").textContent = originalText;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy: ", err);
  }
});

// Download Summary Action
downloadSummaryBtn.addEventListener("click", () => {
  if (!currentSummaryText) return;
  const blob = new Blob([currentSummaryText], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `summary-${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Interactive Chat Logic
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = "";
  appendUserMessage(text);

  // Disable input while generating response
  chatInput.disabled = true;
  chatSendBtn.disabled = true;

  const thinkingBubble = appendBotMessage("جاري التفكير وصياغة الرد...", true);

  try {
    const selectedModel = modelSelect.value;
    const response = await window.geminiService.sendChatMessage(text, selectedModel);
    thinkingBubble.remove();
    appendBotMessage(response);
  } catch (error) {
    thinkingBubble.remove();
    appendBotMessage(`خطأ: ${error.message}`);
  } finally {
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.focus();
  }
});

function appendUserMessage(text) {
  const msg = document.createElement("div");
  msg.className = "self-end max-w-[85%] bg-warm-ink text-warm-bg rounded-2xl rounded-tl-none p-3.5 text-xs sm:text-sm leading-relaxed";
  msg.textContent = text;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendBotMessage(text, isTemporary = false) {
  const msg = document.createElement("div");
  msg.className = "self-start max-w-[85%] bg-warm-bg border border-warm-border/60 rounded-2xl rounded-tr-none p-3.5 text-xs sm:text-sm text-warm-ink leading-relaxed markdown-body";
  if (isTemporary) {
    msg.textContent = text;
    msg.classList.add("text-warm-muted", "italic");
  } else {
    msg.innerHTML = marked.parse(text);
  }
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msg;
}

clearChatBtn.addEventListener("click", () => {
  window.geminiService.clearHistory();
  chatMessages.innerHTML = `
    <div class="self-start max-w-[85%] bg-warm-bg border border-warm-border/60 rounded-2xl rounded-tr-none p-3.5 text-xs sm:text-sm text-warm-ink leading-relaxed">
      تم مسح سجل المحادثة. يمكنك بدء طرح أسئلة جديدة حول المستند المرفوع.
    </div>
  `;
});
