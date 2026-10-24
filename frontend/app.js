// Hisab Kitab — Frontend Client
const API_BASE = window.location.origin.includes(':8000')
  ? window.location.origin
  : 'http://localhost:8000';

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let currentBillId = null;

// Speech synthesis helper
function speakMessage(text) {
  if (!('speechSynthesis' in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
      const val = langSelect.value;
      const bcpMap = {
        kn: 'kn-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN',
        gu: 'gu-IN', bn: 'bn-IN', ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-IN', en: 'en-IN',
      };
      utterance.lang = bcpMap[val] || 'en-IN';
    }
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

// Translations dictionary for static frontend pages
const STATIC_TRANSLATIONS = {
  en: {
    navNewSale: "New Sale",
    navSummary: "Summary & Stock",
    micInitial: "Tap mic & speak naturally",
    recognizedSpeech: "Recognized Speech",
    pressMicHelp: 'Press mic and say e.g. "Rice 2 kg, Sugar 1 kg"...',
    currentBill: "Current Bill",
    draft: "Draft",
    confirmSale: "✓ Confirm Sale",
    cancelBill: "✗ Cancel Bill",
    dailySummary: "Daily Sales Summary",
    today: "Today",
    totalSales: "Total Sales",
    billsCount: "Bills Count",
    topSelling: "Top Selling Items",
    currentStock: "Current Stock Inventory",
    refresh: "Refresh",
  },
  hi: {
    navNewSale: "नई बिक्री",
    navSummary: "सारांश और स्टॉक",
    micInitial: "माइक दबाएं और सामान्य रूप से बोलें",
    recognizedSpeech: "पहचाना गया भाषण",
    pressMicHelp: "माइक दबाएं और कहें उदा. '2 किलो चावल, 1 किलो चीनी'...",
    currentBill: "वर्तमान बिल",
    draft: "ड्राफ्ट",
    confirmSale: "✓ बिक्री पक्की करें",
    cancelBill: "✗ बिल रद्द करें",
    dailySummary: "दैनिक बिक्री सारांश",
    today: "आज",
    totalSales: "कुल बिक्री",
    billsCount: "बिलों की संख्या",
    topSelling: "सर्वाधिक बिकने वाला सामान",
    currentStock: "वर्तमान स्टॉक सूची",
    refresh: "रिफ़್ರೆश करें",
  },
  kn: {
    navNewSale: "ಹೊಸ ಮಾರಾಟ",
    navSummary: "ಸಾರಾಂಶ ಮತ್ತು ದಾಸ್ತಾನು",
    micInitial: "ಮೈಕ್ರೋಫೋನ್ ಒತ್ತಿ ಮಾತನಾಡಿ",
    recognizedSpeech: "ಗುರುತಿಸಲಾದ ಭಾಷಣ",
    pressMicHelp: "ಮೈಕ್ ಒತ್ತಿ ಉದಾ. 'ಅಕ್ಕಿ 2 ಕೆಜಿ, ಸಕ್ಕರೆ 1 ಕೆಜಿ' ಹೇಳಿ...",
    currentBill: "ಪ್ರಸ್ತುತ ಬಿಲ್",
    draft: "ಡ್ರಾಫ್ಟ್",
    confirmSale: "✓ ಮಾರಾಟ ದೃಢೀಕರಿಸಿ",
    cancelBill: "✗ ಬಿಲ್ ರದ್ದುಮಾಡಿ",
    dailySummary: "ದೈನಂದಿನ ಮಾರಾಟ ಸಾರಾಂಶ",
    today: "ಇಂದು",
    totalSales: "ಒಟ್ಟು ಮಾರಾಟ",
    billsCount: "ಬಿಲ್‌ಗಳ ಸಂಖ್ಯೆ",
    topSelling: "ಹೆಚ್ಚು ಮಾರಾಟವಾದ ಸರಕುಗಳು",
    currentStock: "ಪ್ರಸ್ತುತ ದಾಸ್ತಾನು",
    refresh: "ನವೀಕರಿಸಿ",
  }
};

function applyStaticTranslations(lang) {
  const dict = STATIC_TRANSLATIONS[lang] || STATIC_TRANSLATIONS.en;
  try {
    document.documentElement.lang = lang;
    const navLinks = document.querySelectorAll('.nav-links .nav-link');
    if (navLinks.length >= 2) {
      navLinks[0].textContent = dict.navNewSale;
      navLinks[1].textContent = dict.navSummary;
    }
    const micStatus = document.getElementById('mic-status');
    if (micStatus && !isRecording) {
      micStatus.textContent = dict.micInitial;
    }
    const transcriptLabel = document.querySelector('.transcript-label');
    if (transcriptLabel) transcriptLabel.textContent = dict.recognizedSpeech;

    const billTitle = document.getElementById('bill-title');
    if (billTitle && !billTitle.textContent.includes('#')) billTitle.textContent = dict.currentBill;

    const billBadge = document.getElementById('bill-badge');
    if (billBadge && billBadge.textContent === 'Draft') billBadge.textContent = dict.draft;

    const confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) confirmBtn.textContent = dict.confirmSale;

    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) cancelBtn.textContent = dict.cancelBill;

    const summaryHeading = document.querySelector('main h2');
    if (summaryHeading && summaryHeading.textContent.includes('Summary')) {
      summaryHeading.textContent = dict.dailySummary;
    }
    const todayBtn = document.getElementById('today-btn');
    if (todayBtn) todayBtn.textContent = dict.today;

    const metricLabels = document.querySelectorAll('.metric-label');
    if (metricLabels.length >= 3) {
      metricLabels[0].textContent = dict.totalSales;
      metricLabels[1].textContent = dict.billsCount;
      metricLabels[2].textContent = dict.topSelling;
    }

    const refreshBtn = document.getElementById('refresh-stock-btn');
    if (refreshBtn) refreshBtn.textContent = dict.refresh;
  } catch (err) {
    console.warn("Static translation error:", err);
  }
}

