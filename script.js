let assets = JSON.parse(localStorage.getItem("assets")) || [];
let investments = JSON.parse(localStorage.getItem("investments")) || [];
let snapshots = JSON.parse(localStorage.getItem("snapshots")) || [];

const assetForm = document.getElementById("assetForm");
const investmentForm = document.getElementById("investmentForm");
const valueUpdateForm = document.getElementById("valueUpdateForm");

const assetsTable = document.getElementById("assetsTable");
const investmentsTable = document.getElementById("investmentsTable");

const investmentAsset = document.getElementById("investmentAsset");
const valueAsset = document.getElementById("valueAsset");

const totalInvestedEl = document.getElementById("totalInvested");
const totalValueEl = document.getElementById("totalValue");
const totalProfitEl = document.getElementById("totalProfit");
const totalReturnEl = document.getElementById("totalReturn");

let allocationChart;
let growthChart;
let investedChart;
let profitChart;

function saveData() {
  localStorage.setItem("assets", JSON.stringify(assets));
  localStorage.setItem("investments", JSON.stringify(investments));
  localStorage.setItem("snapshots", JSON.stringify(snapshots));
}

function formatEuro(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}

function getAssetById(id) {
  return assets.find(asset => asset.id === id);
}

function getAssetValue(assetId) {
  const assetSnapshots = snapshots
    .filter(snapshot => snapshot.assetId === assetId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (assetSnapshots.length > 0) {
    return assetSnapshots[0].value;
  }

  return investments
    .filter(inv => inv.assetId === assetId)
    .reduce((sum, inv) => sum + inv.currentValue, 0);
}

function getTotalInvested() {
  return investments.reduce((sum, inv) => sum + inv.amount, 0);
}

function getTotalValue() {
  return assets.reduce((sum, asset) => sum + getAssetValue(asset.id), 0);
}

function renderAssetOptions() {
  investmentAsset.innerHTML = `<option value="">Select asset</option>`;
  valueAsset.innerHTML = `<option value="">Select asset</option>`;

  assets.forEach(asset => {
    const option1 = document.createElement("option");
    option1.value = asset.id;
    option1.textContent = asset.name;
    investmentAsset.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = asset.id;
    option2.textContent = asset.name;
    valueAsset.appendChild(option2);
  });
}

function renderAssets() {
  assetsTable.innerHTML = "";

  const totalValue = getTotalValue();

  assets.forEach(asset => {
    const value = getAssetValue(asset.id);
    const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${asset.name}</td>
      <td>${asset.wkn || "-"}</td>
      <td>${asset.isin}</td>
      <td>${asset.ticker || "-"}</td>
      <td>${formatEuro(value)}</td>
      <td>${allocation.toFixed(2)}%</td>
      <td>
        <button class="delete-btn" onclick="deleteAsset('${asset.id}')">
          Delete
        </button>
      </td>
    `;

    assetsTable.appendChild(tr);
  });
}

function renderInvestments() {
  investmentsTable.innerHTML = "";

  investments.forEach(inv => {
    const asset = getAssetById(inv.assetId);
    const profit = inv.currentValue - inv.amount;
    const profitClass = profit >= 0 ? "positive" : "negative";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${inv.date}</td>
      <td>${asset ? asset.name : "Unknown asset"}</td>
      <td>${formatEuro(inv.amount)}</td>
      <td>${formatEuro(inv.currentValue)}</td>
      <td class="${profitClass}">${formatEuro(profit)}</td>
      <td>
        <button class="delete-btn" onclick="deleteInvestment('${inv.id}')">
          Delete
        </button>
      </td>
    `;

    investmentsTable.appendChild(tr);
  });
}

function renderOverview() {
  const totalInvested = getTotalInvested();
  const totalValue = getTotalValue();
  const profit = totalValue - totalInvested;
  const returnPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

  totalInvestedEl.textContent = formatEuro(totalInvested);
  totalValueEl.textContent = formatEuro(totalValue);
  totalProfitEl.textContent = formatEuro(profit);
  totalReturnEl.textContent = `${returnPercent.toFixed(2)}%`;

  totalProfitEl.className = profit >= 0 ? "positive" : "negative";
  totalReturnEl.className = profit >= 0 ? "positive" : "negative";
}

function renderAllocationChart() {
  const labels = assets.map(asset => asset.name);
  const data = assets.map(asset => getAssetValue(asset.id));

  const ctx = document.getElementById("allocationChart");

  if (allocationChart) {
    allocationChart.destroy();
  }

  allocationChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data
        }
      ]
    }
  });
}

