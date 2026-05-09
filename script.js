// ==========================
// SUPABASE CONNECTION
// ==========================

const SUPABASE_URL = "https://nagudofgvtbzcjprvedo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ILyLVZgAu-WVGCaniq7rGA_kZQ2ogtO";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================
// SELECTORS
// ==========================

const assetForm = document.getElementById("asset-form");
const assetEditIdInput = document.getElementById("asset-edit-id");
const assetFormTitle = document.getElementById("asset-form-title");
const assetSubmitBtn = document.getElementById("asset-submit-btn");
const assetCancelBtn = document.getElementById("asset-cancel-btn");

const assetNameInput = document.getElementById("asset-name");
const assetWknInput = document.getElementById("asset-wkn");
const assetIsinInput = document.getElementById("asset-isin");
const assetTickerInput = document.getElementById("asset-ticker");

const investmentForm = document.getElementById("investment-form");
const investmentEditIdInput = document.getElementById("investment-edit-id");
const investmentFormTitle = document.getElementById("investment-form-title");
const investmentSubmitBtn = document.getElementById("investment-submit-btn");
const investmentCancelBtn = document.getElementById("investment-cancel-btn");

const investmentAssetInput = document.getElementById("investment-asset");
const investmentDateInput = document.getElementById("investment-date");
const investmentAmountInput = document.getElementById("investment-amount");
const investmentBuyPriceInput = document.getElementById("investment-buy-price");
const investmentCurrentPriceInput = document.getElementById(
  "investment-current-price",
);

const assetsTableBody = document.getElementById("assets-table-body");
const investmentsTableBody = document.getElementById("investments-table-body");

const totalInvestedEl = document.getElementById("total-invested");
const totalCurrentValueEl = document.getElementById("total-current-value");
const totalProfitLossEl = document.getElementById("total-profit-loss");
const totalPerformanceEl = document.getElementById("total-performance");

// ==========================
// STATE
// ==========================

let assets = [];
let investments = [];

// ==========================
// HELPERS
// ==========================

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value, digits = 4) {
  return Number(value || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}

function getAssetName(assetId) {
  const asset = assets.find((item) => Number(item.id) === Number(assetId));
  return asset ? asset.name : "Unbekannt";
}

function getProfitClass(value) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function getMovementBadge(profitLoss) {
  if (profitLoss > 0) return `<span class="badge badge-up">▲ steigt</span>`;
  if (profitLoss < 0) return `<span class="badge badge-down">▼ fällt</span>`;
  return `<span class="badge badge-flat">▬ gleich</span>`;
}

// ==========================
// LOAD DATA
// ==========================

async function loadAssets() {
  const { data, error } = await db
    .from("assets")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Load assets error:", error);
    alert("Assets konnten nicht geladen werden.");
    return;
  }

  assets = data || [];
  renderAssets();
  renderAssetOptions();
}

async function loadInvestments() {
  const { data, error } = await db
    .from("investments")
    .select("*")
    .order("buy_date", { ascending: false });

  if (error) {
    console.error("Load investments error:", error);
    alert("Investments konnten nicht geladen werden.");
    return;
  }

  investments = data || [];
  renderInvestments();
  renderSummary();
}

async function loadApp() {
  await loadAssets();
  await loadInvestments();
}

// ==========================
// ASSET CREATE / UPDATE
// ==========================

assetForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const editId = assetEditIdInput.value;

  const assetData = {
    name: assetNameInput.value.trim(),
    wkn: assetWknInput.value.trim(),
    isin: assetIsinInput.value.trim(),
    ticker: assetTickerInput.value.trim(),
  };

  if (
    !assetData.name ||
    !assetData.wkn ||
    !assetData.isin ||
    !assetData.ticker
  ) {
    alert("Bitte alle Asset-Felder ausfüllen.");
    return;
  }

  let result;

  if (editId) {
    result = await db.from("assets").update(assetData).eq("id", editId);
  } else {
    result = await db.from("assets").insert([assetData]);
  }

  if (result.error) {
    console.error("Save asset error:", result.error);
    alert("Asset konnte nicht gespeichert werden.");
    return;
  }

  resetAssetForm();
  await loadAssets();
  await loadInvestments();
});