// Global stock loader
async function loadStock() {
  const stockTableBody = document.getElementById('stock-table-body');
  if (!stockTableBody) return;
  try {
    const res = await fetch(`${API_BASE}/stock`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();

    stockTableBody.innerHTML = '';
    if (!items || items.length === 0) {
      stockTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No inventory loaded. Run seed.py.</td></tr>';
      return;
    }

    items.forEach((item) => {
      const isLow = item.quantity <= 10;
      const statusBadge = isLow
        ? `<span class="badge-low-stock">Low Stock</span>`
        : `<span class="badge-in-stock">In Stock</span>`;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>#${item.item_id}</td>
        <td style="font-weight: 600;">${item.name}</td>
        <td style="font-weight: 700; ${isLow ? 'color:#f87171;' : ''}">${item.quantity}</td>
        <td style="color: #94a3b8;">${item.unit}</td>
        <td>${statusBadge}</td>
      `;
      stockTableBody.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load stock:', err);
    stockTableBody.innerHTML = `<tr><td colspan="5" style="color:#ef4444;">Failed to load stock: ${err.message}</td></tr>`;
  }
}

// Initialize Sale Screen
function initSaleScreen() {
  const micBtn = document.getElementById('mic-btn');
  const micStatus = document.getElementById('mic-status');
  const transcriptText = document.getElementById('transcript-text');
  const messageBox = document.getElementById('message-box');
  const billCard = document.getElementById('bill-card');
  const billItemsBody = document.getElementById('bill-items-body');
  const billTotal = document.getElementById('bill-total');
  const confirmBtn = document.getElementById('confirm-btn');
  const languageSelect = document.getElementById('language-select');

  if (languageSelect) {
    const saved = localStorage.getItem('hisab_kitab_ui_lang') || localStorage.getItem('hisab_kitab_lang');
    if (saved && ['en', 'hi', 'kn'].includes(saved)) {
      languageSelect.value = saved;
    }
    applyStaticTranslations(languageSelect.value);

    languageSelect.addEventListener('change', () => {
      const selected = languageSelect.value;
      localStorage.setItem('hisab_kitab_ui_lang', selected);
      localStorage.setItem('hisab_kitab_lang', selected);
      applyStaticTranslations(selected);
    });
  }

  if (!micBtn) return;

  let currentBillData = null;

  function renderBill(bill) {
    if (!bill || !bill.lines || bill.lines.length === 0) {
      billCard.style.display = 'none';
      return;
    }

    currentBillId = bill.bill_id;
    currentBillData = bill;
    resetBillHeaderAndActions();

    billItemsBody.innerHTML = '';
    bill.lines.forEach((line) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight: 600;">${line.name}</td>
        <td style="text-align: right;">${line.qty} ${line.unit}</td>
        <td style="text-align: right;">₹${line.unit_price}</td>
        <td style="text-align: right; font-weight: 700;">₹${line.amount}</td>
      `;
      billItemsBody.appendChild(row);
    });

    billTotal.textContent = `₹${bill.total}`;
    billCard.style.display = 'flex';
  }

  function renderConfirmedReceipt(saleData, fallbackLines) {
    const lines = (saleData && Array.isArray(saleData.lines) && saleData.lines.length > 0)
      ? saleData.lines
      : (fallbackLines || (currentBillData ? currentBillData.lines : []));

    if (!lines || lines.length === 0) return;

    const billTitle = document.getElementById('bill-title') || document.querySelector('.bill-title');
    const billBadge = document.getElementById('bill-badge') || document.querySelector('.bill-badge');
    const billActions = document.getElementById('bill-actions') || document.querySelector('.bill-actions');
    const billTotalLabel = document.getElementById('bill-total-label') || document.querySelector('.total-label');

    if (billTitle) billTitle.textContent = saleData.sale_id ? `Confirmed Sale #${saleData.sale_id}` : 'Confirmed Sale';
    if (billBadge) {
      billBadge.textContent = 'Confirmed';
      billBadge.className = 'bill-badge badge-confirmed';
    }
    if (billTotalLabel) {
      billTotalLabel.textContent = 'Grand Total:';
    }

    billItemsBody.innerHTML = '';
    lines.forEach((line) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight: 600;">${line.name}</td>
        <td style="text-align: right;">${line.qty} ${line.unit}</td>
        <td style="text-align: right;">₹${line.unit_price}</td>
        <td style="text-align: right; font-weight: 700;">₹${line.amount}</td>
      `;
      billItemsBody.appendChild(row);
    });

    const totalVal = saleData.total != null ? saleData.total : (lines.reduce((acc, l) => acc + (l.amount || 0), 0));
    billTotal.textContent = `₹${totalVal}`;

    if (billActions) {
      billActions.innerHTML = `
        <button id="new-sale-btn" class="btn btn-confirm" style="grid-column: span 2; background-color: #059669;">
          + Start New Sale
        </button>
      `;
      const newSaleBtn = document.getElementById('new-sale-btn');
      if (newSaleBtn) {
        newSaleBtn.addEventListener('click', () => {
          currentBillId = null;
          currentBillData = null;
          billCard.style.display = 'none';
          resetBillHeaderAndActions();
        });
      }
    }

    billCard.style.display = 'flex';
  }

  function resetBillHeaderAndActions() {
    const billTitle = document.getElementById('bill-title') || document.querySelector('.bill-title');
    const billBadge = document.getElementById('bill-badge') || document.querySelector('.bill-badge');
    const billActions = document.getElementById('bill-actions') || document.querySelector('.bill-actions');
    const billTotalLabel = document.getElementById('bill-total-label') || document.querySelector('.total-label');

    if (billTitle) billTitle.textContent = 'Current Bill';
    if (billBadge) {
      billBadge.textContent = 'Draft';
      billBadge.className = 'bill-badge';
    }
    if (billTotalLabel) billTotalLabel.textContent = 'Grand Total:';

    if (billActions && !document.getElementById('confirm-btn')) {
      billActions.innerHTML = `
        <button id="confirm-btn" class="btn btn-confirm">
          ✓ Confirm Sale
        </button>
        <button id="cancel-btn" class="btn btn-cancel">
          ✗ Cancel Bill
        </button>
      `;
      attachBillActionListeners();
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];
        stream.getTracks().forEach((track) => track.stop());
        await processVoiceInput(audioBlob);
      };

      mediaRecorder.start();
      isRecording = true;
      micBtn.classList.add('recording');
      micBtn.textContent = '⏹️';
      micStatus.textContent = 'Listening... Tap again when finished.';
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      micStatus.textContent = 'Microphone error: ' + err.message;
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;
      micBtn.classList.remove('recording');
      micBtn.classList.add('processing');
      micBtn.textContent = '⏳';
      micStatus.textContent = 'Processing speech with AI...';
    }
  }

  micBtn.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  async function processVoiceInput(blob) {
    const formData = new FormData();
    formData.append('audio', blob, 'sale.webm');
    if (currentBillId) {
      formData.append('bill_id', currentBillId);
    }
    const lang = languageSelect ? languageSelect.value : 'kn';
    formData.append('language', lang);

    try {
      const response = await fetch(`${API_BASE}/voice`, {
        method: 'POST',
        body: formData,
      });

      micBtn.classList.remove('processing');
      micBtn.textContent = '🎤';
      micStatus.textContent = 'Tap microphone to speak';

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error HTTP ${response.status}`);
      }

      const data = await response.json();
      transcriptText.textContent = data.transcript || '(No transcript)';

      if (data.message) {
        messageBox.textContent = data.message;
        messageBox.style.display = 'block';
        speakMessage(data.message);
      } else {
        messageBox.style.display = 'none';
      }

      if (data.intent === 'confirm') {
        const linesBeforeClear = (data.bill && data.bill.lines) || (currentBillData ? currentBillData.lines : null);
        currentBillId = null;
        currentBillData = null;
        renderConfirmedReceipt(data.bill || data, linesBeforeClear);
        loadStock();
      } else if (data.intent === 'cancel') {
        currentBillId = null;
        currentBillData = null;
        billCard.style.display = 'none';
        resetBillHeaderAndActions();
      } else if (data.intent === 'stock_in' || data.intent === 'stock_out') {
        // Refresh inventory table immediately
        loadStock();
        // If an active sales draft was already present, keep it displayed unchanged
        if (data.bill) {
          renderBill(data.bill);
        }
      } else if (data.intent === 'query_stock' || data.intent === 'query_summary') {
        // Queries do not modify the active draft
        if (data.bill) {
          renderBill(data.bill);
        }
      } else if (data.bill) {
        renderBill(data.bill);
      }
    } catch (err) {
      micBtn.classList.remove('processing');
      micBtn.textContent = '🎤';
      micStatus.textContent = 'Error: ' + err.message;
      messageBox.textContent = 'Failed to process voice: ' + err.message;
      messageBox.style.display = 'block';
    }
  }

  function attachBillActionListeners() {
    const cBtn = document.getElementById('confirm-btn');
    const xBtn = document.getElementById('cancel-btn');

    if (cBtn) {
      cBtn.addEventListener('click', async () => {
        if (!currentBillId) return;
        try {
          cBtn.disabled = true;
          const res = await fetch(`${API_BASE}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bill_id: currentBillId }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Confirmation failed');
          }

          const data = await res.json();
          const linesBeforeClear = currentBillData ? currentBillData.lines : null;
          currentBillId = null;
          currentBillData = null;

          // Render the full confirmed bill receipt table with line items & grand total
          renderConfirmedReceipt(data, linesBeforeClear);

          let msg = `Sale #${data.sale_id} confirmed for ₹${data.total}.`;
          if (data.low_stock && data.low_stock.length > 0) {
            msg += ` Note: low stock on ${data.low_stock.join(', ')}.`;
          }
          messageBox.textContent = msg;
          messageBox.style.display = 'block';
          speakMessage(msg);
          loadStock();
        } catch (err) {
          alert('Error confirming bill: ' + err.message);
        } finally {
          cBtn.disabled = false;
        }
      });
    }

    if (xBtn) {
      xBtn.addEventListener('click', async () => {
        if (!currentBillId) return;
        try {
          xBtn.disabled = true;
          const res = await fetch(`${API_BASE}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bill_id: currentBillId }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Cancellation failed');
          }

          currentBillId = null;
          currentBillData = null;
          billCard.style.display = 'none';
          resetBillHeaderAndActions();
          messageBox.textContent = 'Sale cancelled.';
          messageBox.style.display = 'block';
          speakMessage('Sale cancelled.');
        } catch (err) {
          alert('Error cancelling bill: ' + err.message);
        } finally {
          xBtn.disabled = false;
        }
      });
    }
  }

  attachBillActionListeners();
}

function responseOk(res) {
  return res.status >= 200 && res.status < 300;
}

// Initialize Summary & Inventory Screen
async function initSummaryScreen() {
  const dateInput = document.getElementById('summary-date-input');
  const todayBtn = document.getElementById('today-btn');
  const refreshStockBtn = document.getElementById('refresh-stock-btn');
  const metricTotal = document.getElementById('metric-total');
  const metricCount = document.getElementById('metric-count');
  const metricTop = document.getElementById('metric-top');
  const lowStockSummaryContainer = document.getElementById('low-stock-summary-container');
  const lowStockList = document.getElementById('low-stock-list');
  const stockTableBody = document.getElementById('stock-table-body');

  if (!metricTotal && !stockTableBody) return;

  function getTodayString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async function loadSummary(dateStr) {
    try {
      const url = dateStr ? `${API_BASE}/summary?date=${dateStr}` : `${API_BASE}/summary`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      metricTotal.textContent = `₹${data.total || 0}`;
      metricCount.textContent = data.count || 0;
      metricTop.textContent = (data.top_items && data.top_items.length > 0)
        ? data.top_items.join(', ')
        : 'None';

      if (data.low_stock && data.low_stock.length > 0) {
        lowStockList.textContent = data.low_stock.join(', ');
        lowStockSummaryContainer.style.display = 'block';
      } else {
        lowStockSummaryContainer.style.display = 'none';
      }
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  }

  // Summary functions use top-level loadStock()

  if (dateInput) {
    dateInput.value = getTodayString();
    dateInput.addEventListener('change', () => loadSummary(dateInput.value));
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      const today = getTodayString();
      if (dateInput) dateInput.value = today;
      loadSummary(today);
    });
  }

  if (refreshStockBtn) {
    refreshStockBtn.addEventListener('click', () => {
      loadStock();
      if (dateInput) loadSummary(dateInput.value);
    });
  }

  // Bills History logic
  const billsTableBody = document.getElementById('bills-table-body');
  const billsEmptyState = document.getElementById('bills-empty-state');
  const refreshBillsBtn = document.getElementById('refresh-bills-btn');
  const detailModal = document.getElementById('bill-detail-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalBackBtn = document.getElementById('modal-back-btn');

  async function loadBillsHistory() {
    if (!billsTableBody) return;
    try {
      const res = await fetch(`${API_BASE}/bills`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const billsList = Array.isArray(data) ? data : (data.bills || []);
      billsTableBody.innerHTML = '';
      if (billsList.length === 0) {
        if (billsEmptyState) billsEmptyState.style.display = 'block';
        return;
      }
      if (billsEmptyState) billsEmptyState.style.display = 'none';
      billsList.forEach(bill => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight: 600;">#${bill.bill_number || bill.id}</td>
          <td style="color: #94a3b8;">${bill.created_at}</td>
          <td>${bill.item_count} items</td>
          <td style="text-align: right; font-weight: 700; color: #4ade80;">₹${bill.total}</td>
          <td style="text-align: right;">
            <button class="btn view-bill-btn" data-id="${bill.id}" style="padding: 4px 10px; font-size: 0.85rem; background-color: var(--primary-color); color: #fff; cursor: pointer; border-radius: 6px;">View Full Bill</button>
          </td>
        `;
        billsTableBody.appendChild(tr);
      });

      document.querySelectorAll('.view-bill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          openBillDetail(id);
        });
      });
    } catch (err) {
      console.error('Failed to load bills:', err);
    }
  }

  async function openBillDetail(id) {
    if (!detailModal) return;
    try {
      const res = await fetch(`${API_BASE}/bills/${id}`);
      if (!res.ok) throw new Error('Bill not found');
      const bill = await res.json();
      document.getElementById('modal-bill-title').textContent = `Bill Details #${bill.bill_number || bill.id}`;
      document.getElementById('modal-bill-date').textContent = bill.created_at;
      const itemsContainer = document.getElementById('modal-bill-items');
      itemsContainer.innerHTML = '';
      (bill.items || []).forEach(item => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #334155';
        row.innerHTML = `
          <td style="padding: 8px; color: #f8fafc; font-weight: 500;">${item.name}</td>
          <td style="padding: 8px; text-align: right; color: #cbd5e1;">${item.quantity} ${item.unit}</td>
          <td style="padding: 8px; text-align: right; color: #cbd5e1;">₹${item.unit_price}</td>
          <td style="padding: 8px; text-align: right; color: #f8fafc; font-weight: 600;">₹${item.line_total}</td>
        `;
        itemsContainer.appendChild(row);
      });
      document.getElementById('modal-bill-grand-total').textContent = `₹${bill.total}`;
      detailModal.style.display = 'flex';
    } catch (err) {
      alert('Failed to load bill details');
    }
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => { if (detailModal) detailModal.style.display = 'none'; });
  if (modalBackBtn) modalBackBtn.addEventListener('click', () => { if (detailModal) detailModal.style.display = 'none'; });
  if (refreshBillsBtn) refreshBillsBtn.addEventListener('click', loadBillsHistory);

  // Initial load
  loadSummary(getTodayString());
  loadStock();
  loadBillsHistory();
}

// Router initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('hisab_kitab_ui_lang') || localStorage.getItem('hisab_kitab_lang') || 'en';
  applyStaticTranslations(saved);
  initSaleScreen();
  initSummaryScreen();
});
