// ==========================
// BACKDROP Y CONTROL DE SCROLL GLOBAL
// ==========================

const backdrop = document.getElementById("backdrop");

function toggleBodyScroll(disable) {
  // Dejamos la función sin bloquear para permitir el scroll siempre
  document.body.style.overflow = "";
}

function openBackdrop() {
  if (backdrop) backdrop.classList.add("active");
  // Ya no llamamos a toggleBodyScroll(true)
}

function closeBackdrop() {
  if (backdrop) backdrop.classList.remove("active");
  // Ya no llamamos a toggleBodyScroll(false)
}

// Cierre global al tocar/cliquear en el fondo oscuro
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

// URL generada en el paso 1 por Google Apps Script
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

// CÁLCULO DEL PRECIO
function priceFor(usd) {
  const numUsd = Number(usd) || 0; // Previene NaN
  const rate = dolarBlueRate || FALLBACK_RATE;
  const precio = numUsd * rate * MARGIN;
  return Math.floor((precio + 100) / 500) * 500;
}

// ==========================
// ESTADO DE CARGA DE PRODUCTOS
// ==========================

// Función para mostrar el estado de carga con Skeleton Loaders
function showSkeletonLoaders(count = 8) {
  // Detectamos cuál es la grilla que está presente en la página actual
  const container = 
    document.getElementById("grid-destacados") || 
    document.getElementById("grid-descartables") || 
    document.getElementById("grid-recargables") || 
    document.getElementById("grid-liquidos") || 
    document.getElementById("grid-productos");
  if (!container) return;

  // Generamos N tarjetas de skeleton completas
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
// Mapear los datos que vienen desde Google Sheets
// ==========================

async function fetchProductsFromSheet() {
  // Si no tenemos productos cacheados, mostramos los Skeleton Loaders completos inmediatamente
  if (!localStorage.getItem("cloudnine_products")) {
    showSkeletonLoaders(8);
  }

  // 1. Intentar cargar inmediatamente desde la memoria local si existen datos previas
  const cachedData = localStorage.getItem("cloudnine_products");
  if (cachedData) {
    PRODUCTS = JSON.parse(cachedData);
    if (typeof renderProducts === "function") renderProducts();
  }

  try {
    const res = await fetch(GOOGLE_SHEET_URL);
    const rawData = await res.json();

    const grouped = {};

    rawData.forEach((row) => {
      // Clave única por producto
      const key = `${row.category}_${row.brand}_${row.name}`.toLowerCase();

      // Evaluamos si esta fila específica está marcada como destacada
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
      } else {
        // SI EL PRODUCTO YA EXISTE: si esta nueva fila tiene featured = TRUE, actualizamos el producto
        if (isRowFeatured) {
          grouped[key].featured = true;
        }
      }

      // Agregar sabor a la lista de opciones
      if (row.flavor) {
        grouped[key].flavors.push({
          name: String(row.flavor).trim(),
          usd: Number(String(row.price_usd || 0).replace(",", ".")),
          // NUEVO: Precio en promoción (si existe)
          promoUsd: row.promo_price_usd
            ? Number(String(row.promo_price_usd).replace(",", "."))
            : null,
          outOfStock:
            row.flavor_outofstock === true ||
            String(row.flavor_outofstock).toUpperCase() === "TRUE",
        });
      }
    });

    // Convertimos el objeto agrupado a array y calculamos automáticamente
    // si el producto general está agotado basándonos en los sabores
    PRODUCTS = Object.values(grouped).map((product) => {
      const isFullyOutOfStock =
        product.flavors.length > 0 &&
        product.flavors.every((flavor) => flavor.outOfStock);

      return {
        ...product,
        outOfStock: isFullyOutOfStock,
      };
    });

    // 2. Guardar el nuevo resultado en la memoria local para futuras cargas
    localStorage.setItem("cloudnine_products", JSON.stringify(PRODUCTS));

    // 3. Volver a renderizar solo para refrescar con datos super actualizados
    if (typeof renderProducts === "function") renderProducts();
  } catch (error) {
    console.error("Error al obtener los datos de Google Sheets:", error);
  }
}

// ==========================
// DETECTAR PÁGINA HOME
// ==========================

