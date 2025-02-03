require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(cors({ origin: "http://localhost:3000" })); 

const PORT = process.env.PORT || 7001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/transactionsDB";


mongoose.connect(MONGO_URI)
  .then(() => console.log(" MongoDB connected"))
  .catch(err => {
    console.error(" MongoDB connection error:", err);
    process.exit(1);
  });



const counterSchema = new mongoose.Schema({
    _id: String,
    sequence_value: Number,
});
const Counter = mongoose.model("Counter", counterSchema);

const getNextSequenceValue = async (sequenceName) => {
    const counter = await Counter.findByIdAndUpdate(
        sequenceName,
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
    );

    if (!counter) {
        console.error(" Failed to generate auto-incremented ID");
        return null;
    }
    return counter.sequence_value;
};


const transactionSchema = new mongoose.Schema({
    id: Number,
    title: String,
    price: Number,
    description: String,
    category: String,
    sold: Boolean,
    dateOfSale: Date
});
const Transaction = mongoose.model("Transaction", transactionSchema);




app.get("/api/init", async (req, res) => {
    try {
        console.log(" Initializing database...");
        const response = await axios.get("https://s3.amazonaws.com/roxiler.com/product_transaction.json");

        if (!response.data || !Array.isArray(response.data)) {
            return res.status(500).json({ error: " API returned invalid data" });
        }
          //console.log(data);

        console.log(" Sample API Data:", response.data[0]);

        await Transaction.deleteMany({});
        console.log("🗑 Cleared existing transactions...");

        const transactionsToInsert = await Promise.all(response.data.map(async (transaction) => {
            return {
                id: await getNextSequenceValue("transaction_id"),
                title: transaction.title,
                price: transaction.price,
                description: transaction.description,
                category: transaction.category,
                sold: transaction.sold,
                dateOfSale: new Date(  // 
                    2023, 
                    Math.floor(Math.random() * 12), 
                    Math.floor(Math.random() * 28) + 1 
                )
            };
        }));

        await Transaction.insertMany(transactionsToInsert);
        console.log(" Inserted Transactions:", transactionsToInsert.length);

        res.status(200).json({ message: " Database initialized successfully", totalRecords: transactionsToInsert.length });
    } catch (error) {
        console.error(" Error initializing database:", error);
        res.status(500).json({ error: "Failed to initialize data", details: error.message });
    }
});



app.get("/api/transactions", async (req, res) => {
    const { month, search = "", page = 1, perPage = 10 } = req.query;
    if (!month) return res.status(400).json({ error: " Month is required" });

    console.log(` Fetching transactions for Month: ${month}, Page: ${page}, Search: ${search}`);

    const startDate = new Date(`2023-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const filter = {
        dateOfSale: { $gte: startDate, $lt: endDate },
        $or: [
            { title: new RegExp(search, "i") },
            { description: new RegExp(search, "i") },
            ...(isNaN(search) ? [] : [{ price: Number(search) }])
        ]
    };
          //console.log(data);


    try {
        const transactions = await Transaction.find(filter)
            .skip((page - 1) * perPage)
            .limit(Number(perPage));

        console.log(" Transactions Found:", transactions.length);
        res.json({ transactions });
    } catch (error) {
        console.error(" Error fetching transactions:", error);
        res.status(500).json({ error: " Error fetching transactions", details: error.message });
    }
});
          //console.log(data);



app.get("/api/statistics", async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: " Month is required" });

    const startDate = new Date(`2023-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    try {
        const totalSales = await Transaction.aggregate([ 
            { $match: { dateOfSale: { $gte: startDate, $lt: endDate } } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$price" },
                    soldItems: { $sum: { $cond: [{ $eq: ["$sold", true] }, 1, 0] } }
                }
            }
        ]);
          //console.log(data);

        const totalTransactions = await Transaction.countDocuments({
            dateOfSale: { $gte: startDate, $lt: endDate },
        });

        const soldItems = totalSales.length ? totalSales[0].soldItems : 0;
        const totalAmount = totalSales.length ? totalSales[0].totalAmount : 0;

        res.json({ totalAmount, soldItems, unsoldItems: totalTransactions - soldItems });
    } catch (error) {
        res.status(500).json({ error: " Error fetching statistics", details: error.message });
    }
});

          //console.log(data);

app.get("/api/bar-chart", async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: "Month is required" });

    const startDate = new Date(`2023-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const priceRanges = [
        { range: "0-100", min: 0, max: 100 },
        { range: "101-200", min: 101, max: 200 },
        { range: "201-300", min: 201, max: 300 },
        { range: "301-400", min: 301, max: 400 },
        { range: "401-500", min: 401, max: 500 },
        { range: "501-600", min: 501, max: 600 },
        { range: "601-700", min: 601, max: 700 },
        { range: "701-800", min: 701, max: 800 },
        { range: "801-900", min: 801, max: 900 },
        { range: "901-above", min: 901, max: Infinity }
    ];

    try {
        const barData = await Promise.all(priceRanges.map(async (range) => {
            const count = await Transaction.countDocuments({
                dateOfSale: { $gte: startDate, $lt: endDate },
                price: { $gte: range.min, $lt: range.max }
            });
            return { range: range.range, count };
        }));
        res.json(barData);
    } catch (error) {
        res.status(500).json({ error: "Error fetching bar chart data", details: error.message });
    }
});
          //console.log(data);


app.get("/api/pie-chart", async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: " Month is required" });

    const startDate = new Date(`2023-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    try {
        const pieData = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startDate, $lt: endDate } } },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);
        res.json(pieData);
    } catch (error) {
        res.status(500).json({ error: "Error fetching pie chart data", details: error.message });
    }
});

          //console.log(data);

app.get("/test", (req, res) => {
    res.json({ message: "Server is working!" });
});

app.listen(PORT, () => 
    console.log(`🚀 Server running at http://localhost:${PORT}`)
    );
