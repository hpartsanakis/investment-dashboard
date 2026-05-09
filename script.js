let assets = JSON.parse(localStorage.getItem("assets")) || [];
let investments = JSON.parse(localStorage.getItem("investments")) || [];

let editingAssetId = null;
let editingInvestmentId = null;

const assetForm = document.getElementById("assetForm");
const investmentForm = document.getElementById("investmentForm");

const assetsTable = document.getElementById("assetsTable");
const investmentsTable = document.getElementById("investmentsTable");

const investmentAsset = document.getElementById("investmentAsset");

const totalInvestedEl = document.getElementById("totalInvested");
const totalValueEl = document.getElementById("totalValue");
const totalProfitEl = document.getElementById("totalProfit");
const totalReturnEl = document.getElementById("totalReturn");

const themeToggle = document.getElementById("themeToggle");

let allocationChart;
let investedChart;
let profitChart;
let valueChart;

function round(value, decimals = 4) {
  return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
}

function saveData() {
  localStorage.setItem("assets", JSON.stringify(assets));
  localStorage.setItem("investments", JSON.stringify(investments));
}

function round(value, decimals = 4) {
  return Number(Number(value).toFixed(decimals));
}

function formatEuro(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(value) || 0);
}

function getAssetById(id) {
  return assets.find((asset) => asset.id === id);
}

function calculateInvestment(amount, buyPrice, currentPrice) {
  const units = buyPrice > 0 ? round(amount / buyPrice) : 0;
  const currentValue = round(units * currentPrice);
  const profit = round(currentValue - amount);
  const returnPercent = amount > 0 ? round((profit / amount) * 100) : 0;

  return {
    units,
    currentValue,
    profit,
    returnPercent,
  };
}

function getAssetInvestments(assetId) {
  return investments.filter((inv) => inv.assetId === assetId);
}

function getAssetValue(assetId) {
  return getAssetInvestments(assetId).reduce((sum, inv) => {
    return sum + (Number(inv.currentValue) || 0);
  }, 0);
}

function getAssetInvested(assetId) {
  return getAssetInvestments(assetId).reduce((sum, inv) => {
    return sum + (Number(inv.amount) || 0);
  }, 0);
}

function getTotalInvested() {
  return investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
}

function getTotalValue() {
  return investments.reduce(
    (sum, inv) => sum + (Number(inv.currentValue) || 0),
    0,
  );
}

function renderAssetOptions() {
  investmentAsset.innerHTML = `<option value="">Select asset</option>`;

  assets.forEach((asset) => {
    const option = document.createElement("option");
    option.value = asset.id;
    option.textContent = asset.name;
    investmentAsset.appendChild(option);
  });
}

function renderAssets() {
  assetsTable.innerHTML = "";

  const totalValue = getTotalValue();

  assets.forEach((asset) => {
    const value = getAssetValue(asset.id);
    const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${asset.name}</td>
      <td>${asset.wkn || "-"}</td>
      <td>${asset.isin}</td>
      <td>${asset.ticker || "-"}</td>
      <td>${formatEuro(value)}</td>
      <td>${formatNumber(allocation)}%</td>
      <td class="action-buttons">
        <button class="edit-btn" onclick="editAsset('${asset.id}')">Edit</button>
        <button class="delete-btn" onclick="deleteAsset('${asset.id}')">Delete</button>
      </td>
    `;

    assetsTable.appendChild(tr);
  });
}

function renderInvestments() {
  investmentsTable.innerHTML = "";

  investments.forEach((inv) => {
    const asset = getAssetById(inv.assetId);

    const amount = Number(inv.amount) || 0;
    const buyPrice = Number(inv.buyPrice) || 0;
    const currentPrice = Number(inv.currentPrice) || 0;

    const calculated = calculateInvestment(amount, buyPrice, currentPrice);

    inv.units = calculated.units;
    inv.currentValue = calculated.currentValue;
    inv.profit = calculated.profit;
    inv.returnPercent = calculated.returnPercent;

    const profitClass = inv.profit >= 0 ? "positive" : "negative";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${inv.date || "-"}</td>
      <td>${asset ? asset.name : "Unknown asset"}</td>
      <td>${formatEuro(inv.amount)}</td>
      <td>${formatNumber(inv.units)}</td>
      <td>${formatEuro(inv.buyPrice)}</td>
      <td>${formatEuro(inv.currentPrice)}</td>
      <td>${formatEuro(inv.currentValue)}</td>
      <td class="${profitClass}">
        ${formatEuro(inv.profit)} / ${formatNumber(inv.returnPercent)}%
      </td>
      <td class="action-buttons">
        <button class="edit-btn" onclick="editInvestment('${inv.id}')">Edit</button>
        <button class="delete-btn" onclick="deleteInvestment('${inv.id}')">Delete</button>
      </td>
    `;

    investmentsTable.appendChild(tr);
  });

  saveData();
}

function renderOverview() {
  const totalInvested = getTotalInvested();
  const totalValue = getTotalValue();
  const profit = totalValue - totalInvested;
  const returnPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

  totalInvestedEl.textContent = formatEuro(totalInvested);
  totalValueEl.textContent = formatEuro(totalValue);
  totalProfitEl.textContent = formatEuro(profit);
  totalReturnEl.textContent = `${formatNumber(returnPercent)}%`;

  totalProfitEl.className = profit >= 0 ? "positive" : "negative";
  totalReturnEl.className = profit >= 0 ? "positive" : "negative";
}

