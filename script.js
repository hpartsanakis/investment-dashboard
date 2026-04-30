const totalValueElement = document.getElementById("totalValue");
const totalInvestedElement = document.getElementById("totalInvested");
const profitLossElement = document.getElementById("profitLoss");
const portfolioList = document.getElementById("portfolioList");

function formatEuro(value) {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR"
  });
}

function calculateTotals() {
  const totalInvested = portfolio.reduce((sum, item) => {
    return sum + item.amountInvested;
  }, 0);

  const totalValue = portfolio.reduce((sum, item) => {
    return sum + item.currentValue;
  }, 0);

  const profitLoss = totalValue - totalInvested;

  totalInvestedElement.textContent = formatEuro(totalInvested);
  totalValueElement.textContent = formatEuro(totalValue);
  profitLossElement.textContent = formatEuro(profitLoss);

  profitLossElement.className = profitLoss >= 0 ? "positive" : "negative";
}

function renderPortfolio() {
  portfolioList.innerHTML = "";

  portfolio.forEach((item) => {
    const profitLoss = item.currentValue - item.amountInvested;
    const profitLossClass = profitLoss >= 0 ? "positive" : "negative";

    const assetElement = document.createElement("div");
    assetElement.className = "asset";

    assetElement.innerHTML = `
      <div>
        <strong>${item.name}</strong><br>
        <small>${item.type} · ${item.isin}</small>
      </div>
      <div>${formatEuro(item.amountInvested)}</div>
      <div>${formatEuro(item.currentValue)}</div>
      <div class="${profitLossClass}">${formatEuro(profitLoss)}</div>
    `;

    portfolioList.appendChild(assetElement);
  });
}

calculateTotals();
renderPortfolio();