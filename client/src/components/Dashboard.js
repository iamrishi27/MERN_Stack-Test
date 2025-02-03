import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import "chart.js/auto";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:7001/api";

const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState({ totalAmount: 0, soldItems: 0, unsoldItems: 0 });
  const [barData, setBarData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [month, setMonth] = useState("03");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const perPage = 10;

  
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      console.log(`Fetching from: ${API_BASE_URL}/transactions`);
      //console.log(data);

      const { data } = await axios.get(`${API_BASE_URL}/transactions`, {
        params: { month, search, page, perPage },
      });
      //console.log(data);

      console.log("Transactions Data:", data);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error(" Error fetching transactions:", error.response?.data || error.message);
      //console.log(data);
    } finally {
      setLoading(false);
    }
}, [month, search, page]);
//console.log(data);


 
  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/statistics`, { params: { month } });
      setStatistics(data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      alert("Error fetching statistics.");
    } finally {
      setLoading(false);
    }
  }, [month]);
  //console.log(data);

  const fetchBarChart = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/bar-chart`, { params: { month } });
      setBarData(data);
    } catch (error) {
      console.error("Error fetching bar chart:", error);
      alert("Error fetching bar chart.");
    } finally {
      setLoading(false);
    }
  }, [month]);
  //console.log(data);

  const fetchPieChart = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/pie-chart`, { params: { month } });
      setPieData(data);
    } catch (error) {
      console.error("Error fetching pie chart:", error);
      alert("Error fetching pie chart.");
    } finally {
      setLoading(false);
    }
  }, [month]);
  //console.log(data);

  useEffect(() => {
    fetchTransactions();
    fetchStatistics();
    fetchBarChart();
    fetchPieChart();
  }, [fetchTransactions, fetchStatistics, fetchBarChart, fetchPieChart]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">Transaction Dashboard</h1>

      <div className="flex space-x-4 justify-center my-4">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="p-2 border rounded">
          {[...Array(12)].map((_, i) => (
            <option key={i} value={(i + 1).toString().padStart(2, "0")}>
              {new Date(2023, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search transactions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 border rounded"
        />
      </div>

 
      {loading ? (
        <div className="text-center py-4">Loading transactions...</div>
      ) : (
        <table className="w-full border-collapse border border-gray-300 mt-4">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">ID</th>
              <th className="border p-2">Title</th>
              <th className="border p-2">Price</th>
              <th className="border p-2">Description</th>
              <th className="border p-2">Sold</th>
              <th className="border p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <tr key={tx.id} className="border">
                  <td className="border p-2">{tx.id}</td>
                  <td className="border p-2">{tx.title}</td>
                  <td className="border p-2">₹{tx.price}</td>
                  <td className="border p-2">{tx.description}</td>
                  <td className="border p-2">{tx.sold ? "Yes" : "No"}</td>
                  <td className="border p-2">{new Date(tx.dateOfSale).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center p-4">No transactions found</td>
              </tr>
            )}
          </tbody>
        </table>
      )}


      <div className="flex justify-center mt-4 space-x-4">
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          Previous
        </button>
        <span className="text-lg">Page {page}</span>
        <button onClick={() => setPage((prev) => prev + 1)} className="px-4 py-2 bg-blue-500 text-white rounded">
          Next
        </button>
      </div>


      <div className="flex flex-wrap justify-center mt-6 space-x-6">

        <div className="p-4 border rounded shadow-lg bg-white">
          <h2 className="text-xl font-bold">Total Sales: ₹{statistics.totalAmount || 0}</h2>
          <h2 className="text-lg">Total Sold Items: {statistics.soldItems || 0}</h2>
          <h2 className="text-lg">Total Unsold Items: {statistics.unsoldItems || 0}</h2>
        </div>

  
        <div className="w-1/2 p-4">
          <h2 className="text-xl font-bold mb-4">Bar Chart</h2>
          <Bar
            data={{
              labels: barData.length ? barData.map((d) => d.range) : ["No Data"],
              datasets: [
                {
                  label: "Items Count",
                  data: barData.length ? barData.map((d) => d.count) : [0],
                  backgroundColor: "#3498db",
                },
              ],
            }}

            options={{ responsive: true }}
          //console.log(data);

          />
        </div>

        <div className="w-1/2 p-4">
  <h2 className="text-xl font-bold mb-4">Pie Chart</h2>
  <Pie
    data={{
      labels: pieData.map((d) => d._id),
      datasets: [
        {
          data: pieData.map((d) => d.count),
          backgroundColor: ["#1abc9c", "#e74c3c", "#9b59b6"],
        },
      ],
    }}
    options={{ responsive: true }}
  />
</div>


      </div>
    </div>
  );
};

export default Dashboard;

//console.log(data);