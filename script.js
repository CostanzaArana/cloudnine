// ==========================
// LIMPIEZA DE PARÁMETROS MP (Evita ERR_TOO_MANY_REDIRECTS)
// ==========================
(function () {
  try {
    const search = window.location.search;
    if (search && (search.includes("preference_id") || search.includes("collection_id"))) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch (e) {
    console.error("Error al limpiar parámetros de la URL:", e);
  }
})();

// ==========================
// BACKDROP Y CONTROL DE SCROLL GLOBAL
// ==========================

const backdrop = document.getElementById("backdrop");

function toggleBodyScroll(disable) {
  document.body.style.overflow = "";
}

function openBackdrop() {
  if (backdrop) backdrop.classList.add("active");
}

function closeBackdrop() {
  if (backdrop) backdrop.classList.remove("active");
}

if (backdrop) {
  backdrop.addEventListener("click", () => {
    closeMenu();
    closeCart();
  });
}

// ==========================
// MENÚ LATERAL OVERLAY
// ==========================

const menuToggle = document.getElementById("menuToggle");
const menuOverlay = document.getElementById("menuOverlay");
const menuClose = document.getElementById("menuClose");

function openMenu() {
  if (menuOverlay) menuOverlay.classList.add("open");
  if (menuToggle) menuToggle.setAttribute("aria-expanded", "true");
  openBackdrop();
}

function closeMenu() {
  if (menuOverlay) menuOverlay.classList.remove("open");
  if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
  closeBackdrop();
}

if (menuToggle && menuOverlay) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuOverlay.classList.contains("open");
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });
}

if (menuClose) {
  menuClose.addEventListener("click", closeMenu);
}

// ==========================
// CONFIGURACIÓN Y DÓLAR BLUE
// ==========================

const MARGIN = 1.55;
const FALLBACK_RATE = 1300;
const WHATSAPP_NUMBER = "5493547322726";

const WORKER_MP_URL = "https://crear-preferencia-mp.cotiarana.workers.dev";

let dolarBlueRate = null;
let marcaSeleccionada = sessionStorage.getItem("cloudnine_selected_brand") || "all";
let ordenPrecioSeleccionado = sessionStorage.getItem("cloudnine_price_sort") || null;

// ==========================
// TOAST NOTIFICATION
// ==========================

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// URL de Google Apps Script
const GOOGLE_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbwgOFv5CTOK2MQmwbL17LUnCRfGr3A1-G5aPvo3JE9-f7_iHzyJDxuVe8B5MnCldKh2aw/exec";

let PRODUCTS = [];

// ==========================
// FORMATO DE PESOS
// ==========================

const fmtARS = (n) =>
  n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

// ==========================
// CÁLCULO DEL PRECIO
// ==========================

function priceFor(usd) {
  const numUsd = Number(usd) || 0;
  const rate = dolarBlueRate || FALLBACK_RATE;
  const precio = numUsd * rate * MARGIN;
  return Math.floor((precio + 100) / 500) * 500;
}

// ==========================
// ESTADO DE CARGA DE PRODUCTOS (SKELETON)
// ==========================

