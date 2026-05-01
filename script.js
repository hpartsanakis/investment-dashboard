const assetNameInput = document.getElementById("assetName");
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

const apiKeyInput = document.getElementById("apiKey");
const fetchPriceBtn = document.getElementById("fetchPrice");

const assetSearchInput = document.getElementById("assetSearch");
const searchAssetBtn = document.getElementById("searchAsset");
const searchResults = document.getElementById("searchResults");

let investments = JSON.parse(localStorage.getItem("investments")) || [];

async function searchAsset() {
  const query = assetSearchInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!query) {
    alert("Bitte Name, ISIN, WKN oder Ticker eingeben.");
    return;
  }

  if (!apiKey) {
    alert("Bitte Twelve Data API Key eingeben.");
    return;
  }

  try {
    const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(
      query,
    )}&apikey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    searchResults.innerHTML = "";

    if (!data.data || data.data.length === 0) {
      searchResults.innerHTML = "<p>Kein Wertpapier gefunden.</p>";
      return;
    }

    data.data.slice(0, 5).forEach((asset) => {
      const button = document.createElement("button");
      button.type = "button";

      button.textContent = `${asset.instrument_name} | ${asset.symbol} | ${asset.exchange}`;

      button.addEventListener("click", () => {
        assetNameInput.value = asset.symbol;
        assetSearchInput.value = `${asset.instrument_name} (${asset.symbol})`;
        searchResults.innerHTML = "";
      });

      searchResults.appendChild(button);
    });
  } catch (error) {
    console.error(error);
    alert("Suche fehlgeschlagen.");
  }
}

searchAssetBtn.addEventListener("click", searchAsset);

function calculateUnits() {
  const monthlyInvestment = Number(monthlyInvestmentInput.value);
  const buyPrice = Number(buyPriceInput.value);

  if (monthlyInvestment > 0 && buyPrice > 0) {
    unitsInput.value = (monthlyInvestment / buyPrice).toFixed(4);
  } else {
    unitsInput.value = "";
  }
}

async function fetchLivePrice() {
  const symbol = assetNameInput.value;
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    alert("Bitte Twelve Data API Key eingeben.");
    return;
  }

  try {
    const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.close) {
      alert("Kein Preis gefunden. Prüfe Symbol oder API Key.");
      console.log(data);
      return;
    }

    fetchPriceBtn.addEventListener("click", fetchLivePrice);

    currentPriceInput.value = Number(data.close).toFixed(2);
    calculateUnits();
  } catch (error) {
    alert("Live Preis konnte nicht geladen werden.");
    console.error(error);
  }
}

function addInvestment() {
  calculateUnits();

  const assetName = assetNameInput.value;
  const investedAmount = Number(monthlyInvestmentInput.value);
  const buyPrice = Number(buyPriceInput.value);
  const currentPrice = Number(currentPriceInput.value);
  const units = Number(unitsInput.value);

  if (investedAmount <= 0 || buyPrice <= 0 || currentPrice <= 0 || units <= 0) {
    alert("Bitte alle Felder korrekt ausfüllen.");
    return;
  }

  const newInvestment = {
    id: Date.now(),
    date: new Date().toLocaleDateString("de-DE"),
    assetName: assetName,
    investedAmount: investedAmount,
    buyPrice: buyPrice,
    currentPrice: currentPrice,
    units: units,
  };

  investments.push(newInvestment);
  saveInvestments();
  renderInvestments();
  clearInputs();
}

function renderInvestments() {
  investmentList.innerHTML = "";

  let totalInvested = 0;
  let totalValue = 0;
  let totalUnits = 0;

  investments.forEach(function (investment) {
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
      <p>Investiert: ${investment.investedAmount.toFixed(2)} €</p>
      <p>Kaufpreis: ${investment.buyPrice.toFixed(2)} €</p>
      <p>Aktueller Preis: ${investment.currentPrice.toFixed(2)} €</p>
      <p>Units: ${investment.units.toFixed(4)}</p>
      <p>Aktueller Wert: ${currentValue.toFixed(2)} €</p>
      <p>Gewinn / Verlust: ${profit.toFixed(2)} €</p>
      <hr>
    `;

    investmentList.appendChild(item);
  });

  totalInvestedDisplay.textContent = totalInvested.toFixed(2) + " €";
  totalValueDisplay.textContent = totalValue.toFixed(2) + " €";
  totalProfitDisplay.textContent =
    (totalValue - totalInvested).toFixed(2) + " €";
  totalUnitsDisplay.textContent = totalUnits.toFixed(4);
}

function saveInvestments() {
  localStorage.setItem("investments", JSON.stringify(investments));
}

function clearInputs() {
  monthlyInvestmentInput.value = "";
  buyPriceInput.value = "";
  currentPriceInput.value = "";
  unitsInput.value = "";
}

function resetAll() {
  investments = [];
  saveInvestments();
  renderInvestments();
}

monthlyInvestmentInput.addEventListener("input", calculateUnits);
buyPriceInput.addEventListener("input", calculateUnits);
addInvestmentBtn.addEventListener("click", addInvestment);
resetAllBtn.addEventListener("click", resetAll);

renderInvestments();
