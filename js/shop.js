const data = window.NBC_SHOP_DATA;
const state = {
  query: "",
  category: "all",
  gender: "all",
  price: "all",
  cart: []
};

const sizeSets = {
  Kinder: ["116", "128", "140", "152", "164"],
  Damen: ["XS", "S", "M", "L", "XL", "XXL"],
  Herren: ["S", "M", "L", "XL", "XXL", "3XL"],
  Unisex: ["S", "M", "L", "XL", "XXL"]
};

const els = {
  intro: document.querySelector("#shopIntro"),
  grid: document.querySelector("#productGrid"),
  resultCount: document.querySelector("#resultCount"),
  search: document.querySelector("#searchInput"),
  category: document.querySelector("#categoryFilter"),
  gender: document.querySelector("#genderFilter"),
  price: document.querySelector("#priceFilter"),
  reset: document.querySelector("#resetFilters"),
  cartPanel: document.querySelector("#cartPanel"),
  cartToggle: document.querySelector("#cartToggle"),
  closeCart: document.querySelector("#closeCart"),
  cartCount: document.querySelector("#cartCount"),
  cartItems: document.querySelector("#cartItems"),
  cartQuantity: document.querySelector("#cartQuantity"),
  cartTotal: document.querySelector("#cartTotal"),
  dialog: document.querySelector("#productDialog"),
  detail: document.querySelector("#productDetail"),
  copyOrder: document.querySelector("#copyOrder"),
  toast: document.querySelector("#toast")
};

function money(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}

function productImage(product) {
  if (product.image) return product.image;
  const label = encodeURIComponent(product.category || "NBC");
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 450'%3E%3Crect width='600' height='450' fill='%23eef0f4'/%3E%3Ccircle cx='300' cy='190' r='76' fill='%23c91428'/%3E%3Cpath d='M224 190h152M300 114v152M246 136c36 36 72 72 108 108M354 136c-36 36-72 72-108 108' stroke='white' stroke-width='12' stroke-linecap='round'/%3E%3Ctext x='300' y='330' text-anchor='middle' font-family='Arial,sans-serif' font-size='30' font-weight='700' fill='%2317171a'%3E${label}%3C/text%3E%3C/svg%3E`;
}

function shortIntro(text) {
  return "Stelle deine NBC-Teamwear übersichtlich zusammen. Die Liste ersetzt noch keinen offiziellen Checkout, macht Auswahl, Größen und Veredelung aber deutlich sauberer als der externe Shop.";
}

function option(value, label) {
  const el = document.createElement("option");
  el.value = value;
  el.textContent = label;
  return el;
}

function productSearchText(product) {
  return [
    product.name,
    product.brand,
    product.number,
    product.category,
    product.gender,
    ...(product.colors || [])
  ].join(" ").toLowerCase();
}

function filteredProducts() {
  const query = state.query.trim().toLowerCase();
  return data.products.filter((product) => {
    const matchesQuery = !query || productSearchText(product).includes(query);
    const matchesCategory = state.category === "all" || product.categorySlug === state.category;
    const matchesGender = state.gender === "all" || product.gender === state.gender;
    const matchesPrice = state.price === "all" || product.priceNum <= Number(state.price);
    return matchesQuery && matchesCategory && matchesGender && matchesPrice;
  });
}

function renderFilters() {
  els.category.replaceChildren(option("all", "Alle Kategorien"));
  data.categories.forEach((category) => {
    els.category.append(option(category.slug, category.name));
  });

  els.gender.replaceChildren(option("all", "Alle Zielgruppen"));
  [...new Set(data.products.map((product) => product.gender))].sort().forEach((gender) => {
    els.gender.append(option(gender, gender));
  });
}