function showSkeletonLoaders(count = 8) {
  const container = 
    document.getElementById("grid-destacados") || 
    document.getElementById("grid-descartables") || 
    document.getElementById("grid-recargables") || 
    document.getElementById("grid-liquidos") || 
    document.getElementById("grid-productos");
  if (!container) return;

  const skeletonsHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-text title"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text price"></div>
      <div class="skeleton-button"></div>
    </div>
  `).join('');

  container.innerHTML = skeletonsHTML;
}

// ==========================
// OBTENER PRODUCTOS DESDE GOOGLE SHEETS
// ==========================

async function fetchProductsFromSheet() {
  if (!localStorage.getItem("cloudnine_products")) {
    showSkeletonLoaders(8);
  }

  const cachedData = localStorage.getItem("cloudnine_products");
  if (cachedData) {
    PRODUCTS = JSON.parse(cachedData);
    if (typeof renderProducts === "function") renderProducts();
  }

  try {
    const res = await fetch(GOOGLE_SHEET_URL);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const rawData = await res.json();

    const grouped = {};

    rawData.forEach((row) => {
      const key = `${row.category}_${row.brand}_${row.name}`.toLowerCase();
      const isRowFeatured =
        row.featured === true || String(row.featured).toUpperCase() === "TRUE";

      if (!grouped[key]) {
        grouped[key] = {
          brand: String(row.brand || "").trim(),
          name: String(row.name || "").trim(),
          category: String(row.category || "").trim().toLowerCase(),
          image: row.image
            ? String(row.image).trim()
            : "assets/placeholder.jpg",
          featured: isRowFeatured,
          puffs: row.puffs ? Number(String(row.puffs).replace(",", ".")) : null,
          ml: row.ml ? Number(String(row.ml).replace(",", ".")) : null,
          info: row.info ? String(row.info) : null,
          flavors: [],
        };
      } else if (isRowFeatured) {
        grouped[key].featured = true;
      }

      if (row.flavor) {
        grouped[key].flavors.push({
          name: String(row.flavor).trim(),
          usd: Number(String(row.price_usd || 0).replace(",", ".")),
          promoUsd: row.promo_price_usd
            ? Number(String(row.promo_price_usd).replace(",", "."))
            : null,
          outOfStock:
            row.flavor_outofstock === true ||
            String(row.flavor_outofstock).toUpperCase() === "TRUE",
        });
      }
    });

    PRODUCTS = Object.values(grouped).map((product) => {
      const isFullyOutOfStock =
        product.flavors.length > 0 &&
        product.flavors.every((flavor) => flavor.outOfStock);

      return {
        ...product,
        outOfStock: isFullyOutOfStock,
      };
    });

    localStorage.setItem("cloudnine_products", JSON.stringify(PRODUCTS));

    if (typeof renderProducts === "function") renderProducts();
  } catch (error) {
    console.error("Error al obtener los datos de Google Sheets:", error);
    if (PRODUCTS.length === 0) {
      showErrorState();
    }
  }
}

function showErrorState() {
  const container = 
    document.getElementById("grid-destacados") || 
    document.getElementById("grid-descartables") || 
    document.getElementById("grid-recargables") || 
    document.getElementById("grid-liquidos") || 
    document.getElementById("grid-productos");
    
  if (!container) return;

  container.innerHTML = `
    <div class="error-load-container" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
      <p style="font-size: 1.1rem; margin-bottom: 1rem; color: var(--text-color, #333);">
        No pudimos cargar el catálogo en este momento.
      </p>
      <button onclick="fetchProductsFromSheet()" class="card-cta" style="max-width: 200px; margin: 0 auto;">
        Reintentar
      </button>
    </div>
  `;
}

// ==========================
// DETECTAR PÁGINA HOME Y OBTENER CATEGORÍA DE PÁGINA
// ==========================

function isHomePage() {
  const file = window.location.pathname.split("/").pop();
  return file === "" || file === "index.html" || file === "index";
}

function getPageCategory() {
  const path = window.location.pathname;
  if (path.includes("descartables")) return "descartables";
  if (path.includes("recargables")) return "recargables";
  if (path.includes("liquidos")) return "liquidos";
  return null;
}

// ==========================
// GENERADOR DINÁMICO DE FILTROS DE MARCAS
// ==========================

function generarFiltrosMarcas(products) {
  const brandFiltersContainer = document.getElementById("brandFilters");
  if (!brandFiltersContainer) return;

  const pageCat = getPageCategory();
  
  // Filtrar marcas según la categoría de la página actual
  const categoryProducts = pageCat 
    ? products.filter(p => p.category === pageCat)
    : products;

  // Extraer marcas únicas
  const brandsSet = new Set();
  categoryProducts.forEach(p => {
    if (p.brand) brandsSet.add(p.brand.trim());
  });

  const uniqueBrands = Array.from(brandsSet).sort((a, b) => a.localeCompare(b));

  // Renderizar los botones de las marcas
  let buttonsHTML = `<button class="filter-btn ${marcaSeleccionada === 'all' ? 'active' : ''}" data-brand="all">Todas</button>`;
  
  uniqueBrands.forEach(brand => {
    const isActive = marcaSeleccionada === brand;
    buttonsHTML += `<button class="filter-btn ${isActive ? 'active' : ''}" data-brand="${brand}">${brand}</button>`;
  });

  brandFiltersContainer.innerHTML = buttonsHTML;

  // Event listenerdelegado o individual
  brandFiltersContainer.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      brandFiltersContainer.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      marcaSeleccionada = btn.dataset.brand;
      if (marcaSeleccionada === "all") {
        sessionStorage.removeItem("cloudnine_selected_brand");
      } else {
        sessionStorage.setItem("cloudnine_selected_brand", marcaSeleccionada);
      }

      const currentLiveSearch = document.getElementById("live-search-input");
      const currentQuery = currentLiveSearch ? currentLiveSearch.value : (searchInput ? searchInput.value : "");
      renderProducts(currentQuery);
    });
  });
}

// ==========================
// CREAR TARJETA DE PRODUCTO
// ==========================

function createProductCard(product) {
  const card = document.createElement("div");
  card.className = "card";

  const sortedFlavors = [...product.flavors].sort((a, b) => {
    const aOut = a.outOfStock || product.outOfStock ? 1 : 0;
    const bOut = b.outOfStock || product.outOfStock ? 1 : 0;
    return aOut - bOut;
  });

  const flavorOptions = sortedFlavors
    .map((flavor) => {
      const isOut = flavor.outOfStock || product.outOfStock;
      const label = flavor.name + (isOut ? " (Agotado)" : "");
      return `<option value="${flavor.name}" ${isOut ? 'data-out="true"' : ""}>${label}</option>`;
    })
    .join("");

  let productInfo = "";

  if (product.puffs) {
    productInfo = `<p class="card-info">${product.puffs.toLocaleString("es-AR")} puffs</p>`;
  } else if (product.ml) {
    productInfo = `<p class="card-info">${product.ml} ml</p>`;
  } else if (product.info) {
    productInfo = `<p class="card-info">${product.info}</p>`;
  }

  const imageSrc = product.image || "assets/placeholder.jpg";

  const hasAnyPromo = product.flavors.some(
    (f) => f.promoUsd && f.promoUsd < f.usd,
  );
  const badgeHTML = hasAnyPromo ? `<span class="badge-promo">OFERTA</span>` : "";

  card.innerHTML = `
    <div class="card-img">
      ${badgeHTML}
      <img src="${imageSrc}" alt="${product.brand} ${product.name}" loading="lazy">
    </div>
    <div class="card-body">
      <h3>${product.name}</h3>
      <label class="card-label">Sabor</label>
      <select class="card-select">
        ${flavorOptions}
      </select>
      ${productInfo}
      <label class="card-label">Cantidad</label>
      <input class="card-qty" type="number" min="1" value="1">
      <p class="card-price"></p>
      <button class="card-cta">Agregar al carrito</button>
    </div>
  `;

  const selectEl = card.querySelector(".card-select");
  const qtyEl = card.querySelector(".card-qty");
  const priceEl = card.querySelector(".card-price");
  const ctaEl = card.querySelector(".card-cta");

  function currentFlavor() {
    const selectedName = selectEl.value;
    return product.flavors.find((flavor) => flavor.name === selectedName);
  }

  function updateState() {
    const flavor = currentFlavor();
    if (!flavor) return;

    priceEl.classList.add("price-updated");
    setTimeout(() => {
      priceEl.classList.remove("price-updated");
    }, 150);

    const isOut = flavor.outOfStock || product.outOfStock;

    if (isOut) {
      card.classList.add("out-of-stock");
      ctaEl.disabled = true;
      ctaEl.textContent = "Sin Stock";
      ctaEl.classList.add("disabled");
      priceEl.textContent = "";
    } else {
      card.classList.remove("out-of-stock");
      ctaEl.disabled = false;
      ctaEl.textContent = "Agregar al carrito";
      ctaEl.classList.remove("disabled");

      const qty = Math.max(1, parseInt(qtyEl.value) || 1);
      const activeUsd =
        flavor.promoUsd && flavor.promoUsd < flavor.usd
          ? flavor.promoUsd
          : flavor.usd;

      if (flavor.promoUsd && flavor.promoUsd < flavor.usd) {
        const oldTotal = priceFor(flavor.usd) * qty;
        const promoTotal = priceFor(flavor.promoUsd) * qty;

        priceEl.innerHTML = `
          <span class="old-price">${fmtARS(oldTotal)}</span>
          <span class="promo-price">${fmtARS(promoTotal)}</span>
        `;
      } else {
        const total = priceFor(activeUsd) * qty;
        priceEl.textContent = fmtARS(total);
      }
    }
  }

  selectEl.addEventListener("change", updateState);
  qtyEl.addEventListener("input", updateState);

  ctaEl.addEventListener("click", () => {
    const flavor = currentFlavor();
    if (!flavor || flavor.outOfStock || product.outOfStock) return;

    const qty = Math.max(1, parseInt(qtyEl.value) || 1);

    const finalUsd =
      flavor.promoUsd && flavor.promoUsd < flavor.usd
        ? flavor.promoUsd
        : flavor.usd;

    addToCart({
      brand: product.brand,
      name: product.name,
      flavor: flavor.name,
      usd: finalUsd,
      qty,
    });
    const originalText = ctaEl.textContent;
    ctaEl.textContent = "¡Agregado! ✓";
    ctaEl.classList.add("added");
    ctaEl.disabled = true;

    setTimeout(() => {
      ctaEl.textContent = originalText;
      ctaEl.classList.remove("added");
      ctaEl.disabled = false;
    }, 1200);
  });

  updateState();

  return card;
}

// ==========================
// RENDERIZAR PRODUCTOS
// ==========================

let activePuffFilter = "all";

function renderProducts(searchTerm = "") {
  const genericGrid =
    document.getElementById("grid-productos") ||
    document.getElementById("productos") ||
    document.getElementById("catalogGrid");

  const containers = {
    descartables: document.getElementById("grid-descartables") || genericGrid,
    recargables: document.getElementById("grid-recargables") || genericGrid,
    liquidos: document.getElementById("grid-liquidos") || genericGrid,
  };

  const home = isHomePage();
  const query = searchTerm.toLowerCase().trim();

  const cleaned = new Set();
  Object.values(containers).forEach((container) => {
    if (container && !cleaned.has(container)) {
      container.innerHTML = "";
      cleaned.add(container);
    }
  });

  const isProductOutOfStock = (p) => {
    if (p.outOfStock) return true;
    if (p.flavors && p.flavors.length > 0) {
      return p.flavors.every((f) => f.outOfStock);
    }
    return false;
  };

  const fullGrouped = {};
  PRODUCTS.forEach((product) => {
    if (!fullGrouped[product.category]) {
      fullGrouped[product.category] = {};
    }
    if (!fullGrouped[product.category][product.brand]) {
      fullGrouped[product.category][product.brand] = [];
    }
    fullGrouped[product.category][product.brand].push(product);
  });

  buildNavigationMenu(fullGrouped);
  generarFiltrosMarcas(PRODUCTS);

  if (home && query === "") {
    const gridDestacados = document.getElementById("grid-destacados");
    if (!gridDestacados) return;

    let featuredProducts = PRODUCTS.filter(
      (p) => p.featured === true || String(p.featured).toLowerCase() === "true",
    );

    if (featuredProducts.length === 0) {
      featuredProducts = PRODUCTS.slice(0, 6);
    }

    featuredProducts.sort((a, b) => {
      return (
        (isProductOutOfStock(a) ? 1 : 0) - (isProductOutOfStock(b) ? 1 : 0)
      );
    });

    gridDestacados.innerHTML = "";
    featuredProducts.forEach((product) => {
      const card = createProductCard(product);
      gridDestacados.appendChild(card);
    });

    return;
  }

  const filteredGrouped = {};

  PRODUCTS.forEach((product) => {
    if (marcaSeleccionada !== "all" && product.brand !== marcaSeleccionada) {
      return;
    }

    if (query !== "") {
      const matchBrand = product.brand.toLowerCase().includes(query);
      const matchName = product.name.toLowerCase().includes(query);
      const matchFlavor = product.flavors.some((f) =>
        f.name.toLowerCase().includes(query),
      );

      if (!matchBrand && !matchName && !matchFlavor) return;
    }

    if (
      product.category === "descartables" &&
      activePuffFilter !== "all" &&
      product.puffs
    ) {
      const puffs = product.puffs;
      if (activePuffFilter === "low" && puffs >= 10000) return;
      if (activePuffFilter === "mid" && (puffs < 10000 || puffs > 25000))
        return;
      if (activePuffFilter === "high" && puffs < 30000) return;
    }

    if (!filteredGrouped[product.category]) {
      filteredGrouped[product.category] = {};
    }

    if (!filteredGrouped[product.category][product.brand]) {
      filteredGrouped[product.category][product.brand] = [];
    }

    filteredGrouped[product.category][product.brand].push(product);
  });

  Object.keys(containers).forEach((category) => {
    const container = containers[category];
    if (!container) return;

    if (
      !filteredGrouped[category] ||
      Object.keys(filteredGrouped[category]).length === 0
    ) {
      if (
        (query !== "" || activePuffFilter !== "all" || marcaSeleccionada !== "all") &&
        container.innerHTML === ""
      ) {
        container.innerHTML = `<p class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 2rem; opacity: 0.8;">No se encontraron productos con estos filtros.</p>`;
      }
      return;
    }

    Object.keys(filteredGrouped[category]).forEach((brand) => {
      const products = filteredGrouped[category][brand];

      const sortedProducts = [...products].sort((a, b) => {
        return (
          (isProductOutOfStock(a) ? 1 : 0) - (isProductOutOfStock(b) ? 1 : 0)
        );
      });

      const brandSection = document.createElement("div");
      brandSection.className = "brand-section";

      const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      brandSection.id = `${category}-${brandSlug}`;

      const brandTitle = document.createElement("h3");
      brandTitle.className = "brand-title";
      brandTitle.textContent = brand;

      const brandGrid = document.createElement("div");
      brandGrid.className = "grid brand-grid";

      sortedProducts.forEach((product) => {
        const card = createProductCard(product);
        brandGrid.appendChild(card);
      });

      if (brandGrid.children.length > 0) {
        brandSection.appendChild(brandTitle);
        brandSection.appendChild(brandGrid);
        container.appendChild(brandSection);
      }
    });
  });

  handleInitialHashScroll();
  initScrollReveal();
  restaurarOrdenPrecio();
}

