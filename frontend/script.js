const API_URL = "http://localhost:5000/api";

let products = [];
let cart = JSON.parse(localStorage.getItem("wanderGearCart")) || [];

const productGrid = document.getElementById("product-grid");
const categoryFilters = document.getElementById("category-filters");
const cartButton = document.getElementById("cart-button");
const cartPanel = document.getElementById("cart-panel");
const cartOverlay = document.getElementById("cart-overlay");
const closeCart = document.getElementById("close-cart");
const cartItems = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");
const checkoutButton = document.getElementById("checkout-button");
const checkoutModal = document.getElementById("checkout-modal");
const closeCheckout = document.getElementById("close-checkout");
const checkoutForm = document.getElementById("checkout-form");
const checkoutFormView = document.getElementById("checkout-form-view");
const confirmationView = document.getElementById("confirmation-view");
const continueShopping = document.getElementById("continue-shopping");

function formatPrice(value) {
    return new Intl.NumberFormat("en-IN").format(value);
}

function saveCart() {
    localStorage.setItem("wanderGearCart", JSON.stringify(cart));
}

function cartQuantity() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function cartTotalValue() {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function renderProducts(category = "All") {
    const filteredProducts = category === "All"
        ? products
        : products.filter(product => product.category === category);

    productGrid.innerHTML = filteredProducts.map(product => `
        <article class="product-card">
            <div class="product-art">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="price-row">
                    <span class="price">₹${formatPrice(product.price)}</span>
                    <button class="add-button" data-product-id="${product.id}">Add to Cart</button>
                </div>
            </div>
        </article>
    `).join("");

    document.querySelectorAll(".add-button").forEach(button => {
        button.addEventListener("click", () => {
            addToCart(Number(button.dataset.productId));
        });
    });
}


function renderCart() {
    cartCount.textContent = cartQuantity();

    if (cart.length === 0) {
        cartItems.innerHTML = `<p class="empty-cart">Your cart is empty.</p>`;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-title">${item.name} — ₹${formatPrice(item.price)}</div>
                <div class="cart-item-controls">
                    <button class="qty-button" data-action="decrease" data-id="${item.id}">−</button>
                    <span class="qty-number">${item.quantity}</span>
                    <button class="qty-button" data-action="increase" data-id="${item.id}">+</button>
                    <button class="remove-button" data-action="remove" data-id="${item.id}">Remove</button>
                </div>
            </div>
        `).join("");
    }

    cartTotal.textContent = formatPrice(cartTotalValue());
    checkoutButton.disabled = cart.length === 0;
    checkoutButton.style.opacity = cart.length === 0 ? "0.5" : "1";

    document.querySelectorAll("#cart-items button").forEach(button => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.id);
            const action = button.dataset.action;
            const item = cart.find(product => product.id === id);

            if (!item) return;

            if (action === "increase") item.quantity += 1;
            if (action === "decrease") item.quantity -= 1;
            if (action === "remove" || item.quantity <= 0) {
                cart = cart.filter(product => product.id !== id);
            }

            saveCart();
            renderCart();
        });
    });
}

function addToCart(productId) {
    const product = products.find(item => item.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }

    saveCart();
    renderCart();
    openCart();
}

function openCart() {
    cartPanel.classList.remove("hidden");
    cartOverlay.classList.remove("hidden");
}

function closeCartPanel() {
    cartPanel.classList.add("hidden");
    cartOverlay.classList.add("hidden");
}

cartButton.addEventListener("click", openCart);
closeCart.addEventListener("click", closeCartPanel);
cartOverlay.addEventListener("click", closeCartPanel);

checkoutButton.addEventListener("click", () => {
    if (cart.length === 0) return;
    checkoutModal.classList.remove("hidden");
    closeCartPanel();
});

closeCheckout.addEventListener("click", () => {
    checkoutModal.classList.add("hidden");
});

checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const orderData = {
        customer: {
            name: document.getElementById("customer-name").value.trim(),
            phone: document.getElementById("customer-phone").value.trim(),
            address: document.getElementById("customer-address").value.trim(),
            city: document.getElementById("customer-city").value.trim(),
            pin: document.getElementById("customer-pin").value.trim()
        },
        items: cart.map(item => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),
        total: cartTotalValue()
    };

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Could not place order.");
        }

        document.getElementById("confirmation-order-id").textContent = result.orderId;
        document.getElementById("confirmation-total").textContent = formatPrice(result.order.total);
        document.getElementById("confirmation-address").textContent =
            `${result.order.customer.address}, ${result.order.customer.city} - ${result.order.customer.pin}`;

        checkoutFormView.classList.add("hidden");
        confirmationView.classList.remove("hidden");
checkoutForm.reset();
        cart = [];
        saveCart();
        renderCart();

    } catch (error) {
        alert(error.message);
    }
});

continueShopping.addEventListener("click", () => {
    checkoutModal.classList.add("hidden");
    checkoutForm.reset();
    checkoutFormView.classList.remove("hidden");
    confirmationView.classList.add("hidden");
    window.location.hash = "products";
});

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error("Could not load products.");
        products = await response.json();
        renderProducts();
        renderCart();
    } catch (error) {
        productGrid.innerHTML = `
            <p>
                Backend is not running yet. Start the backend server and refresh this page.
            </p>
        `;
        console.error(error);
    }
}

categoryFilters.addEventListener("click", (event) => {
    const button = event.target.closest(".category-button");

    if (!button) return;

    document.querySelectorAll(".category-button").forEach(item => {
        item.classList.remove("active");
    });

    button.classList.add("active");

    renderProducts(button.dataset.category);
});

loadProducts();
