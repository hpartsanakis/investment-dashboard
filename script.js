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

const bestPerformerElement = document.getElementById("bestPerformer");
const worstPerformerElement = document.getElementById("worstPerformer");
const portfolioPerformanceElement = document.getElementById("portfolioPerformance");

function formatEuro(value) {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR"
  });
}

function savePortfolio() {
  localStorage.setItem("portfolio", JSON.stringify(portfolio));
}

function saveWatchlist() {
  localStorage.setItem("watchlist", JSON.stringify(watchlist));
}

function getQuantity(item) {
  if (!item.transactions) return item.quantity || 0;

  return item.transactions.reduce((sum, t) => {
    if (t.type === "BUY") return sum + t.quantity;
    if (t.type === "SELL") return sum - t.quantity;
    return sum;
  }, 0);
}

function getInvestedValue(item) {
  if (!item.transactions) return item.quantity * item.buyPrice;

  return item.transactions.reduce((sum, t) => {
    if (t.type === "BUY") return sum + t.quantity * t.price;
    if (t.type === "SELL") return sum - t.quantity * t.price;
    return sum;
  }, 0);
}

function getCurrentValue(item) {
  return getQuantity(item) * item.currentPrice;
}

function getProfitLoss(item) {
  return getCurrentValue(item) - getInvestedValue(item);
}

function getProfitLossPercent(item) {
  const invested = getInvestedValue(item);
  if (invested === 0) return 0;
  return (getProfitLoss(item) / invested) * 100;
}

function getPortfolioWeight(item) {
  const totalValue = portfolio.reduce((sum, asset) => {
    return sum + getCurrentValue(asset);
  }, 0);

  if (totalValue === 0) return 0;

  return (getCurrentValue(item) / totalValue) * 100;
}

async function fetchQuote(symbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data || data.c === 0) throw new Error("Keine Kursdaten gefunden");

    return data;
  } catch (error) {
    console.error("API Fehler:", error);
    return null;
  }
}

function calculateTotals() {
  const totalInvested = portfolio.reduce((sum, item) => {
    return sum + getInvestedValue(item);
  }, 0);

  const totalValue = portfolio.reduce((sum, item) => {
    return sum + getCurrentValue(item);
  }, 0);

  const profitLoss = totalValue - totalInvested;

  totalInvestedElement.textContent = formatEuro(totalInvested);
  totalValueElement.textContent = formatEuro(totalValue);
  profitLossElement.textContent = formatEuro(profitLoss);
  profitLossElement.className = profitLoss >= 0 ? "positive" : "negative";
}

function renderPortfolio() {
  portfolioList.innerHTML = "";

  portfolio.forEach((item, index) => {
    const qty = getQuantity(item);
    const invested = getInvestedValue(item);
    const current = getCurrentValue(item);
    const profit = getProfitLoss(item);
    const profitPercent = getProfitLossPercent(item);
    const weight = getPortfolioWeight(item);

    const asset = document.createElement("div");
    asset.className = "asset";

    asset.innerHTML = `
      <div>
        <strong>${item.name}</strong><br>
        <small>${item.type} · ${item.symbol} · ${item.isin}</small><br>
        <small>Units: ${qty}</small><br>
        <small>Portfolio Weight: ${weight.toFixed(1)}%</small>
      </div>

      <div>
        <small>Investiert</small><br>
        ${formatEuro(invested)}
      </div>

      <div>
        <small>Aktueller Wert</small><br>
        ${formatEuro(current)}<br>
        <small>Preis: ${formatEuro(item.currentPrice)}</small>
      </div>

      <div class="${profit >= 0 ? "positive" : "negative"}">
        <small>Gewinn / Verlust</small><br>
        ${formatEuro(profit)}<br>
        <small>${profitPercent.toFixed(2)}%</small>
      </div>

      <button onclick="startEditAsset(${index})">✏️</button>
      <button onclick="startTransaction(${index})">➕</button>
      <button onclick="toggleHistory(${index})">📜</button>
      <button onclick="updateSingleAssetPrice(${index})">🔄</button>
      <button onclick="deleteAsset(${index})">❌</button>
    `;

    portfolioList.appendChild(asset);

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
  });
}

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

  item.name = document.getElementById("editName").value.trim();
  item.type = document.getElementById("editType").value.trim();
  item.isin = document.getElementById("editIsin").value.trim();
  item.symbol = document.getElementById("editSymbol").value.trim().toUpperCase();
  item.quantity = parseFloat(document.getElementById("editQuantity").value);
  item.buyPrice = parseFloat(document.getElementById("editBuyPrice").value);

  if (!item.name || !item.type || !item.isin || !item.symbol || isNaN(item.quantity) || isNaN(item.buyPrice)) {
    alert("Bitte alle Felder korrekt ausfüllen.");
    return;
  }

  if (!item.currentPrice || isNaN(item.currentPrice)) {
    item.currentPrice = item.buyPrice;
  }

  editingIndex = null;
  savePortfolio();
  updateDashboard();
}

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
  const note = document.getElementById("tNote").value.trim();

  if (!date || isNaN(qty) || isNaN(price)) {
    alert("Bitte Datum, Units und Preis korrekt ausfüllen.");
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
    note
  });

  portfolio[i].currentPrice = price;

  transactionIndex = null;
  savePortfolio();
  updateDashboard();
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