// ==========================
// SCROLL AUTOMÁTICO (#HASH)
// ==========================

function handleInitialHashScroll() {
  if (window.location.hash) {
    const targetId = window.location.hash.substring(1);
    setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  }
}

// ==========================
// SCROLL REVEAL (ANIMACIÓN)
// ==========================

function initScrollReveal() {
  const cards = document.querySelectorAll(".card:not(.reveal-init)");
  if (!cards.length) return;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    cards.forEach((card) => {
      card.classList.add("reveal-init");
      observer.observe(card);
    });
  } else {
    cards.forEach((card) => card.classList.add("reveal-visible"));
  }
}

// ==========================
// BOTÓN SCROLL TOP (VOLVER ARRIBA)
// ==========================

const scrollTopBtn = document.getElementById("scrollTopBtn");

if (scrollTopBtn) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      scrollTopBtn.classList.add("show");
    } else {
      scrollTopBtn.classList.remove("show");
    }
  });

  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

// ==========================
// BUSCADOR EN TIEMPO REAL (LIVE SEARCH & SUGGESTIONS)
// ==========================

const liveSearchInput = document.getElementById("live-search-input");
const clearSearchBtn = document.getElementById("clear-search-btn");
const searchDropdown = document.getElementById("search-results-dropdown");

function initLiveSearch() {
  if (!liveSearchInput) return;

  liveSearchInput.addEventListener("input", (e) => {
    const val = e.target.value.trim();

    if (clearSearchBtn) {
      clearSearchBtn.style.display = val.length > 0 ? "block" : "none";
    }

    if (val.length === 0) {
      if (searchDropdown) searchDropdown.classList.add("hidden");
      renderProducts("");
      return;
    }

    renderProducts(val);
    showSearchSuggestions(val);
  });

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      liveSearchInput.value = "";
      clearSearchBtn.style.display = "none";
      if (searchDropdown) searchDropdown.classList.add("hidden");
      renderProducts("");
    });
  }

  // Cerrar el dropdown al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (
      searchDropdown &&
      !searchDropdown.contains(e.target) &&
      e.target !== liveSearchInput
    ) {
      searchDropdown.classList.add("hidden");
    }
  });
}

