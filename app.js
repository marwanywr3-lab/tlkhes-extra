// State Management
let selectedUploadFile = null;
let currentActiveSummary = null;

const SUMMARIES_STORAGE_KEY = "document_summaries_dashboard_v2";

// Views
const homeView = document.getElementById("home-view");
const workspaceView = document.getElementById("workspace-view");

// Navigation
const brandHomeBtn = document.getElementById("brand-home-btn");
const createNewBtn = document.getElementById("create-new-btn");
const emptyCreateBtn = document.getElementById("empty-create-btn");
const backToHomeBtn = document.getElementById("back-to-home-btn");
const clearAllBtn = document.getElementById("clear-all-btn");

// Dashboard Elements
const summariesGrid = document.getElementById("summaries-grid");
const emptyState = document.getElementById("empty-state");
const summariesTotalBadge = document.getElementById("summaries-total-badge");

// Workspace Elements
const workspaceDocTitle = document.getElementById("workspace-doc-title");
const summaryContent = document.getElementById("summary-content");
const copySummaryBtn = document.getElementById("copy-summary-btn");
const downloadSummaryBtn = document.getElementById("download-summary-btn");

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");
const chatMessages = document.getElementById("chat-messages");
const clearChatBtn = document.getElementById("clear-chat-btn");
const modelSelect = document.getElementById("model-select");

// Upload Modal Elements
const uploadModal = document.getElementById("upload-modal");
const closeUploadModalBtn = document.getElementById("close-upload-modal-btn");
const modalDropZone = document.getElementById("modal-drop-zone");
const modalFileInput = document.getElementById("modal-file-input");
const modalDropPrompt = document.getElementById("modal-drop-prompt");
const modalFilePreview = document.getElementById("modal-file-preview");
const modalFileName = document.getElementById("modal-file-name");
const modalFileSize = document.getElementById("modal-file-size");
const modalRemoveFileBtn = document.getElementById("modal-remove-file-btn");
const modalStartSummaryBtn = document.getElementById("modal-start-summary-btn");
const modalSpinner = document.getElementById("modal-spinner");
const modalBtnLabel = document.getElementById("modal-btn-label");
const modalErrorBox = document.getElementById("modal-error-box");

// Settings Modal Elements
const apiModal = document.getElementById("api-modal");
const openSettingsBtn = document.getElementById("open-settings-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");

// App Startup
document.addEventListener("DOMContentLoaded", () => {
  apiKeyInput.value = CONFIG.getApiKey();

  if (!CONFIG.hasApiKey()) {
    openSettingsModal();
  }

  renderDashboardCards();
});

// View Switching
function showHomeDashboard() {
  workspaceView.classList.add("hidden");
  homeView.classList.remove("hidden");
  renderDashboardCards();
}

function showWorkspace(item) {
  currentActiveSummary = item;
  homeView.classList.add("hidden");
  workspaceView.classList.remove("hidden");

  workspaceDocTitle.textContent = item.title;
  summaryContent.innerHTML = marked.parse(item.content);

  // Initialize Chat context
  window.geminiService.clearHistory();
  chatMessages.innerHTML = `
    <div class="self-start max-w-[85%] bg-warm-bg border border-warm-border/60 rounded-2xl rounded-tr-none p-3.5 text-warm-ink leading-relaxed">
      أنت الآن تستعرض ملخص: <strong>${item.title}</strong>. يمكنك مناقشة أي معلومة، أو سؤالي عن جزئيات محددة، أو طلب إعادة صياغة لنقاط معينة.
    </div>
  `;
}

brandHomeBtn.addEventListener("click", showHomeDashboard);
backToHomeBtn.addEventListener("click", showHomeDashboard);

// Upload Modal Logic
function openUploadModal() {
  resetUploadModal();
  uploadModal.classList.remove("hidden");
}

function closeUploadModal() {
  uploadModal.classList.add("hidden");
  resetUploadModal();
}

function resetUploadModal() {
  selectedUploadFile = null;
  modalFileInput.value = "";
  modalDropPrompt.classList.remove("hidden");
  modalFilePreview.classList.add("hidden");
  modalStartSummaryBtn.disabled = true;
  modalSpinner.classList.add("hidden");
  modalBtnLabel.textContent = "بدء التحليل وحفظ الملخص";
  modalErrorBox.classList.add("hidden");
  modalErrorBox.textContent = "";
}