function renderAllocationChart() {
  const labels = assets.map((asset) => asset.name);
  const data = assets.map((asset) => getAssetValue(asset.id));
  const ctx = document.getElementById("allocationChart");

  if (allocationChart) allocationChart.destroy();

  allocationChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data }],
    },
  });
}

function renderInvestedChart() {
  const ctx = document.getElementById("investedChart");

  if (investedChart) investedChart.destroy();

  investedChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Invested", "Current Value"],
      datasets: [
        {
          label: "€",
          data: [getTotalInvested(), getTotalValue()],
        },
      ],
    },
  });
}

function renderProfitChart() {
  const labels = assets.map((asset) => asset.name);

  const data = assets.map((asset) => {
    return getAssetValue(asset.id) - getAssetInvested(asset.id);
  });

  const ctx = document.getElementById("profitChart");

  if (profitChart) profitChart.destroy();

  profitChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Profit / Loss",
          data,
        },
      ],
    },
  });
}

function renderValueChart() {
  const labels = assets.map((asset) => asset.name);
  const data = assets.map((asset) => getAssetValue(asset.id));
  const ctx = document.getElementById("valueChart");

  if (valueChart) valueChart.destroy();

  valueChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Current Value",
          data,
          tension: 0.3,
        },
      ],
    },
  });
}

function renderApp() {
  renderAssetOptions();
  renderAssets();
  renderInvestments();
  renderOverview();
  renderAllocationChart();
  renderInvestedChart();
  renderProfitChart();
  renderValueChart();
}

assetForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const assetData = {
    name: document.getElementById("assetName").value.trim(),
    wkn: document.getElementById("assetWkn").value.trim(),
    isin: document.getElementById("assetIsin").value.trim(),
    ticker: document.getElementById("assetTicker").value.trim(),
  };

  if (editingAssetId) {
    assets = assets.map((asset) =>
      asset.id === editingAssetId ? { ...asset, ...assetData } : asset,
    );

    editingAssetId = null;
    assetForm.querySelector("button").textContent = "Save Asset";
  } else {
    assets.push({
      id: crypto.randomUUID(),
      ...assetData,
    });
  }

  saveData();
  assetForm.reset();
  renderApp();
});

function editAsset(id) {
  const asset = getAssetById(id);
  if (!asset) return;

  editingAssetId = id;

  document.getElementById("assetName").value = asset.name;
  document.getElementById("assetWkn").value = asset.wkn;
  document.getElementById("assetIsin").value = asset.isin;
  document.getElementById("assetTicker").value = asset.ticker;

  assetForm.querySelector("button").textContent = "Update Asset";
  window.scrollTo({ top: assetForm.offsetTop - 120, behavior: "smooth" });
}

function deleteAsset(id) {
  assets = assets.filter((asset) => asset.id !== id);
  investments = investments.filter((inv) => inv.assetId !== id);

  saveData();
  renderApp();
}

investmentForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const amount = Number(document.getElementById("investmentAmount").value);
  const buyPrice = Number(document.getElementById("investmentBuyPrice").value);
  const currentPrice = Number(
    document.getElementById("investmentCurrentPrice").value,
  );

  const calculated = calculateInvestment(amount, buyPrice, currentPrice);

  const investmentData = {
    assetId: investmentAsset.value,
    amount,
    buyPrice,
    currentPrice,
    units: calculated.units,
    currentValue: calculated.currentValue,
    profit: calculated.profit,
    returnPercent: calculated.returnPercent,
    date: document.getElementById("investmentDate").value,
  };

  if (editingInvestmentId) {
    investments = investments.map((inv) =>
      inv.id === editingInvestmentId ? { ...inv, ...investmentData } : inv,
    );

    editingInvestmentId = null;
    investmentForm.querySelector("button").textContent = "Add Investment";
  } else {
    investments.push({
      id: crypto.randomUUID(),
      ...investmentData,
    });
  }

  saveData();
  investmentForm.reset();
  renderApp();
});

function editInvestment(id) {
  const inv = investments.find((item) => item.id === id);
  if (!inv) return;

  editingInvestmentId = id;

  investmentAsset.value = inv.assetId;
  document.getElementById("investmentAmount").value = inv.amount;
  document.getElementById("investmentBuyPrice").value = inv.buyPrice;
  document.getElementById("investmentCurrentPrice").value = inv.currentPrice;
  document.getElementById("investmentDate").value = inv.date;

  investmentForm.querySelector("button").textContent = "Update Investment";
  window.scrollTo({ top: investmentForm.offsetTop - 120, behavior: "smooth" });
}

function deleteInvestment(id) {
  investments = investments.filter((inv) => inv.id !== id);

  saveData();
  renderApp();
}

if (themeToggle) {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "luxury") {
    document.body.classList.add("luxury-mode");
    themeToggle.textContent = "Classic Mode";
  }

  themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("luxury-mode");

    const isLuxury = document.body.classList.contains("luxury-mode");

    localStorage.setItem("theme", isLuxury ? "luxury" : "classic");
    themeToggle.textContent = isLuxury ? "Classic Mode" : "Luxury Mode";
  });
}

renderApp();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