function showSearchSuggestions(query) {
  if (!searchDropdown) return;

  const q = query.toLowerCase();
  const pageCat = getPageCategory();

  // Filtrar productos por la página actual si estamos en una categoría concreta
  const availableProducts = pageCat
    ? PRODUCTS.filter((p) => p.category === pageCat)
    : PRODUCTS;

  const matches = [];

  availableProducts.forEach((product) => {
    const brandMatch = product.brand.toLowerCase().includes(q);
    const nameMatch = product.name.toLowerCase().includes(q);
    const matchingFlavors = product.flavors.filter((f) =>
      f.name.toLowerCase().includes(q)
    );

    if (brandMatch || nameMatch || matchingFlavors.length > 0) {
      matches.push({
        product,
        matchingFlavors: matchingFlavors.map((f) => f.name),
      });
    }
  });

  if (matches.length === 0) {
    searchDropdown.innerHTML = `<div class="search-no-results">No se encontraron sugerencias</div>`;
    searchDropdown.classList.remove("hidden");
    return;
  }

  const limit = matches.slice(0, 5);

  const html = limit
    .map(({ product, matchingFlavors }) => {
      const flavorSub =
        matchingFlavors.length > 0
          ? `<span class="suggestion-flavor">Sabores: ${matchingFlavors.slice(0, 2).join(", ")}</span>`
          : "";

      return `
      <div class="search-suggestion-item" data-brand="${product.brand}" data-name="${product.name}">
        <img src="${product.image || "assets/placeholder.jpg"}" alt="${product.name}" class="suggestion-img">
        <div class="suggestion-info">
          <span class="suggestion-title">${product.brand} - ${product.name}</span>
          ${flavorSub}
        </div>
      </div>
    `;
    })
    .join("");

  searchDropdown.innerHTML = html;
  searchDropdown.classList.remove("hidden");

  // Event listener al seleccionar una sugerencia
  searchDropdown.querySelectorAll(".search-suggestion-item").forEach((item) => {
    item.addEventListener("click", () => {
      const brand = item.dataset.brand;
      const name = item.dataset.name;
      liveSearchInput.value = `${brand} ${name}`;
      searchDropdown.classList.add("hidden");
      renderProducts(`${brand} ${name}`);
    });
  });
}