createNewBtn.addEventListener("click", openUploadModal);
emptyCreateBtn.addEventListener("click", openUploadModal);
closeUploadModalBtn.addEventListener("click", closeUploadModal);
uploadModal.addEventListener("click", (e) => {
  if (e.target === uploadModal) closeUploadModal();
});

// Modal File Selection
modalDropZone.addEventListener("click", (e) => {
  if (e.target.closest("#modal-remove-file-btn")) return;
  modalFileInput.click();
});

["dragenter", "dragover"].forEach((evt) => {
  modalDropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    modalDropZone.classList.add("drag-active");
  });
});

["dragleave", "drop"].forEach((evt) => {
  modalDropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    modalDropZone.classList.remove("drag-active");
  });
});

modalDropZone.addEventListener("drop", (e) => {
  const files = e.dataTransfer.files;
  if (files && files[0]) handleModalFile(files[0]);
});

modalFileInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) handleModalFile(e.target.files[0]);
});

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function handleModalFile(file) {
  const maxBytes = 20 * 1024 * 1024; // 20MB limit
  if (file.size > maxBytes) {
    alert("حجم الملف أكبر من 20MB. يرجى اختيار ملف أصغر حجماً لتفادي رفض الطلب من المتصفح.");
    return;
  }

  selectedUploadFile = file;
  modalFileName.textContent = file.name;
  modalFileSize.textContent = formatFileSize(file.size);

  modalDropPrompt.classList.add("hidden");
  modalFilePreview.classList.remove("hidden");
  modalStartSummaryBtn.disabled = false;
  modalErrorBox.classList.add("hidden");
}

modalRemoveFileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  resetUploadModal();
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Generate, Save & Automatically Open in Workspace
modalStartSummaryBtn.addEventListener("click", async () => {
  if (!selectedUploadFile) return;

  if (!CONFIG.hasApiKey()) {
    openSettingsModal();
    return;
  }

  modalStartSummaryBtn.disabled = true;
  modalSpinner.classList.remove("hidden");
  modalBtnLabel.textContent = "جاري قراءة وتلخيص المستند...";
  modalErrorBox.classList.add("hidden");

  try {
    const base64Data = await fileToBase64(selectedUploadFile);
    let mimeType = selectedUploadFile.type;
    if (!mimeType) {
      if (selectedUploadFile.name.endsWith(".pdf")) mimeType = "application/pdf";
      else if (selectedUploadFile.name.endsWith(".txt")) mimeType = "text/plain";
      else mimeType = "application/octet-stream";
    }

    window.geminiService.setDocument(base64Data, mimeType);

    const chosenModel = modelSelect.value;
    const summaryMarkdown = await window.geminiService.generateSummary(chosenModel);

    // Save as new summary item
    const newSummaryItem = {
      id: "sum_" + Date.now(),
      title: selectedUploadFile.name,
      content: summaryMarkdown,
      date: new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })
    };

    saveSummaryItem(newSummaryItem);

    // Close modal and directly open this new summary in workspace
    closeUploadModal();
    showWorkspace(newSummaryItem);

  } catch (error) {
    modalErrorBox.textContent = "حدث خطأ: " + error.message;
    modalErrorBox.classList.remove("hidden");
    modalStartSummaryBtn.disabled = false;
    modalSpinner.classList.add("hidden");
    modalBtnLabel.textContent = "إعادة المحاولة";
  }
});