function isHomePage() {
  const file = window.location.pathname.split("/").pop();
  return file === "" || file === "index.html" || file === "index";
}

// ==========================
// CREAR TARJETA DE PRODUCTO
// ==========================

function createProductCard(product) {
  const card = document.createElement("div");
  card.className = "card";

  // 1. ORDENAMOS LOS SABORES: Disponibles primero, agotados al final
  const sortedFlavors = [...product.flavors].sort((a, b) => {
    const aOut = a.outOfStock || product.outOfStock ? 1 : 0;
    const bOut = b.outOfStock || product.outOfStock ? 1 : 0;
    return aOut - bOut;
  });

  // 2. GENERAMOS LAS OPCIONES EN BASE A LA LISTA ORDENADA
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

  // Verificamos si al menos un sabor tiene promoción para poner la etiqueta en la imagen
  const hasAnyPromo = product.flavors.some(
    (f) => f.promoUsd && f.promoUsd < f.usd,
  );
  const badgeHTML = hasAnyPromo
    ? `<span class="badge-promo">OFERTA</span>`
    : "";

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

      // ⚡ Micro-interacción: Animación rápida al cambiar valor
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
        priceEl.textContent = ""; // Oculta el precio si está agotado
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
      ctaEl.disabled = true; // Previene doble clic accidental en el microsegundo

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
  // Generar los botones de marcas según los productos cargados
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
    // NUEVO: Filtro por marca seleccionada
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
        (query !== "" || activePuffFilter !== "all") &&
        container.innerHTML === ""
      ) {
        container.innerHTML = `<p class="no-results">No se encontraron productos con estos filtros.</p>`;
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
// MANEJO DE BUSCADOR Y LUPA
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
      const currentQuery = searchInput ? searchInput.value : "";
      renderProducts(currentQuery);
    });
  });
}

