// Company_A.js — safe trading with live price
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwoFYK02R7rVoiu6H1Hxg2yulNobslRKsH2eF1_NvkNpbHO9PdvKeCxANhNA_XnNCbI/exec";
const company = "CompanyB";

// ---- State ----
let price  = parseFloat(localStorage.getItem(`${company}_price`)) || 522;
let cash   = parseInt(localStorage.getItem("cash")) || 100000;
let shares = parseInt(localStorage.getItem(`${company}_shares`)) || 0;

// ---- Elements ----
const priceEl  = document.getElementById("price");
const cashEl   = document.getElementById("cash");
const sharesEl = document.getElementById("shares");
const valueEl  = document.getElementById("value");
const qtyEl    = document.getElementById("quantity");
const buyBtn   = document.getElementById("buyBtn");
const sellBtn  = document.getElementById("sellBtn");

// ---- Helpers ----
const fmtINR = (n) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function updatePortfolioUI() {
  const total = cash + shares * price;
  cashEl.textContent   = fmtINR(cash);
  sharesEl.textContent = shares;
  valueEl.textContent  = fmtINR(total);
}

function setPriceDisplay(p) {
  priceEl.textContent = `₹${Number(p).toFixed(2)}`;
}

// ---- Fetch price (single-writer, no overlap) ----
let fetching = false;
let firstFetchDone = false;

// disable trading until first fetch
buyBtn.disabled = true;
sellBtn.disabled = true;

async function fetchPriceOnce() {
  if (fetching) return;
  fetching = true;
  try {
    const url = `${SCRIPT_URL}?mode=getPrice&company=${encodeURIComponent(company)}`;
    const res = await fetch(url, { cache: "no-store" });
    const txt = await res.text();
    const num = parseFloat(txt);

    if (!isNaN(num) && isFinite(num)) {
      if (num !== price) {
        price = num;
        localStorage.setItem(`${company}_price`, String(price));
        setPriceDisplay(price);
        updatePortfolioUI();
      }
      // ✅ enable trading once we have a fresh price
      if (!firstFetchDone) {
        buyBtn.disabled = false;
        sellBtn.disabled = false;
        firstFetchDone = true;
      }
    } else {
      console.error("Bad price from server:", txt);
    }
  } catch (err) {
    console.error("fetchPrice error:", err);
  } finally {
    fetching = false;
  }
}

// ---- Start-up: show cached immediately, then fetch fresh ----
setPriceDisplay(price);
updatePortfolioUI();

// Ensure only ONE interval exists
if (!window.__companyPriceTimers) window.__companyPriceTimers = {};
if (!window.__companyPriceTimers[company]) {
  window.__companyPriceTimers[company] = setInterval(fetchPriceOnce, 2000); // every 2s
  fetchPriceOnce(); // run immediately
}

// ---- Buy / Sell ----
buyBtn.addEventListener("click", () => {
  const qty = parseInt(qtyEl.value) || 0;
  if (qty <= 0) return alert("Enter a valid number of shares!");

  const cost = qty * price;
  if (cash >= cost) {
    cash -= cost;
    shares += qty;
    localStorage.setItem("cash", String(cash));
    localStorage.setItem(`${company}_shares`, String(shares));
    updatePortfolioUI();
  } else {
    alert("Not enough cash!");
  }
});

sellBtn.addEventListener("click", () => {
  const qty = parseInt(qtyEl.value) || 0;
  if (qty <= 0) return alert("Enter a valid number of shares!");
  if (shares < qty) return alert("You don't own that many shares!");

  const revenue = qty * price;
  cash += revenue;
  shares -= qty;
  localStorage.setItem("cash", String(cash));
  localStorage.setItem(`${company}_shares`, String(shares));
  updatePortfolioUI();
});