// Storage Operations
function getStoredSummaries() {
  try {
    const raw = localStorage.getItem(SUMMARIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Storage read error:", e);
    return [];
  }
}

function saveSummaryItem(item) {
  const list = getStoredSummaries();
  list.unshift(item); // Newest first
  localStorage.setItem(SUMMARIES_STORAGE_KEY, JSON.stringify(list));
}

function deleteSummary(id, e) {
  if (e) e.stopPropagation();
  let list = getStoredSummaries();
  list = list.filter((s) => s.id !== id);
  localStorage.setItem(SUMMARIES_STORAGE_KEY, JSON.stringify(list));
  renderDashboardCards();
}

clearAllBtn.addEventListener("click", () => {
  if (!confirm("هل أنت متأكد من مسح جميع الملخصات المحفوظة؟")) return;
  localStorage.removeItem(SUMMARIES_STORAGE_KEY);
  renderDashboardCards();
});

// Render Home Cards
function renderDashboardCards() {
  const summaries = getStoredSummaries();
  summariesTotalBadge.textContent = summaries.length;

  if (summaries.length === 0) {
    summariesGrid.innerHTML = "";
    emptyState.classList.remove("hidden");
    clearAllBtn.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  clearAllBtn.classList.remove("hidden");
  summariesGrid.innerHTML = "";

  summaries.forEach((item) => {
    const cleanSnippet = item.content
      .replace(/[#*`_~>-]/g, "")
      .replace(/\n+/g, " ")
      .slice(0, 160) + "...";

    const card = document.createElement("div");
    card.className = "bg-warm-surface border border-warm-border/80 hover:border-warm-accent/60 rounded-3xl p-5 shadow-sm hover:shadow transition flex flex-col justify-between cursor-pointer group";

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2 overflow-hidden">
            <div class="w-8 h-8 rounded-lg bg-warm-accent/10 border border-warm-accent/20 flex items-center justify-center text-warm-accent shrink-0 text-xs font-bold">
              ✦
            </div>
            <h4 class="font-bold text-sm text-warm-ink truncate group-hover:text-warm-accent transition">${item.title}</h4>
          </div>
          <button class="delete-card-btn p-1.5 text-warm-muted hover:text-red-500 rounded-lg hover:bg-warm-border/30 transition shrink-0" title="حذف الملخص">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
        <p class="text-xs text-warm-muted leading-relaxed line-clamp-4 mb-4">${cleanSnippet}</p>
      </div>

      <div class="flex items-center justify-between pt-3 border-t border-warm-border/50 text-[11px] text-warm-muted">
        <span>${item.date}</span>
        <span class="font-semibold text-warm-ink flex items-center gap-1 group-hover:translate-x-[-2px] transition">
          فتح ومحادثة ←
        </span>
      </div>
    `;

    card.addEventListener("click", () => {
      showWorkspace(item);
    });

    const delBtn = card.querySelector(".delete-card-btn");
    delBtn.addEventListener("click", (e) => {
      deleteSummary(item.id, e);
    });

    summariesGrid.appendChild(card);
  });
}

// Copy & Download Actions
copySummaryBtn.addEventListener("click", async () => {
  if (!currentActiveSummary) return;
  try {
    await navigator.clipboard.writeText(currentActiveSummary.content);
    const span = copySummaryBtn.querySelector("span");
    const prev = span.textContent;
    span.textContent = "تم النسخ!";
    setTimeout(() => { span.textContent = prev; }, 2000);
  } catch (err) {
    console.error("Copy failed:", err);
  }
});

downloadSummaryBtn.addEventListener("click", () => {
  if (!currentActiveSummary) return;
  const blob = new Blob([currentActiveSummary.content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentActiveSummary.title}-summary.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Interactive Chat
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = "";
  appendUserMessage(text);

  chatInput.disabled = true;
  chatSendBtn.disabled = true;

  const thinkingBubble = appendBotMessage("جاري التفكير وصياغة الرد...", true);

  try {
    const chosenModel = modelSelect.value;
    const response = await window.geminiService.sendChatMessage(text, chosenModel);
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
      تم تفريغ المحادثة لهذا الملخص.
    </div>
  `;
});

// Settings Modal
function openSettingsModal() {
  apiKeyInput.value = CONFIG.getApiKey();
  apiModal.classList.remove("hidden");
}

function closeSettingsModal() {
  apiModal.classList.add("hidden");
}

openSettingsBtn.addEventListener("click", openSettingsModal);
closeModalBtn.addEventListener("click", closeSettingsModal);
apiModal.addEventListener("click", (e) => {
  if (e.target === apiModal) closeSettingsModal();
});

saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  CONFIG.setApiKey(key);
  closeSettingsModal();
});