function ordenarProductos(orden, btnElement) {
  // 1. Guardar o remover la preferencia en la sesión
  ordenPrecioSeleccionado = orden;
  if (orden) {
    sessionStorage.setItem("cloudnine_price_sort", orden);
  } else {
    sessionStorage.removeItem("cloudnine_price_sort");
  }

  // 2. Estilos visuales de los botones de precio
  document
    .querySelectorAll(".sort-btn")
    .forEach((btn) => btn.classList.remove("active"));
  if (btnElement) {
    btnElement.classList.add("active");
  }

  // 3. Buscamos todas las grillas individuales de cada marca (.grid)
  const grids = document.querySelectorAll(".grid");

  grids.forEach((grid) => {
    const cards = Array.from(grid.children).filter((child) =>
      child.classList.contains("card"),
    );

    if (cards.length <= 1) return;

    // 4. Ordenamos las tarjetas considerando disponibilidad y precio
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

// Función auxiliar para re-aplicar el orden guardado automáticamente al renderizar
function restaurarOrdenPrecio() {
  if (!ordenPrecioSeleccionado) return;
  const btnActive = document.querySelector(`.sort-btn[onclick*="'${ordenPrecioSeleccionado}'"]`);
  ordenarProductos(ordenPrecioSeleccionado, btnActive);
}

function limpiarFiltros() {
  // 1. Borrar storage de sesión
  sessionStorage.removeItem("cloudnine_selected_brand");
  sessionStorage.removeItem("cloudnine_price_sort");

  // 2. Resetear variables globales
  marcaSeleccionada = "all";
  activePuffFilter = "all";
  ordenPrecioSeleccionado = null;

  // 3. Resetear selección visual de botones de marcas a "Todas"
  const brandButtons = document.querySelectorAll('#brandFilters .filter-btn');
  brandButtons.forEach(btn => {
    if (btn.dataset.brand === 'all') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 4. Resetear selección visual de botones de puffs a "Todos"
  const puffButtons = document.querySelectorAll('#puffFilters .filter-btn');
  puffButtons.forEach(btn => {
    if (btn.dataset.range === 'all') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 5. Desmarcar botones de ordenamiento por precio
  const sortButtons = document.querySelectorAll('.sort-btn');
  sortButtons.forEach(btn => btn.classList.remove('active'));

  // 6. Limpiar campos de búsqueda
  const liveSearch = document.getElementById('live-search-input');
  if (liveSearch) liveSearch.value = '';

  if (searchInput) searchInput.value = '';

  const dropdown = document.getElementById('search-results-dropdown');
  if (dropdown) dropdown.classList.add('hidden');

  const clearBtn = document.getElementById('clear-search-btn');
  if (clearBtn) clearBtn.style.display = 'none';

  // 7. Volver a renderizar el catálogo completo
  renderProducts();
}


// ==========================================
// VERIFICACIÓN DE MAYORÍA DE EDAD (+18)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const ageModal = document.getElementById("ageModal");
  const btnYes = document.getElementById("btnAgeYes");
  const btnNo = document.getElementById("btnAgeNo");

  // Si ya verificó edad anteriormente, ocultamos el modal inmediatamente
  if (localStorage.getItem("ageVerified") === "true") {
    if (ageModal) ageModal.style.display = "none";
  } else {
    if (ageModal) ageModal.classList.add("show");
  }

  if (btnYes) {
    btnYes.addEventListener("click", () => {
      localStorage.setItem("ageVerified", "true");
      ageModal.classList.remove("show");
      setTimeout(() => {
        ageModal.style.display = "none";
      }, 300);
    });
  }

  if (btnNo) {
    btnNo.addEventListener("click", () => {
      alert("Debes ser mayor de 18 años para ingresar a esta tienda.");
      window.location.href = "https://www.google.com";
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
    void cartIcon.offsetWidth; // Trigger reflow para reiniciar la animación CSS si clickean rápido
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
// PERSISTENCIA Y CHECKOUT POR WHATSAPP
// ==========================

const deliverySelect = document.getElementById("deliveryMethod");
const addressGroup = document.getElementById("addressGroup");
const townGroup = document.getElementById("townGroup");
const townSelect = document.getElementById("clientTown");
const customTownGroup = document.getElementById("customTownGroup");
const cartCheckout = document.getElementById("cartCheckout");

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
// CHECKOUT: WHATSAPP Y MERCADO PAGO
// ==========================

// 1. Función para procesar pago con Mercado Pago
async function pagarConMercadoPago() {
  const cart = getCart();
  if (cart.length === 0) {
    showToast("Tu carrito está vacío");
    return;
  }

  const nameInput = document.getElementById("clientName");
  const addressInput = document.getElementById("clientAddress");
  const customTownInput = document.getElementById("clientCustomTown");

  const name = nameInput ? nameInput.value.trim() : "";
  const method = deliverySelect ? deliverySelect.value : "retiro";
  const address = addressInput ? addressInput.value.trim() : "";

  let town = townSelect ? townSelect.value : "";
  if (town === "Otro" && customTownInput) {
    town = customTownInput.value.trim();
  }

  if (!name) {
    showToast("Por favor, ingresá tu nombre");
    if (nameInput) nameInput.focus();
    return;
  }

  if (method !== "retiro" && !address) {
    showToast("Por favor, ingresá tu dirección");
    if (addressInput) addressInput.focus();
    return;
  }

  if (method === "alrededores" && !town) {
    showToast("Por favor, especificá tu localidad");
    if (customTownInput && townSelect && townSelect.value === "Otro")
      customTownInput.focus();
    return;
  }

  const itemsMP = cart.map((item) => ({
    title: `${item.brand ? item.brand + " " : ""}${item.name} (${item.flavor})`,
    quantity: item.qty,
    unit_price: priceFor(item.usd),
    currency_id: "ARS",
  }));

  if (method === "alrededores") {
    itemsMP.push({
      title: "Costo de Envío (Alrededores)",
      quantity: 1,
      unit_price: 5000,
      currency_id: "ARS",
    });
  }

  showToast("Generando link de pago...");

  try {
    const respuesta = await fetch(WORKER_MP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: itemsMP,
        payer: { name: name, address: address, town: town },
      }),
    });

    const data = await respuesta.json();

    if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      showToast("Error al conectar con Mercado Pago");
    }
  } catch (error) {
    console.error("Error al procesar pago:", error);
    showToast("No se pudo iniciar el pago");
  }
}

// 2. Evento para el botón de Mercado Pago
const btnMP = document.getElementById("btnMercadoPago");
if (btnMP) {
  btnMP.addEventListener("click", pagarConMercadoPago);
}

// 3. Evento para el botón de WhatsApp (Mantiene tu código original)
if (cartCheckout) {
  cartCheckout.addEventListener("click", () => {
    const cart = getCart();
    if (cart.length === 0) {
      showToast("Tu carrito está vacío");
      return;
    }

    const nameInput = document.getElementById("clientName");
    const addressInput = document.getElementById("clientAddress");
    const customTownInput = document.getElementById("clientCustomTown");

    const name = nameInput ? nameInput.value.trim() : "";
    const method = deliverySelect ? deliverySelect.value : "retiro";
    const address = addressInput ? addressInput.value.trim() : "";

    let town = townSelect ? townSelect.value : "";
    if (town === "Otro" && customTownInput) {
      town = customTownInput.value.trim();
    }

    if (!name) {
      showToast("Por favor, ingresá tu nombre");
      if (nameInput) nameInput.focus();
      return;
    }

    if (method !== "retiro" && !address) {
      showToast("Por favor, ingresá tu dirección");
      if (addressInput) addressInput.focus();
      return;
    }

    if (method === "alrededores" && !town) {
      showToast("Por favor, especificá tu localidad");
      if (customTownInput && townSelect && townSelect.value === "Otro")
        customTownInput.focus();
      return;
    }

    let msg = `🛒 *NUEVO PEDIDO - CLOUD NINE*\n\n`;
    msg += `👤 *Cliente:* ${name}\n`;

    let shippingCost = 0;

    if (method === "retiro") {
      msg += `📍 *Entrega:* Retiro en persona\n`;
    } else if (method === "alta-gracia") {
      msg += `🛵 *Entrega:* Envío en Alta Gracia (GRATIS)\n`;
      msg += `📍 *Dirección:* ${address}\n`;
    } else if (method === "alrededores") {
      shippingCost = 5000;
      msg += `🛵 *Entrega:* Envío a Alrededores ($5.000)\n`;
      msg += `🏡 *Localidad:* ${town}\n`;
      msg += `📍 *Dirección:* ${address}\n`;
    }

    msg += `\n📦 *Detalle del pedido:*\n`;

    cart.forEach((item) => {
      msg += `• ${item.brand ? item.brand + " " : ""}${item.name}${item.flavor ? " (" + item.flavor + ")" : ""} × ${item.qty}\n`;
    });

    const subtotal = cart.reduce(
      (sum, item) => sum + priceFor(item.usd) * item.qty,
      0,
    );
    const total = subtotal + shippingCost;

    if (shippingCost > 0) {
      msg += `\n💰 *Subtotal:* ${fmtARS(subtotal)}`;
      msg += `\n🚚 *Envío:* $5.000`;
      msg += `\n💳 *Total final:* ${fmtARS(total)}`;
    } else {
      msg += `\n💳 *Total:* ${fmtARS(total)}`;
    }

    const cleanPhone = String(WHATSAPP_NUMBER).replace(/[^0-9]/g, "");
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;

    window.open(whatsappUrl, "_blank");

    localStorage.removeItem("cloudnine_cart");
    localStorage.removeItem(CHECKOUT_STORAGE_KEY);

    if (nameInput) nameInput.value = "";
    if (addressInput) addressInput.value = "";
    if (customTownInput) customTownInput.value = "";

    if (typeof renderCartBadge === "function") renderCartBadge();
    if (typeof renderCartPanel === "function") renderCartPanel();

    closeCart();
  });
}

// ==========================
// DÓLAR BLUE E INICIALIZACIÓN
// ==========================

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Cargar la cotización guardada si existe
  const savedRate = localStorage.getItem("cloudnine_dolar_rate");
  dolarBlueRate = savedRate ? Number(savedRate) : FALLBACK_RATE;

  // 2. Intentar actualizar el valor del Dólar Blue en tiempo real
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/blue");
    if (res.ok) {
      const data = await res.json();
      const liveRate = Number(data.venta);
      if (liveRate) {
        dolarBlueRate = liveRate;
        localStorage.setItem("cloudnine_dolar_rate", String(dolarBlueRate));
      }
    }
  } catch (e) {
    console.warn(
      "No se pudo obtener la cotización del dólar blue, usando respaldo.",
    );
  }

  // 3. Descargar productos desde la planilla de Google Sheets
  await fetchProductsFromSheet();

  // 4. Renderizar vista y carrito con datos actualizados
  renderProducts();
  renderCartPanel();
  renderCartBadge();
});

// ==========================
// FILTRO POR MARCAS Y RANGOS
// ==========================

function generarFiltrosMarcas(productos) {
  const brandContainer = document.getElementById("brandFilters");
  if (!brandContainer) return;

  // Detectar categoría actual de la página
  const currentPage = window.location.pathname
    .split("/")
    .pop()
    .replace(".html", "");

  // Filtrar productos por la categoría activa si aplica
  const productosCategoria = [
    "descartables",
    "recargables",
    "liquidos",
  ].includes(currentPage)
    ? productos.filter((p) => p.category === currentPage)
    : productos;

  // Extraer marcas únicas
  const marcas = [
    "all",
    ...new Set(productosCategoria.map((p) => p.brand).filter(Boolean)),
  ];

  // Generar HTML de botones
  brandContainer.innerHTML = marcas
    .map(
      (marca) => `
    <button 
      class="filter-btn ${marca === marcaSeleccionada ? "active" : ""}" 
      data-brand="${marca}"
      onclick="filtrarPorMarca('${marca}', this)">
      ${marca === "all" ? "Todas" : marca}
    </button>
  `,
    )
    .join("");
}

function filtrarPorMarca(marca, boton) {
  marcaSeleccionada = marca;
  sessionStorage.setItem("cloudnine_selected_brand", marca);

  // Marcar botón activo
  const botones = document.querySelectorAll("#brandFilters .filter-btn");
  botones.forEach((btn) => btn.classList.remove("active"));
  if (boton) boton.classList.add("active");

  // Volver a renderizar productos aplicando el filtro
  const currentQuery = searchInput ? searchInput.value : "";
  renderProducts(currentQuery);
}


// ==========================================
// FUNCIONALIDAD: BOTÓN VOLVER ARRIBA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const scrollTopBtn = document.getElementById('scrollTopBtn');

  if (!scrollTopBtn) return;

  // Mostrar/Ocultar el botón según la posición del scroll
  const handleScroll = () => {
    if (window.scrollY > 300) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  };

  // Escuchar el evento de scroll (usando requestAnimationFrame para optimizar rendimiento)
  let isTicking = false;
  window.addEventListener('scroll', () => {
    if (!isTicking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        isTicking = false;
      });
      isTicking = true;
    }
  });

  // Evento al hacer clic en el botón
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
});


