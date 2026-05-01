const assetNameInput = document.getElementById("assetName");
const assetWknInput = document.getElementById("assetWkn");
const assetIsinInput = document.getElementById("assetIsin");
const assetTickerInput = document.getElementById("assetTicker");

const addAssetBtn = document.getElementById("addAsset");
const assetList = document.getElementById("assetList");

const investmentAssetInput = document.getElementById("investmentAsset");
const monthlyInvestmentInput = document.getElementById("monthlyInvestment");
const buyPriceInput = document.getElementById("buyPrice");
const currentPriceInput = document.getElementById("currentPrice");
const unitsInput = document.getElementById("units");

const addInvestmentBtn = document.getElementById("addInvestment");
const resetAllBtn = document.getElementById("resetAll");

const totalInvestedDisplay = document.getElementById("totalInvested");
const totalValueDisplay = document.getElementById("totalValue");
const totalProfitDisplay = document.getElementById("totalProfit");
const totalUnitsDisplay = document.getElementById("totalUnits");
const investmentList = document.getElementById("investmentList");

let assets = JSON.parse(localStorage.getItem("assets")) || [];
let investments = JSON.parse(localStorage.getItem("investments")) || [];

function addAsset() {
  const name = assetNameInput.value.trim();
  const wkn = assetWknInput.value.trim().toUpperCase();
  const isin = assetIsinInput.value.trim().toUpperCase();
  const ticker = assetTickerInput.value.trim().toUpperCase();

  if (!name || !wkn || !isin || !ticker) {
    alert("Bitte Name, WKN, ISIN und Ticker ausfüllen.");
    return;
  }

  const asset = {
    id: Date.now(),
    name,
    wkn,
    isin,
    ticker,
  };

  assets.push(asset);
  saveAssets();
  renderAssets();
  updateAssetSelect();
  clearAssetForm();
}

function renderAssets() {
  assetList.innerHTML = "";

  assets.forEach((asset) => {
    const item = document.createElement("div");
    item.classList.add("investment-item");

    item.innerHTML = `
      <h3>${asset.name}</h3>
      <p>WKN: ${asset.wkn}</p>
      <p>ISIN: ${asset.isin}</p>
      <p>Ticker: ${asset.ticker}</p>
      <hr />
    `;

    assetList.appendChild(item);
  });
}

function updateAssetSelect() {
  if (!investmentAssetInput) return;

  investmentAssetInput.innerHTML = "";

  if (assets.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Noch kein Asset gespeichert";
    investmentAssetInput.appendChild(option);
    return;
  }

  assets.forEach((asset) => {
    const option = document.createElement("option");
    option.value = asset.id;
    option.textContent = `${asset.name} (${asset.ticker})`;
    investmentAssetInput.appendChild(option);
  });
}

function saveAssets() {
  localStorage.setItem("assets", JSON.stringify(assets));
}

function clearAssetForm() {
  assetNameInput.value = "";
  assetWknInput.value = "";
  assetIsinInput.value = "";
  assetTickerInput.value = "";
}

function calculateUnits() {
  const monthlyInvestment = Number(monthlyInvestmentInput.value);
  const buyPrice = Number(buyPriceInput.value);

  if (monthlyInvestment > 0 && buyPrice > 0) {
    unitsInput.value = (monthlyInvestment / buyPrice).toFixed(4);
  } else {
    unitsInput.value = "";
  }
}

function addInvestment() {
  calculateUnits();

  const selectedAssetId = Number(investmentAssetInput.value);
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);

  const investedAmount = Number(monthlyInvestmentInput.value);
  const buyPrice = Number(buyPriceInput.value);
  const currentPrice = Number(currentPriceInput.value);
  const units = Number(unitsInput.value);

  if (!selectedAsset) {
    alert("Bitte zuerst ein Asset auswählen.");
    return;
  }

  if (investedAmount <= 0 || buyPrice <= 0 || currentPrice <= 0 || units <= 0) {
    alert("Bitte Investmentbetrag, Kaufpreis und aktuellen Preis korrekt eingeben.");
    return;
  }

  const investment = {
    id: Date.now(),
    date: new Date().toLocaleDateString("de-DE"),
    assetId: selectedAsset.id,
    assetName: selectedAsset.name,
    wkn: selectedAsset.wkn,
    isin: selectedAsset.isin,
    ticker: selectedAsset.ticker,
    investedAmount,
    buyPrice,
    currentPrice,
    units,
  };

  investments.push(investment);
  saveInvestments();
  renderInvestments();
  clearInvestmentForm();
}

function renderInvestments() {
  investmentList.innerHTML = "";

  let totalInvested = 0;
  let totalValue = 0;
  let totalUnits = 0;

  investments.forEach((investment) => {
    const currentValue = investment.units * investment.currentPrice;
    const profit = currentValue - investment.investedAmount;

    totalInvested += investment.investedAmount;
    totalValue += currentValue;
    totalUnits += investment.units;

    const item = document.createElement("div");
    item.classList.add("investment-item");

    item.innerHTML = `
      <h3>${investment.assetName}</h3>
      <p>Datum: ${investment.date}</p>
      <p>WKN: ${investment.wkn}</p>
      <p>ISIN: ${investment.isin}</p>
      <p>Ticker: ${investment.ticker}</p>
      <p>Investiert: ${investment.investedAmount.toFixed(2)} €</p>
      <p>Kaufpreis: ${investment.buyPrice.toFixed(2)} €</p>
      <p>Aktueller Preis: ${investment.currentPrice.toFixed(2)} €</p>
      <p>Units: ${investment.units.toFixed(4)}</p>
      <p>Aktueller Wert: ${currentValue.toFixed(2)} €</p>
      <p>Gewinn / Verlust: ${profit.toFixed(2)} €</p>
      <hr />
    `;

    investmentList.appendChild(item);
  });

  totalInvestedDisplay.textContent = totalInvested.toFixed(2) + " €";
  totalValueDisplay.textContent = totalValue.toFixed(2) + " €";
  totalProfitDisplay.textContent = (totalValue - totalInvested).toFixed(2) + " €";
  totalUnitsDisplay.textContent = totalUnits.toFixed(4);
}

function saveInvestments() {
  localStorage.setItem("investments", JSON.stringify(investments));
}

function clearInvestmentForm() {
  monthlyInvestmentInput.value = "";
  buyPriceInput.value = "";
  currentPriceInput.value = "";
  unitsInput.value = "";
}

function resetAll() {
  const confirmReset = confirm("Willst du wirklich alle Investments löschen?");

  if (!confirmReset) return;

  investments = [];
  saveInvestments();
  renderInvestments();
}

addAssetBtn.addEventListener("click", addAsset);

monthlyInvestmentInput.addEventListener("input", calculateUnits);
buyPriceInput.addEventListener("input", calculateUnits);

addInvestmentBtn.addEventListener("click", addInvestment);
resetAllBtn.addEventListener("click", resetAll);

renderAssets();
updateAssetSelect();
renderInvestments();