initLiveSearch();

// ==========================
// MANEJO DE BUSCADOR FLOTANTE (PÁGINAS LEGACY / HEADER)
// ==========================

const searchToggle = document.getElementById("searchToggle");
const searchBar = document.getElementById("searchBar");
const searchClose = document.getElementById("searchClose");
const searchInput = document.getElementById("searchInput");

function closeSearch() {
  if (searchBar) {
    searchBar.classList.remove("open");
  }
  if (searchInput && searchInput.value !== "") {
    searchInput.value = "";
    renderProducts("");
  }
}

if (searchToggle && searchBar) {
  searchToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = searchBar.classList.toggle("open");
    if (isOpen && searchInput) {
      searchInput.focus();
    } else {
      closeSearch();
    }
  });
}

if (searchClose) {
  searchClose.addEventListener("click", closeSearch);
}

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    renderProducts(e.target.value);
  });
}

// ==========================
// FILTROS DE PUFFS
// ==========================

const puffFiltersContainer = document.getElementById("puffFilters");

if (puffFiltersContainer) {
  const filterBtns = puffFiltersContainer.querySelectorAll(".filter-btn");

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      activePuffFilter = btn.dataset.range;
      const currentLiveSearch = document.getElementById("live-search-input");
      const currentQuery = currentLiveSearch ? currentLiveSearch.value : (searchInput ? searchInput.value : "");
      renderProducts(currentQuery);
    });
  });
}

function ordenarProductos(orden, btnElement) {
  ordenPrecioSeleccionado = orden;
  if (orden) {
    sessionStorage.setItem("cloudnine_price_sort", orden);
  } else {
    sessionStorage.removeItem("cloudnine_price_sort");
  }

  document
    .querySelectorAll(".sort-btn")
    .forEach((btn) => btn.classList.remove("active"));
  if (btnElement) {
    btnElement.classList.add("active");
  }

  const grids = document.querySelectorAll(".grid");

  grids.forEach((grid) => {
    const cards = Array.from(grid.children).filter((child) =>
      child.classList.contains("card"),
    );

    if (cards.length <= 1) return;

    cards.sort((a, b) => {
      const sinStockA =
        a.classList.contains("out-of-stock") ||
        a.querySelector(".card-cta")?.disabled;
      const sinStockB =
        b.classList.contains("out-of-stock") ||
        b.querySelector(".card-cta")?.disabled;

      if (sinStockA && !sinStockB) return 1;
      if (!sinStockA && sinStockB) return -1;

      const precioAEl = a.querySelector(".card-price");
      const precioBEl = b.querySelector(".card-price");

      const precioA = precioAEl
        ? parseFloat(precioAEl.textContent.replace(/[^0-9.-]+/g, "")) || 0
        : 0;
      const precioB = precioBEl
        ? parseFloat(precioBEl.textContent.replace(/[^0-9.-]+/g, "")) || 0
        : 0;

      return orden === "asc" ? precioA - precioB : precioB - precioA;
    });

    cards.forEach((card) => grid.appendChild(card));
  });
}

function restaurarOrdenPrecio() {
  if (!ordenPrecioSeleccionado) return;
  const btnActive = document.querySelector(`.sort-btn[onclick*="'${ordenPrecioSeleccionado}'"]`);
  ordenarProductos(ordenPrecioSeleccionado, btnActive);
}