//////////////////////////
/// BUSCADOR DE PRODUCTOS (GOOGLE SHEETS INTEGRADO CON SCROLL CENTRADO)
/////////////////////////

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('live-search-input');
  const clearBtn = document.getElementById('clear-search-btn');
  const dropdown = document.getElementById('search-results-dropdown');

  if (!searchInput) return;

  // 1. Obtener el precio mínimo en ARS de un producto
  function getProductStartingPrice(product) {
    if (!product.flavors || product.flavors.length === 0) return 0;
    
    const availableFlavors = product.flavors.filter(f => !f.outOfStock && !product.outOfStock);
    const listToUse = availableFlavors.length > 0 ? availableFlavors : product.flavors;

    if (availableFlavors.length === 0) return 0;

    const minUsd = Math.min(...availableFlavors.map(f => (f.promoUsd && f.promoUsd < f.usd) ? f.promoUsd : f.usd));
    return priceFor(minUsd);
  }

  // 2. Manejo de la búsqueda en tiempo real
  function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();

    if (clearBtn) {
      clearBtn.style.display = query.length > 0 ? 'block' : 'none';
    }

    if (query.length < 2) {
      if (dropdown) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
      }
      if (typeof renderProducts === 'function') renderProducts('');
      return;
    }

    // Filtrar desde el array real PRODUCTS
    const filtered = PRODUCTS.filter(product => {
      const matchBrand = product.brand.toLowerCase().includes(query);
      const matchName = product.name.toLowerCase().includes(query);
      const matchFlavor = product.flavors.some(f => f.name.toLowerCase().includes(query));

      return matchBrand || matchName || matchFlavor;
    });

    renderDropdown(filtered);

    // Filtrar también las tarjetas visibles en la grilla
    if (typeof renderProducts === 'function') {
      renderProducts(query);
    }
  }

  // 3. Renderizar items en el menú desplegable
  function renderDropdown(items) {
    if (!dropdown) return;

    if (items.length === 0) {
      dropdown.innerHTML = `<div class="search-no-results">No se encontraron productos</div>`;
    } else {
      dropdown.innerHTML = items.slice(0, 6).map(item => {
        const brandSlug = item.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const sectionId = `${item.category}-${brandSlug}`;
        const priceFormatted = fmtARS(getProductStartingPrice(item));
        const fullTitle = `${item.brand} ${item.name}`;
        // 🟢 CALCULAMOS SI TIENE STOCK Y SU PRECIO
        const startPrice = getProductStartingPrice(item);
        const isOut = item.outOfStock || startPrice <= 0;

        // 🟢 FORMATEAMOS LA ETIQUETA DEL PRECIO
        const priceHTML = isOut
          ? `<span class="out-of-stock-text">Sin stock</span>`
          : fmtARS(startPrice);

        return `
          <a href="#${sectionId}" class="search-result-item ${isOut ? 'is-out-of-stock' : ''}" data-section="${sectionId}" data-name="${fullTitle.toLowerCase()}">
            <img src="${item.image || 'assets/placeholder.jpg'}" alt="${fullTitle}" class="search-result-thumb" />
            <div class="search-result-info">
              <span class="search-result-title"><strong>${item.brand}</strong> ${item.name}</span>
              <span class="search-result-price">${priceHTML}</span>
            </div>
          </a>
        `;
      }).join('');

      // Evento al hacer clic en un item de las sugerencias
      dropdown.querySelectorAll('.search-result-item').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetName = link.getAttribute('data-name');
          const sectionId = link.getAttribute('data-section');

          dropdown.classList.add('hidden');

          // Buscar la tarjeta del producto exacto por su título (h3)
          let targetCard = null;
          const cards = document.querySelectorAll('.card');
          
          cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3) {
              const cardTitle = h3.textContent.trim().toLowerCase();
              if (cardTitle.includes(targetName) || targetName.includes(cardTitle)) {
                targetCard = card;
              }
            }
          });

          // Si encuentra la tarjeta del modelo, desliza y lo CENTRA en la pantalla
          if (targetCard) {
            targetCard.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
            
            // Resaltar suavemente el producto seleccionado
            targetCard.style.transition = 'outline 0.3s ease, transform 0.3s ease';
            targetCard.style.transform = 'scale(1.03)';
            setTimeout(() => {
              targetCard.style.transform = 'scale(1)';
            }, 600);
          } else {
            // Si no ubica la tarjeta exacta, desliza hasta el título de la marca/sección
            const sectionEl = document.getElementById(sectionId);
            if (sectionEl) {
              sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        });
      });
    }
    dropdown.classList.remove('hidden');
  }

