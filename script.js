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
  if (!item.transactions || item.transactions.length === 0) {
    return item.quantity || 0;
  }

  return item.transactions.reduce((sum, transaction) => {
    if (transaction.type === "BUY") {
      return sum + transaction.quantity;
    }

    if (transaction.type === "SELL") {
      return sum - transaction.quantity;
    }

    return sum;
  }, 0);
}

function getInvestedValue(item) {
  if (!item.transactions || item.transactions.length === 0) {
    return (item.quantity || 0) * (item.buyPrice || 0);
  }

  return item.transactions.reduce((sum, transaction) => {
    if (transaction.type === "BUY") {
      return sum + transaction.quantity * transaction.price;
    }

    if (transaction.type === "SELL") {
      return sum - transaction.quantity * transaction.price;
    }

    return sum;
  }, 0);
}

function getCurrentValue(item) {
  return getQuantity(item) * (item.currentPrice || 0);
}

function getProfitLoss(item) {
  return getCurrentValue(item) - getInvestedValue(item);
}

function getProfitLossPercent(item) {
  const invested = getInvestedValue(item);

  if (invested === 0) {
    return 0;
  }

  return (getProfitLoss(item) / invested) * 100;
}

function getPortfolioWeight(item) {
  const totalValue = portfolio.reduce((sum, asset) => {
    return sum + getCurrentValue(asset);
  }, 0);

  if (totalValue === 0) {
    return 0;
  }

  return (getCurrentValue(item) / totalValue) * 100;
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

  const newAsset = {
    name: name,
    type: type,
    isin: isin,
    symbol: symbol,
    quantity: quantity,
    buyPrice: buyPrice,
    currentPrice: buyPrice,
    transactions: [
      {
        type: "BUY",
        date: new Date().toISOString().split("T")[0],
        quantity: quantity,
        price: buyPrice,
        note: "Initial buy"
      }
    ]
  };

  portfolio.push(newAsset);
  savePortfolio();

  nameInput.value = "";
  typeInput.value = "";
  isinInput.value = "";
  symbolInput.value = "";
  quantityInput.value = "";
  priceInput.value = "";

  updateDashboard();
}