function limpiarFiltros() {
  sessionStorage.removeItem("cloudnine_selected_brand");
  sessionStorage.removeItem("cloudnine_price_sort");

  marcaSeleccionada = "all";
  activePuffFilter = "all";
  ordenPrecioSeleccionado = null;

  const brandButtons = document.querySelectorAll('#brandFilters .filter-btn');
  brandButtons.forEach(btn => {
    if (btn.dataset.brand === 'all') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const puffButtons = document.querySelectorAll('#puffFilters .filter-btn');
  puffButtons.forEach(btn => {
    if (btn.dataset.range === 'all') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const sortButtons = document.querySelectorAll('.sort-btn');
  sortButtons.forEach(btn => btn.classList.remove('active'));

  const liveSearch = document.getElementById('live-search-input');
  if (liveSearch) liveSearch.value = '';

  if (searchInput) searchInput.value = '';

  const dropdown = document.getElementById('search-results-dropdown');
  if (dropdown) dropdown.classList.add('hidden');

  const clearBtn = document.getElementById('clear-search-btn');
  if (clearBtn) clearBtn.style.display = 'none';

  renderProducts();
}

// ==========================================
// VERIFICACIÓN DE MAYORÍA DE EDAD (+18)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const ageModal = document.getElementById("ageModal");
  const backdrop = document.getElementById("backdrop");
  const btnYes = document.getElementById("btnAgeYes");
  const btnNo = document.getElementById("btnAgeNo");
  const ageWarningText = document.getElementById("ageWarningText");

  if (localStorage.getItem("ageVerified") === "true") {
    if (ageModal) ageModal.style.display = "none";
    if (backdrop) backdrop.style.display = "none";
  } else {
    if (ageModal) ageModal.classList.add("show");
    if (backdrop) backdrop.classList.add("show");
  }

  if (btnYes) {
    btnYes.addEventListener("click", () => {
      localStorage.setItem("ageVerified", "true");
      
      if (ageModal) ageModal.classList.remove("show");
      if (backdrop) backdrop.classList.remove("show");

      setTimeout(() => {
        if (ageModal) ageModal.style.display = "none";
        if (backdrop) backdrop.style.display = "none";
      }, 300);
    });
  }

  if (btnNo) {
    btnNo.addEventListener("click", () => {
      if (ageWarningText) ageWarningText.style.display = "block";
      
      btnYes.disabled = true;
      btnNo.disabled = true;

      setTimeout(() => {
        window.location.href = "https://www.google.com";
      }, 2000);
    });
  }
});

// ==========================
// NAVEGACIÓN Y SUB-MENÚS
// ==========================

function buildNavigationMenu(grouped) {
  const categories = ["descartables", "recargables", "liquidos"];

  categories.forEach((cat) => {
    const subMenu = document.getElementById(`submenu-${cat}`);
    if (!subMenu) return;

    subMenu.innerHTML = "";

    const allLink = document.createElement("a");
    allLink.href = `${cat}.html`;
    allLink.textContent = "Todos los productos";
    subMenu.appendChild(allLink);

    if (grouped[cat]) {
      Object.keys(grouped[cat]).forEach((brand) => {
        const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const targetHash = `${cat}-${brandSlug}`;
        const brandLink = document.createElement("a");
        brandLink.href = `${cat}.html#${targetHash}`;
        brandLink.textContent = brand;

        brandLink.addEventListener("click", (e) => {
          closeMenu();

          const currentFile = window.location.pathname.split("/").pop();
          if (currentFile === `${cat}.html`) {
            e.preventDefault();
            window.history.pushState(null, null, `#${targetHash}`);
            const el = document.getElementById(targetHash);
            if (el) {
              el.scrollIntoView({ behavior: "smooth" });
            }
          }
        });

        subMenu.appendChild(brandLink);
      });
    }
  });
}

// ==========================
// CARRITO DE COMPRAS
// ==========================

function getCart() {
  return JSON.parse(localStorage.getItem("cloudnine_cart") || "[]");
}

function saveCart(cart) {
  localStorage.setItem("cloudnine_cart", JSON.stringify(cart));
  renderCartBadge();
  renderCartPanel();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(
    (i) => i.name === item.name && i.flavor === item.flavor,
  );

  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }

  saveCart(cart);

  const itemTitle = item.brand ? `${item.brand} ${item.name}` : item.name;
  showToast(`¡Agregado! ${itemTitle} (${item.flavor})`);
  const cartIcon = document.getElementById("cartToggle") || document.getElementById("cartCount");
  if (cartIcon) {
    cartIcon.classList.remove("cart-icon-pulse");
    void cartIcon.offsetWidth;
    cartIcon.classList.add("cart-icon-pulse");
  }
}

function updateCartQty(index, delta) {
  const cart = getCart();
  if (!cart[index]) return;

  cart[index].qty += delta;

  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  saveCart(cart);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

// ==========================
// CONTADOR DEL CARRITO
// ==========================

function renderCartBadge() {
  const cart = getCart();
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCount = document.getElementById("cartCount");

  if (cartCount) {
    cartCount.textContent = totalQty;
  }
}
renderCartBadge();

// ==========================
// PANEL DEL CARRITO Y ENVÍOS
// ==========================

function renderCartPanel() {
  const itemsEl = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");

  if (!itemsEl || !totalEl) return;

  const cart = getCart();
  itemsEl.innerHTML = "";

  let subtotal = 0;

  cart.forEach((item, index) => {
    const lineTotal = priceFor(item.usd) * item.qty;
    subtotal += lineTotal;

    const row = document.createElement("div");
    row.className = "cart-item";

    row.innerHTML = `
      <div class="cart-item-info">
        <span class="cart-item-title">
          ${item.brand ? item.brand + " " : ""}${item.name}
        </span>
        <span class="cart-item-sub">
          ${item.flavor ? item.flavor + " — " : ""}${fmtARS(lineTotal)}
        </span>
      </div>
      <div class="cart-item-controls">
        <button class="cart-qty-btn minus" aria-label="Restar">-</button>
        <span class="cart-item-qty">${item.qty}</span>
        <button class="cart-qty-btn plus" aria-label="Sumar">+</button>
        <button class="cart-remove-btn" aria-label="Quitar">×</button>
      </div>
    `;

    row
      .querySelector(".minus")
      .addEventListener("click", () => updateCartQty(index, -1));
    row
      .querySelector(".plus")
      .addEventListener("click", () => updateCartQty(index, 1));
    row
      .querySelector(".cart-remove-btn")
      .addEventListener("click", () => removeFromCart(index));

    itemsEl.appendChild(row);
  });

  const deliverySelect = document.getElementById("deliveryMethod");
  const shippingBadge = document.getElementById("shippingCostBadge");
  let shippingCost = 0;

  if (deliverySelect) {
    if (deliverySelect.value === "alrededores") {
      shippingCost = 5000;
      if (shippingBadge) {
        shippingBadge.textContent = "+ $5.000";
        shippingBadge.className = "badge-paid";
      }
    } else {
      shippingCost = 0;
      if (shippingBadge) {
        shippingBadge.textContent = "¡GRATIS!";
        shippingBadge.className = "badge-free";
      }
    }
  }

  const total = subtotal + shippingCost;

  if (!cart.length) {
    totalEl.textContent = "Carrito vacío";
  } else {
    totalEl.textContent = `Total: ${fmtARS(total)}`;
  }
}

// ==========================
// ABRIR Y CERRAR CARRITO
// ==========================

const cartToggle = document.getElementById("cartToggle");
const cartPanel = document.getElementById("cartPanel");
const cartClose = document.getElementById("cartClose");

function openCart() {
  if (cartPanel) cartPanel.classList.add("open");
  openBackdrop();
  renderCartPanel();
}

function closeCart() {
  if (cartPanel) cartPanel.classList.remove("open");
  closeBackdrop();
}

if (cartToggle) {
  cartToggle.addEventListener("click", () => {
    const isOpen = cartPanel?.classList.contains("open");
    if (isOpen) {
      closeCart();
    } else {
      openCart();
    }
  });
}

if (cartClose) {
  cartClose.addEventListener("click", closeCart);
}

// ==========================
// PERSISTENCIA Y CHECKOUT POR WHATSAPP / MERCADO PAGO
// ==========================

const deliverySelect = document.getElementById("deliveryMethod");
const addressGroup = document.getElementById("addressGroup");
const townGroup = document.getElementById("townGroup");
const townSelect = document.getElementById("clientTown");
const customTownGroup = document.getElementById("customTownGroup");
const cartCheckout = document.getElementById("cartCheckout");
const btnMercadoPago = document.getElementById("btnMercadoPago");

const CHECKOUT_STORAGE_KEY = "cloudnine_checkout_data";

function saveCheckoutData() {
  const checkoutData = {
    name: document.getElementById("clientName")?.value || "",
    method: deliverySelect?.value || "retiro",
    town: townSelect?.value || "",
    customTown: document.getElementById("clientCustomTown")?.value || "",
    address: document.getElementById("clientAddress")?.value || "",
  };

  localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(checkoutData));
}

function restoreCheckoutData() {
  const saved = localStorage.getItem(CHECKOUT_STORAGE_KEY);
  if (!saved) return;

  try {
    const data = JSON.parse(saved);

    const nameInput = document.getElementById("clientName");
    const customTownInput = document.getElementById("clientCustomTown");
    const addressInput = document.getElementById("clientAddress");

    if (nameInput) nameInput.value = data.name || "";

    if (deliverySelect && data.method) {
      deliverySelect.value = data.method;
      deliverySelect.dispatchEvent(new Event("change"));
    }

    if (townSelect && data.town) {
      townSelect.value = data.town;
      townSelect.dispatchEvent(new Event("change"));
    }

    if (customTownInput && data.customTown)
      customTownInput.value = data.customTown;
    if (addressInput && data.address) addressInput.value = data.address;
  } catch (e) {
    console.error("Error al restaurar datos de checkout:", e);
  }
}

if (deliverySelect) {
  deliverySelect.addEventListener("change", () => {
    const value = deliverySelect.value;

    if (value === "retiro") {
      if (addressGroup) addressGroup.style.display = "none";
      if (townGroup) townGroup.style.display = "none";
    } else if (value === "alta-gracia") {
      if (addressGroup) addressGroup.style.display = "block";
      if (townGroup) townGroup.style.display = "none";
    } else if (value === "alrededores") {
      if (addressGroup) addressGroup.style.display = "block";
      if (townGroup) townGroup.style.display = "block";
    }

    saveCheckoutData();
    if (typeof renderCartPanel === "function") renderCartPanel();
  });
}

if (townSelect) {
  townSelect.addEventListener("change", () => {
    if (townSelect.value === "Otro") {
      if (customTownGroup) customTownGroup.style.display = "block";
    } else {
      if (customTownGroup) customTownGroup.style.display = "none";
    }
    saveCheckoutData();
  });
}

["clientName", "clientAddress", "clientCustomTown"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("input", saveCheckoutData);
  }
});

