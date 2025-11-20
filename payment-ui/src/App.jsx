import { useState, useEffect } from "react";
import "./App.css";
import paypalQR from "./paypal-qr.png";
import TableDisplay from "./TableDisplay";

function App() {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState({ name: "", email: "", address: "" });
  const [plan, setPlan] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(""); // 'upi' or 'paypal'
  const [paymentStage, setPaymentStage] = useState("choose");
  const [screenshot, setScreenshot] = useState(null);
  const [upiId, setUpiId] = useState("");
  const [upiRef, setUpiRef] = useState("");
  const [showPayments, setShowPayments] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsError, setPaymentsError] = useState(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [timer, setTimer] = useState(300);

  // Admin Email
  const adminEmail = "m.r.moharana789@gmail.com";

  // For simple admin login prompt
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPromptEmail, setAdminPromptEmail] = useState("");
  const [adminPromptError, setAdminPromptError] = useState("");

  // User info
  const handleUserChange = (e) =>
    setUser({ ...user, [e.target.name]: e.target.value });

  const handleUserSubmit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  // Plan
  const handlePlanChange = (e) => setPlan(e.target.value);

  const handlePlanSubmit = (e) => {
    e.preventDefault();
    if (!plan) {
      alert("Please select a Subscription Plan!");
      return;
    }
    setStep(3);
    setPaymentStage("choose");
    setPaymentMethod("");
  };

  // Payment stage logic
  const handlePayOption = (method) => {
    setPaymentMethod(method);
    setPaymentStage(method);
    setPaymentSubmitted(false);
    if (method === "paypal") {
      setTimer(300);
    } else if (method === "upi") {
      setUpiId("");
      setUpiRef("");
    }
  };

  // Back navigation logic
  const handleStepBack = () => {
    if (step === 3) {
      if (paymentStage === "choose") {
        setStep(2);
        setPaymentStage("choose");
        setPaymentMethod("");
      } else if (paymentStage === "upi" || paymentStage === "paypal") {
        setPaymentStage("choose");
        setPaymentMethod("");
      }
    } else if (step === 2) {
      setStep(1);
    }
  };

  // Payment screenshot/file
  const handleFileChange = (e) => setScreenshot(e.target.files[0]);

  // Submit payment logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("name", user.name);
      formData.append("email", user.email);
      formData.append("address", user.address);
      formData.append("plan", plan);
      formData.append("paymentMethod", paymentMethod);

      if (paymentMethod === "paypal" && screenshot)
        formData.append("screenshot", screenshot);
      if (paymentMethod === "upi") {
        formData.append("upiId", upiId);
        formData.append("upiRef", upiRef);
      }

      const res = await fetch("http://localhost:5000/api/payments", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        console.error("Payment error:", data);
        alert("Error submitting payment. Check console for details.");
        return;
      }

      setPaymentSubmitted(true);
      console.log("Saved payment:", data.payment);
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Network error while submitting payment.");
    }
  };

  useEffect(() => {
    if (
      paymentMethod === "paypal" &&
      paymentStage === "paypal" &&
      timer > 0 &&
      !paymentSubmitted
    ) {
      const countdown = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(countdown);
    }
  }, [paymentMethod, paymentStage, timer, paymentSubmitted]);

  // Admin payment viewing
  const fetchPayments = async () => {
    setLoadingPayments(true);
    setPaymentsError(null);
    try {
      const res = await fetch("http://localhost:5000/api/payments");
      const data = await res.json();
      if (!res.ok || !data.ok)
        throw new Error(data.message || "Failed to fetch payments");
      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch (err) {
      console.error("Failed to load payments:", err);
      setPaymentsError(err.message || String(err));
    } finally {
      setLoadingPayments(false);
    }
  };

  // Admin icon button click logic
  const handleAdminIconClick = () => {
    setShowAdminPrompt(true);
    setAdminPromptEmail("");
    setAdminPromptError("");
  };

  // Handle admin prompt login form
  const handleAdminPromptSubmit = (e) => {
    e.preventDefault();
    if (adminPromptEmail.trim().toLowerCase() === adminEmail) {
      setShowPayments(true);
      setShowAdminPrompt(false);
      fetchPayments();
    } else {
      setAdminPromptError("Access denied. You are not an admin.");
    }
  };

  // Hide admin table on Logout
  const handleAdminLogout = () => {
    setShowPayments(false);
    setShowAdminPrompt(false);
    setAdminPromptEmail("");
    setAdminPromptError("");
  };

  const formatTime = (t) => {
    const min = Math.floor(t / 60);
    const sec = t % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const getSectionClass = (stepNum) =>
    `section single-section animated-section fade-in-section${
      step === stepNum ? " visible" : ""
    }`;

  return (
    <div className="app-bg">
      <div className="app-wrapper">
        {/* Header */}
        <header className="header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <h1>💳 Secure Payment Portal</h1>
              <p>Your trusted platform for fast and secure payments</p>
            </div>
            <div>
              <button
                className="admin-toggle-btn"
                onClick={handleAdminIconClick}
                style={{ display: "flex", alignItems: "center", gap: "7px" }}
              >
                <span role="img" aria-label="admin" style={{ fontSize: "1.2em" }}>
                  🛡️
                </span>
                {showPayments ? "Hide Payments" : "View Payments (Admin)"}
              </button>
            </div>
          </div>
        </header>

        {/* Admin login modal */}
        {showAdminPrompt && (
          <div className="admin-login-overlay">
            <div className="admin-login-modal">
              <h3>
                Admin Login <span style={{ fontSize: "1em" }}>🛡️</span>
              </h3>
              <form onSubmit={handleAdminPromptSubmit}>
                <input
                  type="email"
                  placeholder="Enter Admin Email"
                  value={adminPromptEmail}
                  onChange={(e) => setAdminPromptEmail(e.target.value)}
                  required
                />
                <button type="submit" className="submit-btn" style={{ marginTop: '10px' }}>
                  Login
                </button>
              </form>
              {adminPromptError && <p className="login-error">{adminPromptError}</p>}
            </div>
          </div>
        )}

        <main className="main-container">
          {/* Admin payments table (toggle) */}
          {showPayments && adminPromptEmail.trim().toLowerCase() === adminEmail && (
            <section className="section admin-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>📋 Payments (Admin View)</h2>
                <button onClick={handleAdminLogout} style={{
                  background: "#db0606", color: "#fff", borderRadius: "6px", border: "none", padding: "8px 14px", fontWeight: "bold", cursor: "pointer"
                }}>
                  Logout
                </button>
              </div>
              {loadingPayments ? (
                <p>Loading payments...</p>
              ) : paymentsError ? (
                <p style={{ color: "crimson" }}>Error: {paymentsError}</p>
              ) : (
                <TableDisplay payments={payments} />
              )}
            </section>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <section className={getSectionClass(1)}>
              <h2>🧍 User Information</h2>
              <form className="form-grid" onSubmit={handleUserSubmit}>
                <label>
                  Name:
                  <input
                    name="name"
                    type="text"
                    placeholder="Enter your name"
                    value={user.name}
                    onChange={handleUserChange}
                    required
                  />
                </label>
                <label>
                  Email:
                  <input
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={user.email}
                    onChange={handleUserChange}
                    required
                  />
                </label>
                <label>
                  Address:
                  <input
                    name="address"
                    type="address"
                    placeholder="Enter your address"
                    value={user.address}
                    onChange={handleUserChange}
                    required
                  />
                </label>
                <button className="pay-btn effect-ripple" type="submit">
                  Continue
                </button>
              </form>
            </section>
          )}

          {/* Step 2 - Subscription Plan */}
          {step === 2 && (
            <section className={getSectionClass(2)}>
              <h2>📦 Subscription Plan</h2>
              <form className="form-grid" onSubmit={handlePlanSubmit}>
                <label>
                  Choose your plan:
                  {/* Removed dropdown-wrapper class */}
                  <select
                    // Removed plan-dropdown class, using default select styling
                    value={plan}
                    onChange={handlePlanChange}
                    required
                  >
                    <option value="" disabled>
                      Select a plan (Required)
                    </option>
                    <option value="lifetime">
                      💎 Lifetime – $1000 (One time)
                    </option>
                    <option value="yearly">💎 Yearly – $100/year</option>
                  </select>
                </label>
                <div className="plan-amount-box">
                  {plan === "lifetime" && (
                    <span>
                      <b>Selected:</b> Lifetime Plan &mdash;{" "}
                      <span className="plan-price">$1000</span>
                    </span>
                  )}
                  {plan === "yearly" && (
                    <span>
                      <b>Selected:</b> Yearly Plan &mdash;{" "}
                      <span className="plan-price">$100</span> per year
                    </span>
                  )}
                  {!plan && <span>Please select a plan above.</span>}
                </div>
                <div className="step-btn-row">
                  <button
                    type="button"
                    className="back-btn effect-ripple"
                    onClick={handleStepBack}
                  >
                    ← Back
                  </button>
                  <button
                    className="pay-btn effect-ripple"
                    type="submit"
                    disabled={!plan}
                  >
                    Continue to Payment
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Step 3 - Make Payment (with stages!) */}
          {step === 3 && (
            <section className={getSectionClass(3)}>
              <h2>💰 Make Payment</h2>
              {
                !paymentSubmitted && (
                  <button
                    type="button"
                    className="back-btn effect-ripple"
                    onClick={handleStepBack}
                    style={{ marginBottom: 8 }}
                  >
                    ← Back
                  </button>
                )
              }

              {/* Stage: payment method selection */}
              {paymentStage === "choose" && !paymentSubmitted && (
                <>
                  <p>
                    Hello, <b>{user.name}</b>! Your Email: <b>{user.email}</b>
                  </p>
                  <p>Please complete your payment by selecting a method below:</p>
                  <div className="choose-pay-box">
                    <button
                      className="pay-btn effect-ripple"
                      onClick={() => handlePayOption("upi")}
                      type="button"
                    >
                      Pay with UPI
                    </button>
                    <button
                      className="pay-btn effect-ripple"
                      onClick={() => handlePayOption("paypal")}
                      type="button"
                    >
                      Pay with Scanner (PayPal)
                    </button>
                  </div>
                </>
              )}

              {/* Stage: payment details entry */}
              {paymentStage === "paypal" && !paymentSubmitted && (
                <div className="paypal-section animated-paypal">
                  <h3>Pay via PayPal (UPI Scanner)</h3>
                  <div className="qr-box glowing-border">
                    <img
                      src={paypalQR}
                      alt="PayPal QR Code"
                      className="qr-image"
                    />
                    <p className="timer-text">
                      ⏱ Payment valid for: <b>{formatTime(timer)}</b>
                    </p>
                  </div>
                  <form className="paypal-form" onSubmit={handleSubmit}>
                    <div className="upload-box">
                      <p>📎 Upload Payment Screenshot:</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        required
                      />
                      {screenshot && (
                        <p className="file-name">✅ {screenshot.name}</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="submit-btn effect-ripple"
                    >
                      Submit Payment
                    </button>
                  </form>
                </div>
              )}

              {paymentStage === "upi" && !paymentSubmitted && (
                <div className="upi-section animated-paypal">
                  <h3>Pay using UPI</h3>
                  <div className="qr-box">
                    <ul style={{ textAlign: "left", marginLeft: "0" }}>
                      <li>
                        Send the payment to <b>moharanamr15-2@oksbi</b> using
                        any UPI app (PhonePe, Google Pay, Paytm, etc.).
                      </li>
                      <li>
                        Enter your UPI ID and the <b>Transaction Reference Number</b>{" "}
                        below.
                      </li>
                    </ul>
                  </div>
                  <form className="upi-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                      <label>
                        Your UPI ID:
                        <input
                          type="text"
                          placeholder="yourname@upi"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          required
                        />
                      </label>
                      <label>
                        UPI Transaction Reference No:
                        <input
                          type="text"
                          placeholder="e.g. 9876543210"
                          value={upiRef}
                          onChange={(e) => setUpiRef(e.target.value)}
                          required
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="submit-btn effect-ripple"
                    >
                      Submit Payment
                    </button>
                  </form>
                </div>
              )}

              {/* Thank you/confirmation */}
              {paymentSubmitted && (
                <div className="thank-you-box">
                  <h3>🎉 Thank You for Your Payment!</h3>
                  <p>
                    Your payment was successfully recorded.
                    <br />
                    Welcome, <b>{user.name}</b>!
                  </p>
                  <p>
                    You will be notified of the update through your registered
                    email...
                    <br />
                    Thank You 🙏
                  </p>
                </div>
              )}
            </section>
          )}
        </main>

        {/* Footer */}
        <footer className="footer">
          <p>© 2025 My Payment Systems | All rights reserved</p>
        </footer>
      </div>
    </div>
  );
}

export default App;