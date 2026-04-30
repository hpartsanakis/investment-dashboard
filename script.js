let portfolio = JSON.parse(localStorage.getItem("portfolio")) || [];
let watchlist = JSON.parse(localStorage.getItem("watchlist")) || [];

let editingIndex = null;
let transactionIndex = null;
let historyIndex = null;

const totalValueElement = document.getElementById("totalValue");
const totalInvestedElement = document.getElementById("totalInvested");
const profitLossElement = document.getElementById("profitLoss");
const portfolioList = document.getElementById("portfolioList");
const allocationList = document.getElementById("allocationList");
const watchList = document.getElementById("watchList");

function formatEuro(value) {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function savePortfolio() {
  localStorage.setItem("portfolio", JSON.stringify(portfolio));
}

function saveWatchlist() {
  localStorage.setItem("watchlist", JSON.stringify(watchlist));
}

/* =========================
   TRANSACTION LOGIC
========================= */

function getQuantity(item) {
  if (!item.transactions) {
    return item.quantity || 0;
  }

  return item.transactions.reduce((sum, t) => {
    if (t.type === "BUY") return sum + t.quantity;
    if (t.type === "SELL") return sum - t.quantity;
    return sum;
  }, 0);
}

function getInvestedValue(item) {
  if (!item.transactions) {
    return item.quantity * item.buyPrice;
  }

  return item.transactions.reduce((sum, t) => {
    if (t.type === "BUY") return sum + t.quantity * t.price;
    if (t.type === "SELL") return sum - t.quantity * t.price;
    return sum;
  }, 0);
}

function getCurrentValue(item) {
  return getQuantity(item) * item.currentPrice;
}

/* =========================
   API
========================= */

async function fetchQuote(symbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data || data.c === 0) throw new Error();

    return data;
  } catch {
    return null;
  }
}

/* =========================
   CALCULATIONS
========================= */

function calculateTotals() {
  const totalInvested = portfolio.reduce(
    (sum, item) => sum + getInvestedValue(item),
    0,
  );
  const totalValue = portfolio.reduce(
    (sum, item) => sum + getCurrentValue(item),
    0,
  );
  const profitLoss = totalValue - totalInvested;

  totalInvestedElement.textContent = formatEuro(totalInvested);
  totalValueElement.textContent = formatEuro(totalValue);
  profitLossElement.textContent = formatEuro(profitLoss);
  profitLossElement.className = profitLoss >= 0 ? "positive" : "negative";
}

/* =========================
   PORTFOLIO RENDER
========================= */

function renderPortfolio() {
  portfolioList.innerHTML = "";

  portfolio.forEach((item, index) => {
    const qty = getQuantity(item);
    const invested = getInvestedValue(item);
    const current = getCurrentValue(item);
    const profit = current - invested;

    const asset = document.createElement("div");
    asset.className = "asset";

    asset.innerHTML = `
      <div>
        <strong>${item.name}</strong><br>
        <small>${item.type} · ${item.symbol} · ${item.isin}</small><br>
        <small>Units: ${qty}</small>
      </div>

      <div>${formatEuro(invested)}</div>
      <div>${formatEuro(current)}</div>

      <div class="${profit >= 0 ? "positive" : "negative"}">
        ${formatEuro(profit)}
      </div>

      <button onclick="startEditAsset(${index})">✏️</button>
<button onclick="startTransaction(${index})">➕</button>
<button onclick="toggleHistory(${index})">📜</button>
<button onclick="updateSingleAssetPrice(${index})">🔄</button>
<button onclick="deleteAsset(${index})">❌</button>
    `;

    portfolioList.appendChild(asset);

    /* EDIT FORM */
    if (editingIndex === index) {
      const form = document.createElement("div");
      form.className = "edit-form";

      form.innerHTML = `
        <input id="editName" value="${item.name}">
        <input id="editType" value="${item.type}">
        <input id="editIsin" value="${item.isin}">
        <input id="editSymbol" value="${item.symbol}">
        <input id="editQuantity" type="number" value="${item.quantity || 0}">
        <input id="editBuyPrice" type="number" value="${item.buyPrice || 0}">

        <button onclick="saveEditAsset(${index})">Save</button>
        <button onclick="cancelEditAsset()">Cancel</button>
      `;

      portfolioList.appendChild(form);
    }

    /* TRANSACTION FORM */
    if (transactionIndex === index) {
      const form = document.createElement("div");
      form.className = "edit-form";

      form.innerHTML = `
        <select id="tType">
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>

        <input id="tDate" type="date">
        <input id="tQty" type="number" placeholder="Units">
        <input id="tPrice" type="number" placeholder="Price">
        <input id="tNote" placeholder="Note">

        <button onclick="saveTransaction(${index})">Save</button>
        <button onclick="cancelTransaction()">Cancel</button>
      `;

      portfolioList.appendChild(form);
    }
  });
}