function deleteAsset(i) {
  const confirmDelete = confirm("Dieses Asset wirklich löschen?");
  if (!confirmDelete) return;

  portfolio.splice(i, 1);
  savePortfolio();
  updateDashboard();
}

async function updateSingleAssetPrice(i) {
  const q = await fetchQuote(portfolio[i].symbol);

  if (!q) {
    alert("Keine Kursdaten gefunden. Prüfe Symbol oder API-Key.");
    return;
  }

  portfolio[i].currentPrice = q.c;
  savePortfolio();
  updateDashboard();
}

async function updateAllPrices() {
  for (let i = 0; i < portfolio.length; i++) {
    const q = await fetchQuote(portfolio[i].symbol);

    if (q) {
      portfolio[i].currentPrice = q.c;
    }
  }

  savePortfolio();
  updateDashboard();
}

function renderAllocation() {
  allocationList.innerHTML = "";

  const total = portfolio.reduce((sum, item) => {
    return sum + getCurrentValue(item);
  }, 0);

  portfolio.forEach((item) => {
    const value = getCurrentValue(item);
    const percent = total ? (value / total) * 100 : 0;

    const el = document.createElement("div");

    el.innerHTML = `
      <strong>${item.type}</strong> - ${percent.toFixed(1)}%
      <div class="allocation-bar">
        <div class="allocation-fill" style="width:${percent}%"></div>
      </div>
    `;

    allocationList.appendChild(el);
  });
}

function renderAnalysis() {
  if (portfolio.length === 0) {
    bestPerformerElement.textContent = "-";
    worstPerformerElement.textContent = "-";
    portfolioPerformanceElement.textContent = "0%";
    return;
  }

  const totalInvested = portfolio.reduce((sum, item) => {
    return sum + getInvestedValue(item);
  }, 0);

  const totalValue = portfolio.reduce((sum, item) => {
    return sum + getCurrentValue(item);
  }, 0);

  const totalPerformance =
    totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

  const sorted = [...portfolio].sort((a, b) => {
    return getProfitLossPercent(b) - getProfitLossPercent(a);
  });

  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  bestPerformerElement.textContent = `${best.symbol} ${getProfitLossPercent(best).toFixed(2)}%`;
  worstPerformerElement.textContent = `${worst.symbol} ${getProfitLossPercent(worst).toFixed(2)}%`;

  portfolioPerformanceElement.textContent = `${totalPerformance.toFixed(2)}%`;
  portfolioPerformanceElement.className = totalPerformance >= 0 ? "positive" : "negative";
}

function addAsset() {
  const nameInput = document.getElementById("name");
  const typeInput = document.getElementById("type");
  const isinInput = document.getElementById("isin");
  const symbolInput = document.getElementById("symbol");
  const quantityInput = document.getElementById("quantity");
  const priceInput = document.getElementById("price");

  const name = nameInput.value.trim();
  const type = typeInput.value.trim();
  const isin = isinInput.value.trim();
  const symbol = symbolInput.value.trim().toUpperCase();
  const quantity = parseFloat(quantityInput.value);
  const buyPrice = parseFloat(priceInput.value);

  if (!name || !type || !isin || !symbol || isNaN(quantity) || isNaN(buyPrice)) {
    alert("Bitte alle Felder korrekt ausfüllen.");
    return;
  }

  portfolio.push({
    name,
    type,
    isin,
    symbol,
    quantity,
    buyPrice,
    currentPrice: buyPrice,
    transactions: [
      {
        type: "BUY",
        date: new Date().toISOString().split("T")[0],
        quantity,
        price: buyPrice,
        note: "Initial buy"
      }
    ]
  });

  savePortfolio();

  nameInput.value = "";
  typeInput.value = "";
  isinInput.value = "";
  symbolInput.value = "";
  quantityInput.value = "";
  priceInput.value = "";

  updateDashboard();
}

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
      const changeClass = q.dp >= 0 ? "positive" : "negative";

      li.innerHTML = `
        <strong>${symbol}</strong> ${q.c}
        <span class="${changeClass}">(${q.dp.toFixed(2)}%)</span>
        <button onclick="deleteWatchItem(${i})">❌</button>
      `;
    } else {
      li.innerHTML = `
        <strong>${symbol}</strong> no data
        <button onclick="deleteWatchItem(${i})">❌</button>
      `;
    }

    watchList.appendChild(li);
  }
}

function updateDashboard() {
  renderPortfolio();
  calculateTotals();
  renderAllocation();
  renderAnalysis();
  renderWatchlist();
}

updateDashboard();