function getPortfolioValueByDate(date) {
  let total = 0;

  assets.forEach(asset => {
    const latestSnapshot = snapshots
      .filter(snapshot => snapshot.assetId === asset.id && snapshot.date <= date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (latestSnapshot) {
      total += latestSnapshot.value;
    } else {
      total += investments
        .filter(inv => inv.assetId === asset.id && inv.date <= date)
        .reduce((sum, inv) => sum + inv.currentValue, 0);
    }
  });

  return total;
}

function getInvestedByDate(date) {
  return investments
    .filter(inv => inv.date <= date)
    .reduce((sum, inv) => sum + inv.amount, 0);
}

function getTrackingDates() {
  const dates = [
    ...investments.map(inv => inv.date),
    ...snapshots.map(snapshot => snapshot.date)
  ];

  return [...new Set(dates)].sort();
}

function renderGrowthChart() {
  const labels = getTrackingDates();
  const data = labels.map(date => getPortfolioValueByDate(date));

  const ctx = document.getElementById("growthChart");

  if (growthChart) {
    growthChart.destroy();
  }

  growthChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Portfolio Value",
          data,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true
    }
  });
}

function renderInvestedChart() {
  const invested = getTotalInvested();
  const currentValue = getTotalValue();

  const ctx = document.getElementById("investedChart");

  if (investedChart) {
    investedChart.destroy();
  }

  investedChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Invested", "Current Value"],
      datasets: [
        {
          label: "€",
          data: [invested, currentValue]
        }
      ]
    }
  });
}

function renderProfitChart() {
  const labels = getTrackingDates();

  const data = labels.map(date => {
    const value = getPortfolioValueByDate(date);
    const invested = getInvestedByDate(date);
    return value - invested;
  });

  const ctx = document.getElementById("profitChart");

  if (profitChart) {
    profitChart.destroy();
  }

  profitChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Profit / Loss",
          data,
          tension: 0.3
        }
      ]
    }
  });
}

function renderApp() {
  renderAssetOptions();
  renderAssets();
  renderInvestments();
  renderOverview();
  renderAllocationChart();
  renderGrowthChart();
  renderInvestedChart();
  renderProfitChart();
}

assetForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const newAsset = {
    id: crypto.randomUUID(),
    name: document.getElementById("assetName").value.trim(),
    wkn: document.getElementById("assetWkn").value.trim(),
    isin: document.getElementById("assetIsin").value.trim(),
    ticker: document.getElementById("assetTicker").value.trim()
  };

  assets.push(newAsset);
  saveData();
  assetForm.reset();
  renderApp();
});

investmentForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const newInvestment = {
    id: crypto.randomUUID(),
    assetId: investmentAsset.value,
    amount: Number(document.getElementById("investmentAmount").value),
    currentValue: Number(document.getElementById("investmentCurrentValue").value),
    date: document.getElementById("investmentDate").value
  };

  investments.push(newInvestment);

  snapshots.push({
    id: crypto.randomUUID(),
    assetId: investmentAsset.value,
    value: Number(document.getElementById("investmentCurrentValue").value),
    date: document.getElementById("investmentDate").value
  });

  saveData();
  investmentForm.reset();
  renderApp();
});

valueUpdateForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const newSnapshot = {
    id: crypto.randomUUID(),
    assetId: valueAsset.value,
    value: Number(document.getElementById("newCurrentValue").value),
    date: document.getElementById("valueDate").value
  };

  snapshots.push(newSnapshot);

  saveData();
  valueUpdateForm.reset();
  renderApp();
});

function deleteAsset(id) {
  assets = assets.filter(asset => asset.id !== id);
  investments = investments.filter(inv => inv.assetId !== id);
  snapshots = snapshots.filter(snapshot => snapshot.assetId !== id);

  saveData();
  renderApp();
}

function deleteInvestment(id) {
  investments = investments.filter(inv => inv.id !== id);

  saveData();
  renderApp();
}

renderApp();