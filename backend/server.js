const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);

let db;
const productsCollectionName = "products";
const ordersCollectionName = "orders";

const app = express();
const PORT = 5000;

const productsPath = path.join(__dirname, "data", "products.json");
const ordersPath = path.join(__dirname, "data", "orders.json");

app.use(cors());
app.use(express.json());

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

app.get("/api/products", async (req, res) => {
    try {
        const products = await db
            .collection(productsCollectionName)
            .find({})
            .toArray();

        res.json(products);
    } catch (error) {
        console.error("Failed to load products:", error.message);

        res.status(500).json({
            message: "Failed to load products."
        });
    }
});

app.get("/api/orders", async (req, res) => {
    try {
        const orders = await db
            .collection(ordersCollectionName)
            .find({})
            .toArray();

        res.json(orders);
    } catch (error) {
        console.error("Failed to load orders:", error.message);

        res.status(500).json({
            message: "Failed to load orders."
        });
    }
});

app.post("/api/orders", async (req, res) => {
    const { customer, items, total } = req.body;

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            message: "Customer details and at least one cart item are required."
        });
    }

    const requiredCustomerFields = ["name", "phone", "address", "city", "pin"];

    for (const field of requiredCustomerFields) {
        if (!String(customer[field] || "").trim()) {
            return res.status(400).json({
                message: `Please provide ${field}.`
            });
        }
    }

    if (!/^\d{10}$/.test(customer.phone)) {
        return res.status(400).json({
            message: "Phone number must contain 10 digits."
        });
    }

    if (!/^\d{6}$/.test(customer.pin)) {
        return res.status(400).json({
            message: "PIN code must contain 6 digits."
        });
    }

    const products = readJson(productsPath);

    let calculatedTotal = 0;

    for (const item of items) {
        const product = products.find(p => p.id === Number(item.productId));

        if (!product) {
            return res.status(400).json({
                message: "One of the selected products no longer exists."
            });
        }

        const quantity = Number(item.quantity);

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
            return res.status(400).json({
                message: "Invalid product quantity."
            });
        }

        calculatedTotal += product.price * quantity;
    }

    if (Number(total) !== calculatedTotal) {
        return res.status(400).json({
            message: "Order total validation failed."
        });
    }

    

    const order = {
        orderId: `WG-${Math.floor(100000 + Math.random() * 900000)}`,
        customer: {
            name: customer.name.trim(),
            phone: customer.phone.trim(),
            address: customer.address.trim(),
            city: customer.city.trim(),
            pin: customer.pin.trim()
        },
        items: items.map(item => ({
            productId: Number(item.productId),
            name: String(item.name),
            price: Number(item.price),
            quantity: Number(item.quantity)
        })),
        total: calculatedTotal,
        status: "Placed",
        createdAt: new Date().toISOString()
    };

    await db.collection(ordersCollectionName).insertOne(order);

    res.status(201).json({
        message: "Order placed successfully.",
        order
    });
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "WanderGear backend is running." });
});

async function startServer() {
    try {
        await client.connect();

        db = client.db("wandergear");

        console.log("Connected to MongoDB successfully.");

        const productsCollection = db.collection(productsCollectionName);

const productCount = await productsCollection.countDocuments();

if (productCount === 0) {
    const products = readJson(productsPath);

    await productsCollection.insertMany(products);

    console.log("Products added to MongoDB.");
}

        app.listen(PORT, () => {
            console.log(`WanderGear backend running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
    }
}

startServer();