function editAsset(id) {
  const asset = assets.find((item) => Number(item.id) === Number(id));

  if (!asset) return;

  assetEditIdInput.value = asset.id;
  assetNameInput.value = asset.name;
  assetWknInput.value = asset.wkn;
  assetIsinInput.value = asset.isin;
  assetTickerInput.value = asset.ticker;

  assetFormTitle.textContent = "Asset bearbeiten";
  assetSubmitBtn.textContent = "Asset aktualisieren";
  assetCancelBtn.hidden = false;

  assetForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteAsset(id) {
  const confirmDelete = confirm(
    "Dieses Asset wirklich löschen? Zugehörige Investments bleiben aktuell noch bestehen.",
  );

  if (!confirmDelete) return;

  const { error } = await db.from("assets").delete().eq("id", id);

  if (error) {
    console.error("Delete asset error:", error);
    alert("Asset konnte nicht gelöscht werden.");
    return;
  }

  await loadAssets();
  await loadInvestments();
}

function resetAssetForm() {
  assetForm.reset();
  assetEditIdInput.value = "";
  assetFormTitle.textContent = "Asset hinzufügen";
  assetSubmitBtn.textContent = "Asset speichern";
  assetCancelBtn.hidden = true;
}

assetCancelBtn.addEventListener("click", resetAssetForm);

// ==========================
// INVESTMENT CREATE / UPDATE
// ==========================

investmentForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const editId = investmentEditIdInput.value;

  const investmentData = {
    asset_id: Number(investmentAssetInput.value),
    buy_date: investmentDateInput.value,
    amount: Number(investmentAmountInput.value),
    buy_price: Number(investmentBuyPriceInput.value),
    current_price: Number(investmentCurrentPriceInput.value),
  };

  if (
    !investmentData.asset_id ||
    !investmentData.buy_date ||
    investmentData.amount <= 0 ||
    investmentData.buy_price <= 0 ||
    investmentData.current_price <= 0
  ) {
    alert("Bitte alle Investment-Felder korrekt ausfüllen.");
    return;
  }

  let result;

  if (editId) {
    result = await db
      .from("investments")
      .update(investmentData)
      .eq("id", editId);
  } else {
    result = await db.from("investments").insert([investmentData]);
  }

  if (result.error) {
    console.error("Save investment error:", result.error);
    alert("Investment konnte nicht gespeichert werden.");
    return;
  }

  resetInvestmentForm();
  await loadInvestments();
});