if (historyIndex === index) {
  const history = document.createElement("div");
  history.className = "transaction-history";

  const transactions = [...(item.transactions || [])].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  if (transactions.length === 0) {
    history.innerHTML = `<p>No transactions yet.</p>`;
  } else {
    history.innerHTML = `
      <h3>Transaction History</h3>
      ${transactions
        .map((t) => {
          const originalIndex = item.transactions.indexOf(t);

          return `
            <div class="transaction-row">
              <div class="${t.type === "BUY" ? "buy" : "sell"}">${t.type}</div>
              <div>${t.date}</div>
              <div>${t.quantity} Units</div>
              <div>${formatEuro(t.price)}</div>
              <div>${t.note || "-"}</div>
              <button onclick="deleteTransaction(${index}, ${originalIndex})">❌</button>
            </div>
          `;
        })
        .join("")}
    `;
  }

  portfolioList.appendChild(history);
}

/* =========================
   EDIT
========================= */

function startEditAsset(i) {
  editingIndex = i;
  transactionIndex = null;
  historyIndex = null;
  renderPortfolio();
}

function cancelEditAsset() {
  editingIndex = null;
  renderPortfolio();
}

function saveEditAsset(i) {
  const item = portfolio[i];

  item.name = document.getElementById("editName").value;
  item.type = document.getElementById("editType").value;
  item.isin = document.getElementById("editIsin").value;
  item.symbol = document.getElementById("editSymbol").value.toUpperCase();
  item.quantity = parseFloat(document.getElementById("editQuantity").value);
  item.buyPrice = parseFloat(document.getElementById("editBuyPrice").value);

  editingIndex = null;
  savePortfolio();
  updateDashboard();
}

/* =========================
   TRANSACTIONS
========================= */

function startTransaction(i) {
  transactionIndex = i;
  editingIndex = null;
  historyIndex = null;
  renderPortfolio();
}

function cancelTransaction() {
  transactionIndex = null;
  renderPortfolio();
}

function saveTransaction(i) {
  const type = document.getElementById("tType").value;
  const date = document.getElementById("tDate").value;
  const qty = parseFloat(document.getElementById("tQty").value);
  const price = parseFloat(document.getElementById("tPrice").value);
  const note = document.getElementById("tNote").value;

  if (!date || isNaN(qty) || isNaN(price)) {
    alert("Fill fields");
    return;
  }

  if (!portfolio[i].transactions) {
    portfolio[i].transactions = [];
  }

  portfolio[i].transactions.push({
    type,
    date,
    quantity: qty,
    price,
    note,
  });

  portfolio[i].currentPrice = price;

  transactionIndex = null;
  savePortfolio();
  updateDashboard();
}

/* =========================
   OTHER
========================= */

function deleteAsset(i) {
  portfolio.splice(i, 1);
  savePortfolio();
  updateDashboard();
}

async function updateSingleAssetPrice(i) {
  const q = await fetchQuote(portfolio[i].symbol);
  if (q) {
    portfolio[i].currentPrice = q.c;
    savePortfolio();
    updateDashboard();
  }
}

function renderAllocation() {
  allocationList.innerHTML = "";

  const total = portfolio.reduce((s, i) => s + getCurrentValue(i), 0);

  portfolio.forEach((i) => {
    const val = getCurrentValue(i);
    const pct = total ? (val / total) * 100 : 0;

    const el = document.createElement("div");
    el.innerHTML = `
      ${i.type} - ${pct.toFixed(1)}%
      <div class="allocation-bar">
        <div class="allocation-fill" style="width:${pct}%"></div>
      </div>
    `;

    allocationList.appendChild(el);
  });
}

/* =========================
   WATCHLIST
========================= */

function addWatchItem() {
  const input = document.getElementById("watchInput");
  const symbol = input.value.trim().toUpperCase();

  if (!symbol) return;

  watchlist.push(symbol);
  saveWatchlist();
  input.value = "";
  renderWatchlist();
}

function deleteWatchItem(i) {
  watchlist.splice(i, 1);
  saveWatchlist();
  renderWatchlist();
}

async function renderWatchlist() {
  watchList.innerHTML = "";

  for (let i = 0; i < watchlist.length; i++) {
    const symbol = watchlist[i];
    const q = await fetchQuote(symbol);

    const li = document.createElement("li");

    if (q) {
      li.innerHTML = `
        ${symbol} ${q.c} (${q.dp.toFixed(2)}%)
        <button onclick="deleteWatchItem(${i})">❌</button>
      `;
    } else {
      li.innerHTML = `${symbol} no data`;
    }

    watchList.appendChild(li);
  }
}

function toggleHistory(index) {
  historyIndex = historyIndex === index ? null : index;
  editingIndex = null;
  transactionIndex = null;
  renderPortfolio();
}

function deleteTransaction(assetIndex, transactionIndexToDelete) {
  const confirmDelete = confirm("Diese Transaction wirklich löschen?");

  if (!confirmDelete) return;

  portfolio[assetIndex].transactions.splice(transactionIndexToDelete, 1);

  savePortfolio();
  updateDashboard();
}

/* =========================
   INIT
========================= */

function updateDashboard() {
  renderPortfolio();
  calculateTotals();
  renderAllocation();
  renderWatchlist();
}

updateDashboard();
