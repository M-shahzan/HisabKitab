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
      utterance.lang = langSelect.value === 'en' ? 'en-IN' : 'hi-IN';
    }
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
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
  const cancelBtn = document.getElementById('cancel-btn');
  const languageSelect = document.getElementById('language-select');

  if (!micBtn) return;

  function renderBill(bill) {
    if (!bill || !bill.lines || bill.lines.length === 0) {
      billCard.style.display = 'none';
      return;
    }

    currentBillId = bill.bill_id;
    billItemsBody.innerHTML = '';

    bill.lines.forEach((line) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight: 600;">${line.name}</td>
        <td>${line.qty}</td>
        <td style="color: #94a3b8;">${line.unit}</td>
        <td>₹${line.unit_price}</td>
        <td style="font-weight: 700;">₹${line.amount}</td>
      `;
      billItemsBody.appendChild(row);
    });

    billTotal.textContent = `₹${bill.total}`;
    billCard.style.display = 'flex';
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
    const lang = languageSelect ? languageSelect.value : 'hi';
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

      if (data.bill) {
        renderBill(data.bill);
      } else if (data.intent === 'cancel') {
        currentBillId = null;
        billCard.style.display = 'none';
      }
    } catch (err) {
      micBtn.classList.remove('processing');
      micBtn.textContent = '🎤';
      micStatus.textContent = 'Error: ' + err.message;
      messageBox.textContent = 'Failed to process voice: ' + err.message;
      messageBox.style.display = 'block';
    }
  }

  confirmBtn.addEventListener('click', async () => {
    if (!currentBillId) return;
    try {
      confirmBtn.disabled = true;
      const res = await fetch(`${API_BASE}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_id: currentBillId }),
      });

      if (!responseOk(res)) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Confirmation failed');
      }

      const data = await res.json();
      currentBillId = null;
      billCard.style.display = 'none';

      let msg = `Sale #${data.sale_id} confirmed for ₹${data.total}.`;
      if (data.low_stock && data.low_stock.length > 0) {
        msg += ` Note: low stock on ${data.low_stock.join(', ')}.`;
      }
      messageBox.textContent = msg;
      messageBox.style.display = 'block';
      speakMessage(msg);
    } catch (err) {
      alert('Error confirming bill: ' + err.message);
    } finally {
      confirmBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener('click', async () => {
    if (!currentBillId) return;
    try {
      cancelBtn.disabled = true;
      const res = await fetch(`${API_BASE}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_id: currentBillId }),
      });

      if (!responseOk(res)) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Cancellation failed');
      }

      currentBillId = null;
      billCard.style.display = 'none';
      messageBox.textContent = 'Sale cancelled.';
      messageBox.style.display = 'block';
      speakMessage('Sale cancelled.');
    } catch (err) {
      alert('Error cancelling bill: ' + err.message);
    } finally {
      cancelBtn.disabled = false;
    }
  });
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

  async function loadStock() {
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
        const isLow = item.quantity <= 10; // Indicative threshold flag
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

  // Initial load
  loadSummary(getTodayString());
  loadStock();
}

// Router initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initSaleScreen();
  initSummaryScreen();
});
