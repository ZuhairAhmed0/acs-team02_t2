import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Create user record in users table
      if (data.user) {
        const { error: userError } = await supabase.from("users").insert([
          {
            "user-id": data.user.id,
            email: email,
            "full-name": fullName,
          },
        ]);

        if (userError) throw userError;

        // Fetch all stations
        const { data: stationsData, error: stationsError } = await supabase
          .from("stations")
          .select("id");

        if (stationsError) throw stationsError;

        // Create a wallet for each station for the user
        const walletsToInsert = stationsData.map((station) => ({
          "user-id": data.user.id,
          balance: 0,
          "station-id": station.id,
        }));

        const { error: walletError } = await supabase
          .from("wallets")
          .insert(walletsToInsert);

        if (walletError) throw walletError;
      }

      navigate("/dashboard");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>بنزيناك</h1>
        <h2>إنشاء حساب جديد</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label>الاسم الكامل</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
          </button>
        </form>
        <p>
          لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