// 4. Eventos de interacción
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      handleSearch();
    }, 200); // Espera 200ms después de que la persona deja de escribir
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      handleSearch();
      searchInput.focus();
    });
  }

  document.addEventListener('click', (e) => {
    if (dropdown && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length >= 2) {
      handleSearch();
    }
  });
});

// ==========================================
// SCROLL REVEAL (INTERSECTION OBSERVER)
// ==========================================

function initScrollReveal() {
  // Comprobar soporte de IntersectionObserver
  if (!('IntersectionObserver' in window)) {
    return; // Si el navegador es antiguo, muestra las tarjetas normalmente
  }

  const observerOptions = {
    root: null, // usa el viewport del navegador
    rootMargin: '0px 0px -50px 0px', // se activa 50px antes de entrar completamente
    threshold: 0.1
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Agrega la clase 'visible' cuando la tarjeta entra en pantalla
        entry.target.classList.add('visible');
        // Deja de observar la tarjeta una vez animada (mejora de rendimiento)
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Selecciona todas las tarjetas de la tienda
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, index) => {
    // Aplica la clase base para ocultar y animar
    card.classList.add('card-reveal');
    
    // Opcional: Pequeño escalonamiento (stagger) para las tarjetas visibles de entrada
    card.style.transitionDelay = `${(index % 4) * 0.08}s`;
    
    revealObserver.observe(card);
  });
}
