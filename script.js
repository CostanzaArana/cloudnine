

// =========================================================
// 2. BACKDROP Y CONTROL DE SCROLL GLOBAL
// =========================================================

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
    if (typeof closeMenu === "function") closeMenu();
    closeCart();
  });
}

// =========================================================
// 3. PANEL DEL CARRITO Y ENVÍOS
// =========================================================

function renderCartPanel() {
  const itemsEl = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");

  if (!itemsEl || !totalEl) return;

  const cart = typeof getCart === "function" ? getCart() : [];
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

// =========================================================
// 4. ABRIR Y CERRAR CARRITO
// =========================================================

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

// =========================================================
// 5. PERSISTENCIA Y CHECKOUT POR WHATSAPP / MERCADO PAGO
// =========================================================

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

// =========================================================
// 6. REGISTRO DE PEDIDOS EN GOOGLE SHEETS
// =========================================================

function registrarPedidoEnSheet(pedidoPayload) {
  if (typeof GOOGLE_SHEET_URL === "undefined") return;
  fetch(GOOGLE_SHEET_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pedidoPayload),
  }).catch((err) => console.error("Error al registrar pedido en Sheet:", err));
}

// =========================================================
// 7. PROCESAMIENTO DE PEDIDOS (WHATSAPP & MERCADO PAGO)
// =========================================================

function obtenerDatosFormularioYValidar() {
  const cart = typeof getCart === "function" ? getCart() : [];
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

// =========================================================
// 8. INICIALIZACIÓN Y DÓLAR BLUE API
// =========================================================

if (typeof fetchProductsFromSheet === "function") {
  fetchProductsFromSheet();
}

async function fetchDolarBlue() {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/blue");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    if (data && data.venta) {
      if (typeof dolarBlueRate !== "undefined") {
        dolarBlueRate = data.venta;
      }
      if (typeof renderProducts === "function") renderProducts();
      if (typeof renderCartPanel === "function") renderCartPanel();
    }
  } catch (error) {
    console.error("Error al obtener la cotización del dólar blue:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchDolarBlue();
});