function editInvestment(id) {
  const investment = investments.find((item) => Number(item.id) === Number(id));

  if (!investment) return;

  investmentEditIdInput.value = investment.id;
  investmentAssetInput.value = investment.asset_id;
  investmentDateInput.value = investment.buy_date;
  investmentAmountInput.value = investment.amount;
  investmentBuyPriceInput.value = investment.buy_price;
  investmentCurrentPriceInput.value = investment.current_price;

  investmentFormTitle.textContent = "Investment bearbeiten";
  investmentSubmitBtn.textContent = "Investment aktualisieren";
  investmentCancelBtn.hidden = false;

  investmentForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteInvestment(id) {
  const confirmDelete = confirm("Dieses Investment wirklich löschen?");

  if (!confirmDelete) return;

  const { error } = await db.from("investments").delete().eq("id", id);

  if (error) {
    console.error("Delete investment error:", error);
    alert("Investment konnte nicht gelöscht werden.");
    return;
  }

  await loadInvestments();
}

function resetInvestmentForm() {
  investmentForm.reset();
  investmentEditIdInput.value = "";
  investmentFormTitle.textContent = "Investment hinzufügen";
  investmentSubmitBtn.textContent = "Investment speichern";
  investmentCancelBtn.hidden = true;
}

investmentCancelBtn.addEventListener("click", resetInvestmentForm);

// ==========================
// RENDER ASSETS
// ==========================

function renderAssets() {
  assetsTableBody.innerHTML = "";

  if (assets.length === 0) {
    assetsTableBody.innerHTML = `
      <tr>
        <td colspan="6">Noch keine Assets gespeichert.</td>
      </tr>
    `;
    return;
  }

  assets.forEach(function (asset) {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${asset.name}</td>
      <td>${asset.wkn}</td>
      <td>${asset.isin}</td>
      <td>${asset.ticker}</td>
      <td>${asset.created_at ? new Date(asset.created_at).toLocaleDateString("de-DE") : "-"}</td>
      <td>
  <div class="actions">
    <button
      type="button"
      class="edit-btn"
      onclick="editAsset(${asset.id})"
    >
      Edit
    </button>

    <button
      type="button"
      class="delete-btn"
      onclick="deleteAsset(${asset.id})"
    >
      Delete
    </button>
  </div>
</td>
    `;

    assetsTableBody.appendChild(row);
  });
}

function renderAssetOptions() {
  const currentValue = investmentAssetInput.value;

  investmentAssetInput.innerHTML = `<option value="">Asset auswählen</option>`;

  assets.forEach(function (asset) {
    const option = document.createElement("option");
    option.value = asset.id;
    option.textContent = `${asset.name} (${asset.ticker})`;
    investmentAssetInput.appendChild(option);
  });

  investmentAssetInput.value = currentValue;
}

// ==========================
// RENDER INVESTMENTS
// ==========================

function renderInvestments() {
  investmentsTableBody.innerHTML = "";

  if (investments.length === 0) {
    investmentsTableBody.innerHTML = `
      <tr>
        <td colspan="10">Noch keine Investments gespeichert.</td>
      </tr>
    `;
    return;
  }

  investments.forEach(function (investment) {
    const units = investment.amount / investment.buy_price;
    const currentValue = units * investment.current_price;
    const profitLoss = currentValue - investment.amount;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${new Date(investment.buy_date).toLocaleDateString("de-DE")}</td>
      <td>${getAssetName(investment.asset_id)}</td>
      <td>${formatCurrency(investment.amount)}</td>
      <td>${formatCurrency(investment.buy_price)}</td>
      <td>${formatNumber(units, 4)}</td>
      <td>${formatCurrency(investment.current_price)}</td>
      <td>${formatCurrency(currentValue)}</td>
      <td class="${getProfitClass(profitLoss)}">${formatCurrency(profitLoss)}</td>
      <td>${getMovementBadge(profitLoss)}</td>
     <td>
  <div class="actions">
    <button
      type="button"
      class="edit-btn"
      onclick="editInvestment(${investment.id})"
    >
      Edit
    </button>

    <button
      type="button"
      class="delete-btn"
      onclick="deleteInvestment(${investment.id})"
    >
      Delete
    </button>
  </div>
</td> 
    `;

    investmentsTableBody.appendChild(row);
  });
}

// ==========================
// SUMMARY
// ==========================

function renderSummary() {
  let totalInvested = 0;
  let totalCurrentValue = 0;

  investments.forEach(function (investment) {
    const units = investment.amount / investment.buy_price;
    const currentValue = units * investment.current_price;

    totalInvested += Number(investment.amount);
    totalCurrentValue += currentValue;
  });

  const profitLoss = totalCurrentValue - totalInvested;
  const performance =
    totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

  totalInvestedEl.textContent = formatCurrency(totalInvested);
  totalCurrentValueEl.textContent = formatCurrency(totalCurrentValue);
  totalProfitLossEl.textContent = formatCurrency(profitLoss);
  totalPerformanceEl.textContent = formatPercent(performance);

  totalProfitLossEl.className = getProfitClass(profitLoss);
  totalPerformanceEl.className = getProfitClass(performance);
}

// ==========================
// MAKE FUNCTIONS AVAILABLE FOR BUTTONS
// ==========================

window.editAsset = editAsset;
window.deleteAsset = deleteAsset;
window.editInvestment = editInvestment;
window.deleteInvestment = deleteInvestment;

// ==========================
// INIT
// ==========================

loadApp();