restoreCheckoutData();

// ==========================
// REGISTRO DE PEDIDOS EN GOOGLE SHEETS
// ==========================

function registrarPedidoEnSheet(pedidoPayload) {
  fetch(GOOGLE_SHEET_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pedidoPayload),
  }).catch((err) => console.error("Error al registrar pedido en Sheet:", err));
}

// ==========================
// PROCESAMIENTO DE PEDIDOS (WHATSAPP & MERCADO PAGO)
// ==========================

function obtenerDatosFormularioYValidar() {
  const cart = getCart();
  if (!cart.length) {
    showToast("El carrito está vacío.");
    return null;
  }

  const clientName = document.getElementById("clientName")?.value.trim();
  const method = deliverySelect?.value || "retiro";
  const address = document.getElementById("clientAddress")?.value.trim();
  const town = townSelect?.value;
  const customTown = document.getElementById("clientCustomTown")?.value.trim();

  if (!clientName) {
    showToast("Por favor, ingresá tu Nombre y Apellido.");
    document.getElementById("clientName")?.focus();
    return null;
  }

  if (method !== "retiro" && !address) {
    showToast("Por favor, ingresá la dirección de envío.");
    document.getElementById("clientAddress")?.focus();
    return null;
  }

  let finalTown = "";
  if (method === "alrededores") {
    if (town === "Otro") {
      if (!customTown) {
        showToast("Por favor, especifica el nombre de la localidad.");
        document.getElementById("clientCustomTown")?.focus();
        return null;
      }
      finalTown = customTown;
    } else {
      finalTown = town;
    }
  }

  let shippingCost = 0;
  let deliveryText = "Retiro en persona";

  if (method === "alta-gracia") {
    deliveryText = `Envío en Alta Gracia (Gratis) - Dirección: ${address}`;
  } else if (method === "alrededores") {
    shippingCost = 5000;
    deliveryText = `Envío a alrededores ($5.000) - Localidad: ${finalTown} - Dirección: ${address}`;
  }

  let subtotal = 0;
  const itemsText = cart
    .map((item) => {
      const lineTotal = priceFor(item.usd) * item.qty;
      subtotal += lineTotal;
      const title = item.brand ? `${item.brand} ${item.name}` : item.name;
      return `• ${title} (${item.flavor}) x${item.qty} - ${fmtARS(lineTotal)}`;
    })
    .join("\n");

  const total = subtotal + shippingCost;

  return {
    cart,
    clientName,
    method,
    address,
    finalTown,
    shippingCost,
    deliveryText,
    subtotal,
    total,
    itemsText,
  };
}