function renderPortfolio() {
  portfolioList.innerHTML = "";

  if (portfolio.length === 0) {
    portfolioList.innerHTML = "<p>No assets yet. Add your first asset above.</p>";
    return;
  }

  portfolio.forEach((item, index) => {
    const quantity = getQuantity(item);
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
        <small>Units: ${quantity}</small><br>
        <small>Weight: ${weight.toFixed(1)}%</small>
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
      <button onclick="deleteAsset(${index})">❌</button>
    `;

    portfolioList.appendChild(asset);

    if (editingIndex === index) {
      renderEditForm(item, index);
    }

    if (transactionIndex === index) {
      renderTransactionForm(index);
    }

    if (historyIndex === index) {
      renderTransactionHistory(item, index);
    }
  });
}

function renderEditForm(item, index) {
  const form = document.createElement("div");
  form.className = "edit-form";

  form.innerHTML = `
    <input id="editName" value="${item.name}" />
    <input id="editType" value="${item.type}" />
    <input id="editIsin" value="${item.isin}" />
    <input id="editSymbol" value="${item.symbol}" />
    <input id="editCurrentPrice" type="number" step="0.01" value="${item.currentPrice}" />
    <button onclick="saveEditAsset(${index})">Save</button>
    <button onclick="cancelEditAsset()">Cancel</button>
  `;

  portfolioList.appendChild(form);
}

function startEditAsset(index) {
  editingIndex = index;
  transactionIndex = null;
  historyIndex = null;
  renderPortfolio();
}

function cancelEditAsset() {
  editingIndex = null;
  renderPortfolio();
}

function saveEditAsset(index) {
  const name = document.getElementById("editName").value.trim();
  const type = document.getElementById("editType").value.trim();
  const isin = document.getElementById("editIsin").value.trim();
  const symbol = document.getElementById("editSymbol").value.trim().toUpperCase();
  const currentPrice = parseFloat(document.getElementById("editCurrentPrice").value);

  if (!name || !type || !isin || !symbol || isNaN(currentPrice)) {
    alert("Bitte alle Felder korrekt ausfüllen.");
    return;
  }

  portfolio[index].name = name;
  portfolio[index].type = type;
  portfolio[index].isin = isin;
  portfolio[index].symbol = symbol;
  portfolio[index].currentPrice = currentPrice;

  editingIndex = null;
  savePortfolio();
  updateDashboard();
}

const monthlyInvestmentInput = document.getElementById("monthlyInvestment");
const buyPriceInput = document.getElementById("buyPrice");
const unitsInput = document.getElementById("units");

function calculateUnits() {
  const monthlyInvestment = Number(monthlyInvestmentInput.value);
  const buyPrice = Number(buyPriceInput.value);

  if (monthlyInvestment > 0 && buyPrice > 0) {
    const units = monthlyInvestment / buyPrice;
    unitsInput.value = units.toFixed(4);
  } else {
    unitsInput.value = "";
  }
}

monthlyInvestmentInput.addEventListener("input", calculateUnits);
buyPriceInput.addEventListener("input", calculateUnits);

function renderTransactionForm(index) {
  const form = document.createElement("div");
  form.className = "edit-form";

  form.innerHTML = `
    <select id="transactionType">
      <option value="BUY">BUY</option>
      <option value="SELL">SELL</option>
    </select>

    <input id="transactionDate" type="date" value="${new Date().toISOString().split("T")[0]}" />
    <input id="transactionQuantity" type="number" step="0.0001" placeholder="Units" />
    <input id="transactionPrice" type="number" step="0.01" placeholder="Price" />
    <input id="transactionNote" placeholder="Note" />

    <button onclick="saveTransaction(${index})">Save</button>
    <button onclick="cancelTransaction()">Cancel</button>
  `;

  portfolioList.appendChild(form);
}

function startTransaction(index) {
  transactionIndex = index;
  editingIndex = null;
  historyIndex = null;
  renderPortfolio();
}

function cancelTransaction() {
  transactionIndex = null;
  renderPortfolio();
}

function saveTransaction(index) {
  const type = document.getElementById("transactionType").value;
  const date = document.getElementById("transactionDate").value;
  const quantity = parseFloat(document.getElementById("transactionQuantity").value);
  const price = parseFloat(document.getElementById("transactionPrice").value);
  const note = document.getElementById("transactionNote").value.trim();

  if (!date || isNaN(quantity) || isNaN(price)) {
    alert("Bitte Datum, Units und Preis korrekt ausfüllen.");
    return;
  }

  if (!portfolio[index].transactions) {
    portfolio[index].transactions = [];
  }

  portfolio[index].transactions.push({
    type: type,
    date: date,
    quantity: quantity,
    price: price,
    note: note
  });

  portfolio[index].currentPrice = price;

  transactionIndex = null;
  savePortfolio();
  updateDashboard();
}

function renderTransactionHistory(item, assetIndex) {
  const history = document.createElement("div");
  history.className = "transaction-history";

  const transactions = [...(item.transactions || [])].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  if (transactions.length === 0) {
    history.innerHTML = "<p>No transactions yet.</p>";
    portfolioList.appendChild(history);
    return;
  }

  history.innerHTML = `
    <h3>Transaction History</h3>
    ${transactions
      .map((transaction) => {
        const originalIndex = item.transactions.indexOf(transaction);

        return `
          <div class="transaction-row">
            <div class="${transaction.type === "BUY" ? "buy" : "sell"}">${transaction.type}</div>
            <div>${transaction.date}</div>
            <div>${transaction.quantity} Units</div>
            <div>${formatEuro(transaction.price)}</div>
            <div>${transaction.note || "-"}</div>
            <button onclick="deleteTransaction(${assetIndex}, ${originalIndex})">❌</button>
          </div>
        `;
      })
      .join("")}
  `;

  portfolioList.appendChild(history);
}

function toggleHistory(index) {
  historyIndex = historyIndex === index ? null : index;
  editingIndex = null;
  transactionIndex = null;
  renderPortfolio();
}

function deleteTransaction(assetIndex, transactionIndexToDelete) {
  const confirmDelete = confirm("Diese Transaction wirklich löschen?");

  if (!confirmDelete) {
    return;
  }

  portfolio[assetIndex].transactions.splice(transactionIndexToDelete, 1);

  savePortfolio();
  updateDashboard();
}

function deleteAsset(index) {
  const confirmDelete = confirm("Dieses Asset wirklich löschen?");

  if (!confirmDelete) {
    return;
  }

  portfolio.splice(index, 1);

  savePortfolio();
  updateDashboard();
}

function renderAllocation() {
  allocationList.innerHTML = "";

  const totalValue = portfolio.reduce((sum, item) => {
    return sum + getCurrentValue(item);
  }, 0);

  if (portfolio.length === 0 || totalValue === 0) {
    allocationList.innerHTML = "<p>No allocation yet.</p>";
    return;
  }

  portfolio.forEach((item) => {
    const value = getCurrentValue(item);
    const percent = (value / totalValue) * 100;

    const allocationItem = document.createElement("div");

    allocationItem.innerHTML = `
      <strong>${item.type}</strong> - ${percent.toFixed(1)}%
      <div class="allocation-bar">
        <div class="allocation-fill" style="width: ${percent}%"></div>
      </div>
    `;

    allocationList.appendChild(allocationItem);
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

function addWatchItem() {
  const input = document.getElementById("watchInput");
  const symbol = input.value.trim().toUpperCase();

  if (!symbol) {
    alert("Bitte Symbol eingeben.");
    return;
  }

  watchlist.push(symbol);
  saveWatchlist();

  input.value = "";
  renderWatchlist();
}

function deleteWatchItem(index) {
  watchlist.splice(index, 1);
  saveWatchlist();
  renderWatchlist();
}

function renderWatchlist() {
  watchList.innerHTML = "";

  if (watchlist.length === 0) {
    watchList.innerHTML = "<li>No watchlist items yet.</li>";
    return;
  }

  watchlist.forEach((symbol, index) => {
    const item = document.createElement("li");

    item.innerHTML = `
      <strong>${symbol}</strong>
      <button onclick="deleteWatchItem(${index})">❌</button>
    `;

    watchList.appendChild(item);
  });
}

function updateDashboard() {
  renderPortfolio();
  calculateTotals();
  renderAllocation();
  renderAnalysis();
  renderWatchlist();
}

updateDashboard();