function renderProducts() {
  const products = filteredProducts();
  els.resultCount.textContent = `${products.length} ${products.length === 1 ? "Produkt" : "Produkte"}`;

  if (!products.length) {
    els.grid.innerHTML = `<p class="cart-empty">Keine Produkte für diese Filter gefunden.</p>`;
    return;
  }

  els.grid.replaceChildren(...products.map((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <figure><img src="${productImage(product)}" alt="${product.name}" loading="lazy"></figure>
      <div class="product-info">
        <div class="meta">
          <span class="pill">${product.category}</span>
          <span class="pill">${product.gender}</span>
        </div>
        <h2 class="product-title">${product.name}</h2>
        <span class="pill">${product.number}</span>
        <div class="product-price">${product.price}</div>
        <div class="product-actions">
          <button type="button" data-detail="${product.slug}">Details</button>
          <button type="button" data-quick="${product.slug}">Hinzufügen</button>
        </div>
      </div>
    `;
    return card;
  }));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function sizesFor(product) {
  return sizeSets[product.gender] || sizeSets.Unisex;
}

function addToCart(product, size, quantity) {
  if (!quantity || quantity < 1) return;
  const key = `${product.slug}-${size}`;
  const existing = state.cart.find((item) => item.key === key);
  if (existing) {
    existing.quantity += quantity;
  } else {
    state.cart.push({
      key,
      slug: product.slug,
      name: product.name,
      number: product.number,
      image: productImage(product),
      priceNum: product.priceNum,
      size,
      quantity
    });
  }
  renderCart();
  showToast(`${quantity}x ${product.name} (${size}) hinzugefügt`);
}

function openDetail(product) {
  const sizes = sizesFor(product);
  els.detail.innerHTML = `
    <img src="${productImage(product)}" alt="${product.name}">
    <div>
      <div class="meta">
        <span class="pill">${product.category}</span>
        <span class="pill">${product.gender}</span>
        <span class="pill">${product.number}</span>
      </div>
      <h2>${product.name}</h2>
      <p class="product-price">${product.price}</p>
      <p>${(product.description || "").replaceAll("\n", "<br>")}</p>
      <p><strong>Farben:</strong> ${(product.colors || []).join(", ") || "Keine Angabe"}</p>
      <div class="size-grid">
        ${sizes.map((size, index) => `
          <label>
            ${size}
            <input type="number" min="0" max="99" value="${index === 0 ? 1 : 0}" data-size="${size}">
          </label>
        `).join("")}
      </div>
      <div class="product-actions">
        <button type="button" data-add-detail="${product.slug}">In den Warenkorb</button>
        <a href="${product.url}" target="_blank" rel="noreferrer">Original ansehen</a>
      </div>
    </div>
  `;
  els.dialog.showModal();
}

function renderCart() {
  const quantity = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = state.cart.reduce((sum, item) => sum + item.quantity * item.priceNum, 0);

  els.cartCount.textContent = quantity;
  els.cartQuantity.textContent = quantity;
  els.cartTotal.textContent = money(total);

  if (!state.cart.length) {
    els.cartItems.innerHTML = `<p class="cart-empty">Noch keine Artikel im Warenkorb.</p>`;
    return;
  }

  els.cartItems.replaceChildren(...state.cart.map((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <img src="${item.image}" alt="">
      <div>
        <strong>${item.name}</strong>
        <span>${item.quantity}x Größe ${item.size} · ${money(item.priceNum)}</span>
      </div>
      <button type="button" aria-label="Artikel entfernen" data-remove="${item.key}">×</button>
    `;
    return row;
  }));
}

function copyOrder() {
  if (!state.cart.length) {
    showToast("Der Warenkorb ist leer.");
    return;
  }

  const total = state.cart.reduce((sum, item) => sum + item.quantity * item.priceNum, 0);
  const lines = [
    "NBC Baskets Nordhorn Teamshop Bestellung",
    "",
    ...state.cart.map((item) => `${item.quantity}x ${item.name} | Art. ${item.number} | Größe ${item.size} | ${money(item.priceNum)}`),
    "",
    `Summe: ${money(total)}`,
    `Vereinsname: ${document.querySelector("#clubPrint").checked ? "ja" : "nein"}`,
    `Initialen: ${document.querySelector("#initialsPrint").checked ? document.querySelector("#initialsValue").value || "ja" : "nein"}`,
    `Nummer: ${document.querySelector("#numberPrint").checked ? document.querySelector("#numberValue").value || "ja" : "nein"}`
  ];

  navigator.clipboard.writeText(lines.join("\n"))
    .then(() => showToast("Bestellübersicht kopiert."))
    .catch(() => showToast("Kopieren nicht möglich. Text bitte manuell markieren."));
}

function bindEvents() {
  els.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderProducts();
  });
  els.category.addEventListener("change", (event) => {
    state.category = event.target.value;
    renderProducts();
  });
  els.gender.addEventListener("change", (event) => {
    state.gender = event.target.value;
    renderProducts();
  });
  els.price.addEventListener("change", (event) => {
    state.price = event.target.value;
    renderProducts();
  });
  els.reset.addEventListener("click", () => {
    state.query = "";
    state.category = "all";
    state.gender = "all";
    state.price = "all";
    els.search.value = "";
    els.category.value = "all";
    els.gender.value = "all";
    els.price.value = "all";
    renderProducts();
  });
  els.grid.addEventListener("click", (event) => {
    const detailSlug = event.target.closest("[data-detail]")?.dataset.detail;
    const quickSlug = event.target.closest("[data-quick]")?.dataset.quick;
    if (detailSlug) {
      openDetail(data.products.find((product) => product.slug === detailSlug));
    }
    if (quickSlug) {
      const product = data.products.find((item) => item.slug === quickSlug);
      addToCart(product, sizesFor(product)[0], 1);
    }
  });
  els.detail.addEventListener("click", (event) => {
    const slug = event.target.closest("[data-add-detail]")?.dataset.addDetail;
    if (!slug) return;
    const product = data.products.find((item) => item.slug === slug);
    els.detail.querySelectorAll("[data-size]").forEach((input) => {
      addToCart(product, input.dataset.size, Number(input.value));
    });
    els.dialog.close();
  });
  els.cartItems.addEventListener("click", (event) => {
    const key = event.target.closest("[data-remove]")?.dataset.remove;
    if (!key) return;
    state.cart = state.cart.filter((item) => item.key !== key);
    renderCart();
  });
  els.cartToggle.addEventListener("click", () => els.cartPanel.classList.toggle("open"));
  els.closeCart.addEventListener("click", () => els.cartPanel.classList.remove("open"));
  els.copyOrder.addEventListener("click", copyOrder);
}

function init() {
  els.intro.textContent = shortIntro(data.shop.bodyText);
  renderFilters();
  renderProducts();
  renderCart();
  bindEvents();
}

init();
