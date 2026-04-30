let portfolio = JSON.parse(localStorage.getItem("portfolio")) || [];
let watchlist = JSON.parse(localStorage.getItem("watchlist")) || [];

const totalValueElement = document.getElementById("totalValue");
const totalInvestedElement = document.getElementById("totalInvested");
const profitLossElement = document.getElementById("profitLoss");
const portfolioList = document.getElementById("portfolioList");
const allocationList = document.getElementById("allocationList");
const watchList = document.getElementById("watchList");

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

function calculateTotals() {
  const totalInvested = portfolio.reduce((sum, item) => sum + item.amountInvested, 0);
  const totalValue = portfolio.reduce((sum, item) => sum + item.currentValue, 0);
  const profitLoss = totalValue - totalInvested;

  totalInvestedElement.textContent = formatEuro(totalInvested);
  totalValueElement.textContent = formatEuro(totalValue);
  profitLossElement.textContent = formatEuro(profitLoss);
  profitLossElement.className = profitLoss >= 0 ? "positive" : "negative";
}

function renderPortfolio() {
  portfolioList.innerHTML = "";

  portfolio.forEach((item, index) => {
    const profitLoss = item.currentValue - item.amountInvested;
    const profitLossClass = profitLoss >= 0 ? "positive" : "negative";

    const assetElement = document.createElement("div");
    assetElement.className = "asset";

    assetElement.innerHTML = `
      <div>
        <strong>${item.name}</strong><br>
        <small>${item.type} · ${item.isin}</small>
      </div>

      <div>
        <small>Investiert</small><br>
        ${formatEuro(item.amountInvested)}
      </div>

      <div>
        <small>Aktueller Wert</small><br>
        ${formatEuro(item.currentValue)}
      </div>

      <div class="${profitLossClass}">
        <small>Gewinn / Verlust</small><br>
        ${formatEuro(profitLoss)}
      </div>

      <button onclick="deleteAsset(${index})">❌</button>
    `;

    portfolioList.appendChild(assetElement);
  });
}

function renderAllocation() {
  allocationList.innerHTML = "";

  const totalValue = portfolio.reduce((sum, item) => sum + item.currentValue, 0);

  portfolio.forEach((item) => {
    const percentage = totalValue > 0 ? (item.currentValue / totalValue) * 100 : 0;

    const allocationItem = document.createElement("div");

    allocationItem.innerHTML = `
      <strong>${item.type}</strong> - ${percentage.toFixed(1)}%
      <div class="allocation-bar">
        <div class="allocation-fill" style="width: ${percentage}%"></div>
      </div>
    `;

    allocationList.appendChild(allocationItem);
  });
}

function addAsset() {
  const nameInput = document.getElementById("name");
  const typeInput = document.getElementById("type");
  const isinInput = document.getElementById("isin");
  const investedInput = document.getElementById("invested");
  const currentInput = document.getElementById("current");

  const name = nameInput.value.trim();
  const type = typeInput.value.trim();
  const isin = isinInput.value.trim();
  const invested = parseFloat(investedInput.value);
  const current = parseFloat(currentInput.value);

  if (!name || !type || !isin || isNaN(invested) || isNaN(current)) {
    alert("Bitte alle Felder korrekt ausfüllen.");
    return;
  }

  portfolio.push({
    name,
    type,
    isin,
    amountInvested: invested,
    currentValue: current
  });

  savePortfolio();

  nameInput.value = "";
  typeInput.value = "";
  isinInput.value = "";
  investedInput.value = "";
  currentInput.value = "";

  updateDashboard();
}

function deleteAsset(index) {
  portfolio.splice(index, 1);
  savePortfolio();
  updateDashboard();
}

function addWatchItem() {
  const watchInput = document.getElementById("watchInput");
  const symbol = watchInput.value.trim().toUpperCase();

  if (!symbol) {
    alert("Bitte Symbol eingeben.");
    return;
  }

  watchlist.push(symbol);
  saveWatchlist();

  watchInput.value = "";
  renderWatchlist();
}

function deleteWatchItem(index) {
  watchlist.splice(index, 1);
  saveWatchlist();
  renderWatchlist();
}

function renderWatchlist() {
  watchList.innerHTML = "";

  watchlist.forEach((symbol, index) => {
    const li = document.createElement("li");

    li.innerHTML = `
      ${symbol}
      <button onclick="deleteWatchItem(${index})">❌</button>
    `;

    watchList.appendChild(li);
  });
}

function updateDashboard() {
  renderPortfolio();
  calculateTotals();
  renderAllocation();
  renderWatchlist();
}

updateDashboard();