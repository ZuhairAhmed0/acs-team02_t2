import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [stations, setStations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferToStation, setTransferToStation] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Get the wallet for the selected station
  const selectedWallet = selectedStation
    ? wallets.find(
        (w) => String(w["station-id"]) === String(selectedStation.id),
      )
    : null;

  const fetchData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      setUser(session.user);
      console.log("User ID:", session.user.id);

      // Test Supabase connection
      const { data: testData, error: testError } = await supabase
        .from("stations")
        .select("count")
        .limit(1);
      console.log("Test query result:", testData, testError);

      // Fetch all user's wallets - try explicit columns
      const { data: walletsData, error: walletsError } = await supabase
        .from("wallets")
        .select("id, user-id, station-id, balance");

      if (walletsError) {
        console.error("Wallets error:", walletsError);
      } else {
        console.log("All wallets data (explicit):", walletsData);
        console.log("All wallets count:", walletsData?.length);
      }
      // Filter for current user
      const userWallets =
        walletsData?.filter((w) => w["user-id"] === session.user.id) || [];
      setWallets(userWallets);

      // Fetch stations - try explicit columns
      const { data: stationsData, error: stationsError } = await supabase
        .from("stations")
        .select("id, name, location");

      if (stationsError) {
        console.error("Stations error:", stationsError);
      } else {
        console.log("Stations data (explicit):", stationsData);
        console.log("Stations count:", stationsData?.length);
      }
      setStations(stationsData || []);

      // Fetch transactions - try explicit columns
      const { data: transactionsData, error: transactionsError } =
        await supabase
          .from("transactions")
          .select("id, user-id, wallet-id, type, amount, status, created_at")
          .order("created_at", { ascending: false })
          .limit(20);

      if (transactionsError) {
        console.error("Transactions error:", transactionsError);
      } else {
        console.log("All transactions data (explicit):", transactionsData);
        console.log("All transactions count:", transactionsData?.length);
      }
      // Filter for current user
      const userTransactions =
        transactionsData?.filter((t) => t["user-id"] === session.user.id) || [];
      setTransactions(userTransactions);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleTopUp = async (e) => {
    e.preventDefault();
    if (!topUpAmount || !selectedWallet || !selectedStation) return;

    try {
      // Update wallet balance for selected station
      const newBalance =
        parseFloat(selectedWallet.balance) + parseFloat(topUpAmount);
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", selectedWallet.id);

      if (walletError) throw walletError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            "user-id": user.id,
            "wallet-id": selectedWallet.id,
            type: "charge",
            amount: parseFloat(topUpAmount),
            "to-station": selectedStation.id,
            status: "completed",
          },
        ]);

      if (transactionError) throw transactionError;

      setTopUpAmount("");
      setShowTopUp(false);
      fetchData();
    } catch (error) {
      console.error("Error topping up:", error);
      alert("فشلت عملية الشحن");
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || !selectedStation || !selectedWallet) return;

    try {
      const amount = parseFloat(paymentAmount);
      if (amount > selectedWallet.balance) {
        alert("رصيد غير كافٍ");
        return;
      }

      // Update wallet balance for selected station
      const newBalance = selectedWallet.balance - amount;
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", selectedWallet.id);

      if (walletError) throw walletError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            "user-id": user.id,
            "wallet-id": selectedWallet.id,
            type: "payment",
            amount: amount,
            "to-station": selectedStation.id,
            status: "completed",
          },
        ]);

      if (transactionError) throw transactionError;

      setPaymentAmount("");
      setShowPayment(false);
      fetchData();
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("فشلت عملية الدفع");
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (
      !transferAmount ||
      !transferToStation ||
      !selectedWallet ||
      !selectedStation
    )
      return;

    try {
      const amount = parseFloat(transferAmount);
      if (amount > selectedWallet.balance) {
        alert("رصيد غير كافٍ");
        return;
      }

      // Get the destination wallet
      const destWallet = wallets.find(
        (w) => String(w["station-id"]) === String(transferToStation),
      );
      if (!destWallet) {
        alert("المحطة المستهدفة ليس لها محفظة");
        return;
      }

      // Deduct from source wallet
      const sourceNewBalance = selectedWallet.balance - amount;
      const { error: sourceWalletError } = await supabase
        .from("wallets")
        .update({ balance: sourceNewBalance })
        .eq("id", selectedWallet.id);

      if (sourceWalletError) throw sourceWalletError;

      // Add to destination wallet
      const destNewBalance = parseFloat(destWallet.balance) + amount;
      const { error: destWalletError } = await supabase
        .from("wallets")
        .update({ balance: destNewBalance })
        .eq("id", destWallet.id);

      if (destWalletError) throw destWalletError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            "user-id": user.id,
            "wallet-id": selectedWallet.id,
            type: "transfer",
            amount: amount,
            "from-station": selectedStation.id,
            "to-station": transferToStation,
            status: "completed",
          },
        ]);

      if (transactionError) throw transactionError;

      setTransferAmount("");
      setTransferToStation("");
      setShowTransfer(false);
      fetchData();
    } catch (error) {
      console.error("Error processing transfer:", error);
      alert("فشلت عملية التحويل");
    }
  };

  const getTransactionTypeText = (type) => {
    switch (type) {
      case "charge":
        return "شحن";
      case "payment":
        return "دفع";
      case "transfer":
        return "تحويل";
      default:
        return type;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "مكتمل";
      case "pending":
        return "قيد الانتظار";
      case "failed":
        return "فشل";
      default:
        return status;
    }
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="logo">
          <h1>بنزيناك</h1>
        </div>
        <div className="user-info">
          <span>{user?.user_metadata?.full_name || user?.email}</span>
          <button onClick={handleLogout} className="logout-btn">
            تسجيل الخروج
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="balance-card">
          <h2>
            {selectedStation
              ? `رصيد محطة ${selectedStation.name}`
              : "اختر محطة لعرض الرصيد"}
          </h2>
          <div className="balance-amount">
            {selectedWallet
              ? `${selectedWallet.balance.toFixed(2)} ج.س`
              : "0.00 ج.س"}
          </div>
        </div>

        <div className="stations-section">
          <h2>المحطات المتاحة</h2>
          <div className="stations-list">
            {stations.map((station) => {
              const stationWallet = wallets.find(
                (w) => String(w["station-id"]) === String(station.id),
              );
              return (
                <div
                  key={station.id}
                  className={`station-card ${selectedStation?.id === station.id ? "selected" : ""}`}
                  onClick={() => setSelectedStation(station)}
                >
                  <h3>{station.name}</h3>
                  <p>{station.location}</p>
                  <p className="station-balance">
                    الرصيد:{" "}
                    {stationWallet
                      ? `${stationWallet.balance.toFixed(2)} ج.س`
                      : "0.00 ج.س"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="actions-section">
          <button
            onClick={() => setShowTopUp(true)}
            className="action-btn top-up"
          >
            شحن الرصيد
          </button>
          <button
            onClick={() => setShowPayment(true)}
            className="action-btn payment"
            disabled={!selectedStation}
          >
            دفع الوقود
          </button>
          <button
            onClick={() => setShowTransfer(true)}
            className="action-btn transfer"
            disabled={!selectedStation}
          >
            تحويل الرصيد
          </button>
        </div>

        <div className="transactions-section">
          <h2>سجل المعاملات</h2>
          <div className="transactions-table">
            <table>
              <thead>
                <tr>
                  <th>النوع</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{getTransactionTypeText(transaction.type)}</td>
                    <td>{transaction.amount.toFixed(2)} ج.س</td>
                    <td>{getStatusText(transaction.status)}</td>
                    <td>
                      {new Date(transaction.created_at).toLocaleDateString(
                        "ar-SD",
                      )}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan="4" className="no-transactions">
                      لا توجد معاملات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Top Up Modal */}
      {showTopUp && (
        <div className="modal">
          <div className="modal-content">
            <h2>شحن الرصيد</h2>
            <form onSubmit={handleTopUp}>
              <div className="form-group">
                <label>المبلغ (ج.س)</label>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  required
                  min="1"
                  step="0.01"
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="submit-btn">
                  شحن
                </button>
                <button
                  type="button"
                  onClick={() => setShowTopUp(false)}
                  className="cancel-btn"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="modal">
          <div className="modal-content">
            <h2>دفع الوقود</h2>
            <p>المحطة: {selectedStation?.name}</p>
            <form onSubmit={handlePayment}>
              <div className="form-group">
                <label>المبلغ (ج.س)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  min="1"
                  step="0.01"
                  max={selectedWallet?.balance}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="submit-btn">
                  دفع
                </button>
                <button
                  type="button"
                  onClick={() => setShowPayment(false)}
                  className="cancel-btn"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="modal">
          <div className="modal-content">
            <h2>تحويل الرصيد</h2>
            <p>من: {selectedStation?.name}</p>
            <form onSubmit={handleTransfer}>
              <div className="form-group">
                <label>إلى المحطة</label>
                <select
                  value={transferToStation}
                  onChange={(e) => setTransferToStation(e.target.value)}
                  required
                >
                  <option value="">اختر المحطة</option>
                  {stations
                    .filter((s) => s.id !== selectedStation?.id)
                    .map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label>المبلغ (ج.س)</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                  min="1"
                  step="0.01"
                  max={selectedWallet?.balance}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="submit-btn">
                  تحويل
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransfer(false)}
                  className="cancel-btn"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
