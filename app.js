// State Management
let currentFile = null;
let currentSummaryText = "";
let currentActiveSummaryId = null;

const SUMMARIES_STORAGE_KEY = "document_summaries_dashboard_v1";

// Views
const homeView = document.getElementById("home-view");
const workspaceView = document.getElementById("workspace-view");

// Navigation & Actions
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
const workspaceUploadBox = document.getElementById("workspace-upload-box");
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

// App Initialization
document.addEventListener("DOMContentLoaded", () => {
  apiKeyInput.value = CONFIG.getApiKey();

  if (!CONFIG.hasApiKey()) {
    openModal();
  }

  showHomeDashboard();
});

// View Navigation Functions
function showHomeDashboard() {
  workspaceView.classList.add("hidden");
  homeView.classList.remove("hidden");
  renderDashboardCards();
}

function showWorkspace() {
  homeView.classList.add("hidden");
  workspaceView.classList.remove("hidden");
}

brandHomeBtn.addEventListener("click", showHomeDashboard);
backToHomeBtn.addEventListener("click", showHomeDashboard);

// "Create New Summary" Action
function startNewSummaryFlow() {
  currentActiveSummaryId = null;
  currentSummaryText = "";
  currentFile = null;
  fileInput.value = "";
  window.geminiService.clearDocument();

  workspaceDocTitle.textContent = "إنشاء ملخص جديد";
  workspaceUploadBox.classList.remove("hidden");

  // Reset upload previews
  dropPrompt.classList.remove("hidden");
  filePreviewContainer.classList.add("hidden");
  previewThumbnail.innerHTML = "DOC";
  generateSummaryBtn.disabled = true;

  // Clear workspace summary content
  summaryContent.innerHTML = `
    <div class="flex flex-col items-center justify-center text-center py-20 text-warm-muted">
      <p>قم بسحب أو رفع مستند بالأعلى واضغط على زر التحليل لبدء توليد الملخص.</p>
    </div>
  `;

  // Reset chat
  window.geminiService.clearHistory();
  chatMessages.innerHTML = `
    <div class="self-start max-w-[85%] bg-warm-bg border border-warm-border/60 rounded-2xl rounded-tr-none p-3.5 text-warm-ink leading-relaxed">
      أهلاً بك! بمجرد رفع وتلخيص هذا المستند، سأكون جاهزاً للإجابة عن أسئلتك وتعديلاته.
    </div>
  `;
  chatInput.disabled = true;
  chatSendBtn.disabled = true;

  showWorkspace();
}

createNewBtn.addEventListener("click", startNewSummaryFlow);
emptyCreateBtn.addEventListener("click", startNewSummaryFlow);

// LocalStorage Helper Functions
function getStoredSummaries() {
  try {
    const raw = localStorage.getItem(SUMMARIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error reading storage:", e);
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

// Render Home Dashboard Cards
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
    // Generate clean text snippet without markdown symbols
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
      openExistingSummary(item);
    });

    const delBtn = card.querySelector(".delete-card-btn");
    delBtn.addEventListener("click", (e) => {
      deleteSummary(item.id, e);
    });

    summariesGrid.appendChild(card);
  });
}

// Open and Inspect Existing Summary in Workspace
function openExistingSummary(item) {
  currentActiveSummaryId = item.id;
  currentSummaryText = item.content;

  workspaceDocTitle.textContent = item.title;
  // Hide upload form when viewing existing summary to keep interface clean
  workspaceUploadBox.classList.add("hidden");

  summaryContent.innerHTML = marked.parse(item.content);

  // Re-enable chat focused on this specific document
  window.geminiService.clearHistory();
  chatMessages.innerHTML = `
    <div class="self-start max-w-[85%] bg-warm-bg border border-warm-border/60 rounded-2xl rounded-tr-none p-3.5 text-xs sm:text-sm text-warm-ink leading-relaxed">
      أنت الآن تستعرض ملخص: <strong>${item.title}</strong>. يمكنك طرح أي سؤال حول محتواه أو طلب إعادة صياغة أي فقرة فيه!
    </div>
  `;
  chatInput.disabled = false;
  chatSendBtn.disabled = false;

  showWorkspace();
}

// File Drag & Drop Handling
dropZone.addEventListener("click", (e) => {
  if (e.target.closest("#remove-file-btn")) return;
  fileInput.click();
});

["dragenter", "dragover"].forEach((name) => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-active");
  });
});

["dragleave", "drop"].forEach((name) => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-active");
  });
});

dropZone.addEventListener("drop", (e) => {
  const files = e.dataTransfer.files;
  if (files && files[0]) handleFileSelected(files[0]);
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) handleFileSelected(e.target.files[0]);
});

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function handleFileSelected(file) {
  const maxBytes = 20 * 1024 * 1024;
  if (file.size > maxBytes) {
    alert("حجم الملف يتجاوز 20MB. يرجى اختيار ملف أصغر لتفادي تجاوز حد الإرسال المباشر بالمتصفح.");
    return;
  }

  currentFile = file;
  fileNameLabel.textContent = file.name;
  fileSizeLabel.textContent = formatFileSize(file.size);

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

// Generate, Save & Add to Home Dashboard
generateSummaryBtn.addEventListener("click", async () => {
  if (!currentFile) return;

  if (!CONFIG.hasApiKey()) {
    openModal();
    return;
  }

  generateSummaryBtn.disabled = true;
  btnSpinner.classList.remove("hidden");
  btnLabel.textContent = "جاري قراءة وتحليل المستند وحفظه...";
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

    // Save summary permanently to Home Dashboard
    const newSummaryId = "sum_" + Date.now();
    const formattedDate = new Date().toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });

    const newSummaryItem = {
      id: newSummaryId,
      title: currentFile.name,
      content: summaryMarkdown,
      date: formattedDate
    };

    currentActiveSummaryId = newSummaryId;
    workspaceDocTitle.textContent = currentFile.name;
    saveSummaryItem(newSummaryItem);

    // Enable chat
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    appendBotMessage(`تم بنجاح تلخيص **${currentFile.name}** وحفظه في صفحتك الرئيسية! يمكنك الآن توجيه أي أسئلة عليه أو الضغط على "العودة للرئيسية" لمشاهدة جميع ملخصاتك.`);

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

// Copy & Download
copySummaryBtn.addEventListener("click", async () => {
  if (!currentSummaryText) return;
  try {
    await navigator.clipboard.writeText(currentSummaryText);
    const span = copySummaryBtn.querySelector("span");
    const prev = span.textContent;
    span.textContent = "تم النسخ!";
    setTimeout(() => { span.textContent = prev; }, 2000);
  } catch (err) {
    console.error("Copy failed:", err);
  }
});

downloadSummaryBtn.addEventListener("click", () => {
  if (!currentSummaryText) return;
  const blob = new Blob([currentSummaryText], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${workspaceDocTitle.textContent}-summary.md`;
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
      تم تفريغ المحادثة لهذا الملخص.
    </div>
  `;
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