// CHECKOUT VIA WHATSAPP
if (cartCheckout) {
  cartCheckout.addEventListener("click", () => {
    const data = obtenerDatosFormularioYValidar();
    if (!data) return;

    let msg = `*Nuevo pedido - Cloud Nine Store*\n\n`;
    msg += `*Cliente:* ${data.clientName}\n`;
    msg += `*Método de entrega:* ${data.deliveryText}\n\n`;
    msg += `*Productos:*\n${data.itemsText}\n\n`;
    if (data.shippingCost > 0) {
      msg += `*Costo de envío:* ${fmtARS(data.shippingCost)}\n`;
    }
    msg += `*Total a pagar:* ${fmtARS(data.total)}`;

    // Registrar en Google Sheet
    registrarPedidoEnSheet({
      fecha: new Date().toISOString(),
      cliente: data.clientName,
      metodo: data.method,
      direccion: data.address,
      localidad: data.finalTown,
      total: data.total,
      productos: data.itemsText,
      pago: "WhatsApp",
    });

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  });
}

// CHECKOUT VIA MERCADO PAGO
if (btnMercadoPago) {
  btnMercadoPago.addEventListener("click", async () => {
    const data = obtenerDatosFormularioYValidar();
    if (!data) return;

    btnMercadoPago.disabled = true;
    btnMercadoPago.textContent = "Cargando pago...";

    try {
      const mpItems = data.cart.map((item) => {
        const unitPrice = priceFor(item.usd);
        const title = item.brand ? `${item.brand} ${item.name}` : item.name;
        return {
          title: `${title} (${item.flavor})`,
          quantity: item.qty,
          unit_price: unitPrice,
          currency_id: "ARS",
        };
      });

      if (data.shippingCost > 0) {
        mpItems.push({
          title: "Costo de Envío a Alrededores",
          quantity: 1,
          unit_price: data.shippingCost,
          currency_id: "ARS",
        });
      }

      const res = await fetch(WORKER_MP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: mpItems,
          payer: {
            name: data.clientName,
          },
        }),
      });

      if (!res.ok) throw new Error("Error en el servidor de pagos");

      const responseData = await res.json();

      if (responseData.init_point) {
        registrarPedidoEnSheet({
          fecha: new Date().toISOString(),
          cliente: data.clientName,
          metodo: data.method,
          direccion: data.address,
          localidad: data.finalTown,
          total: data.total,
          productos: data.itemsText,
          pago: "Mercado Pago (Pendiente)",
        });

        window.location.href = responseData.init_point;
      } else {
        throw new Error("No se pudo obtener el link de pago.");
      }
    } catch (err) {
      console.error(err);
      showToast("Hubo un error al procesar el pago con Mercado Pago.");
      btnMercadoPago.disabled = false;
      btnMercadoPago.textContent = "💳 Pagar con Mercado Pago";
    }
  });
}

// ==========================
// INICIALIZACIÓN
// ==========================

fetchProductsFromSheet();

// ==========================
// DÓLAR BLUE API
// ==========================

async function fetchDolarBlue() {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/blue");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    
    if (data && data.venta) {
      dolarBlueRate = data.venta;
      if (typeof renderProducts === "function") renderProducts();
      if (typeof renderCartPanel === "function") renderCartPanel();
    }
  } catch (error) {
    console.error("Error al obtener la cotización del dólar blue:", error);
  }
}

// Inicialización final de eventos al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
  fetchDolarBlue();
});