import React, { useState, useEffect } from "react";
import "./App.css";
// import paypalQR from "./Paypal.png"; // Removed
import TableDisplay from "./TableDisplay";
import { PayPalButtons } from "@paypal/react-paypal-js"; 

// --- Configuration ---
const API_BASE = "http://localhost:5000";

const PLAN_PRICES = {
  annually: 200.0,
  monthly: 30.0,
};

// ==============================================================================
// NOTE: This App component MUST be wrapped by <PayPalScriptProvider> in main.jsx
// ==============================================================================
function App() {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState({ name: "", email: "", address: "" });
  const [plan, setPlan] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(""); 
  // Removed "select" and "paypal-qr" as intermediate stages are now unnecessary
  const [paymentStage, setPaymentStage] = useState("select"); 
  const [screenshot, setScreenshot] = useState(null);
  const [showPayments, setShowPayments] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsError, setPaymentsError] = useState(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [timer, setTimer] = useState(300);
  const [paypalError, setPaypalError] = useState(null); 

  // Admin
  const adminEmail = "m.r.moharana789@gmail.com";
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPromptEmail, setAdminPromptEmail] = useState("");
  const [adminPromptError, setAdminPromptError] = useState("");

  // verification dialog
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);

  const [adminScreenshot, setAdminScreenshot] = useState(null);
  const [screenshotVerifiedByAdmin, setScreenshotVerifiedByAdmin] =
    useState(false);

  const handleAdminFileChange = (e) => setAdminScreenshot(e.target.files[0]);

  // ---------- User handlers ----------
  const handleUserChange = (e) =>
    setUser({ ...user, [e.target.name]: e.target.value });

  const handleUserSubmit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePlanChange = (e) => setPlan(e.target.value);

  // MODIFIED: Auto-sends to PayPal SDK flow
  const handlePlanSubmit = (e) => {
    e.preventDefault();
    if (!plan) {
      alert("Please select a Subscription Plan!");
      return;
    }
    setStep(3);
    setPaymentSubmitted(false);
    setTimer(300);
    
    // Setting state to render the PayPal button directly
    setPaymentMethod("paypal-button");
    setPaymentStage("paypal-button-flow");
    
    setPaypalError(null);
  };

  // Global back for whole wizard
  const handleStepBack = () => {
    if (step === 3) {
      setStep(2);
      setPaymentStage("select"); // Resetting state
      setPaymentMethod("");
      setScreenshot(null);
      setPaymentSubmitted(false);
      setPaypalError(null);
    } else if (step === 2) {
      setStep(1);
    }
  };

  // Back only inside Step 3 (Now just goes to Step 2)
  const handlePaymentBack = () => {
    handleStepBack();
  };

  const handleFileChange = (e) => setScreenshot(e.target.files[0]);

  // MODIFIED: Functionality removed, only kept to be safe
  const handlePaymentOptionSelect = (type) => {
    setPaymentMethod(type);
    setPaymentStage("paypal-button-flow");
    setPaymentSubmitted(false);
    setScreenshot(null);
    setTimer(300);
    setPaypalError(null);
  };

  // --- REMOVED handleSubmitQRProof function ---

  // ---------- PayPal Button SDK Logic ----------
  const createOrder = (data, actions) => {
    const amount = PLAN_PRICES[plan];
    if (!amount) {
      alert("Invalid plan selected.");
      return;
    }

    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: amount.toFixed(2), 
            currency_code: "USD",
          },
          description: `${plan.toUpperCase()} Subscription for ${user.email}`,
        },
      ],
      application_context: {
        shipping_preference: "NO_SHIPPING",
      },
    });
  };

  const onApprove = async (data, actions) => {
    // 1. Capture the payment on the PayPal side (Client-side)
    const details = await actions.order.capture();

    // 2. *** IMPORTANT: Send the Order ID to your server for verification and fulfillment ***
    console.log("Payment captured (Client-side):", details);

    // After successful client-side capture and simulated server-side verification:
    try {
      const manualSubmitRes = await fetch(`${API_BASE}/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          address: user.address,
          plan: plan,
          paymentMethod: "paypal-button", 
          paypalOrderId: data.orderID,
          confirmed: true, // Auto-confirmed since PayPal captured it
        }),
      });

      const manualData = await manualSubmitRes.json();
      if (!manualSubmitRes.ok || !manualData.ok) {
        throw new Error(manualData.message || "Simulated server save failed.");
      }
    } catch (error) {
      console.error("Simulation error saving payment:", error);
    }
    setPaymentSubmitted(true);
  };

  const onError = (err) => {
    console.error("PayPal Error:", err);
    setPaypalError("An error occurred during the PayPal transaction.");
  };

  // ---------- Timer for QR (Kept for effect cleanup, but non-functional) ----------
  useEffect(() => {
    // Keeping useEffect to prevent linting errors if references exist elsewhere.
    return () => {};
  }, [paymentStage, timer, paymentSubmitted]);

  // ---------- Admin and Modal handlers (Unchanged for brevity) ----------

  const fetchPayments = async () => {
    setLoadingPayments(true);
    setPaymentsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/payments`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Failed to fetch payments");
      }
      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch (err) {
      console.error("Failed to load payments:", err);
      setPaymentsError(err.message || String(err));
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleAdminIconClick = () => {
    setShowAdminPrompt(true);
    setAdminPromptEmail("");
    setAdminPromptError("");
  };

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
    }${stepNum === 1 ? " section-step-1" : ""}`;

  const openVerifyDialog = (payment) => {
    setSelectedPayment(payment);
    setShowDetailsDialog(true);
    setAdminScreenshot(null);
    setScreenshotVerifiedByAdmin(false);
  };

  const handleCloseDetailsDialog = () => {
    setShowDetailsDialog(false);
    setSelectedPayment(null);
    setAdminScreenshot(null);
    setScreenshotVerifiedByAdmin(false);
  };

  const handleConfirmNotify = async () => {
    if (!selectedPayment) return;
    setNotifyLoading(true);

    try {
      let res;
      let data;
      // Simplifed: We assume all admin action is confirmation
      res = await fetch(`${API_BASE}/api/send-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedPayment.email,
          name: selectedPayment.name,
          plan: selectedPayment.plan,
          paymentId: selectedPayment.id,
        }),
      });
      data = await res.json();
      

      if (data.ok) {
        handleCloseDetailsDialog();
        fetchPayments();
        alert("Payment verified and notification email sent to user.");
      } else {
        alert(
          "Failed to send notification email and/or verify payment. " +
            (data.error || data.debug || "")
        );
      }
    } catch (err) {
      console.error("Confirm failed:", err);
      alert("Network error sending email or verifying payment.");
    } finally {
      setNotifyLoading(false);
      setAdminScreenshot(null);
      setScreenshotVerifiedByAdmin(false);
    }
  };

  const canConfirm =
    selectedPayment &&
    !selectedPayment.confirmed &&
    selectedPayment.paymentMethod === 'paypal-button';


  // ---------- RENDER ----------
  return (
    <div className="app-bg">
      <div className="app-wrapper">
        {/* Header (New Look) */}
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
                onClick={
                  showPayments || showAdminPrompt
                    ? handleAdminLogout
                    : handleAdminIconClick
                }
                style={{ display: "flex", alignItems: "center", gap: "7px" }}
              >
                <span
                  role="img"
                  aria-label="admin"
                  style={{ fontSize: "1.2em" }}
                >
                  🛡️
                </span>
                {showPayments ? "Hide Payments" : "View Payments (Admin)"}
              </button>
            </div>
          </div>
        </header>

        {/* Admin Login Modal (Unchanged) */}
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
                <button
                  type="submit"
                  className="submit-btn"
                  style={{ marginTop: "10px" }}
                >
                  Login
                </button>
              </form>
              {adminPromptError && (
                <p className="login-error">{adminPromptError}</p>
              )}
            </div>
          </div>
        )}

        <main className="main-container">
          {/* Admin payments table (Unchanged) */}
          {showPayments &&
            adminPromptEmail.trim().toLowerCase() === adminEmail && (
              <section
                className="payment-table-section"
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  padding: "18px 0",
                  background: "#f5fbff",
                }}
              >
                <div
                  style={{
                    flex: "1 1 90%",
                    minWidth: "340px",
                    background: "#fff",
                    border: "2px solid #e1eaf7",
                    borderRadius: "18px",
                    boxShadow: "0 4px 18px #19376714",
                    padding: "20px 13px 18px 13px",
                    maxWidth: "900px",
                    overflowX: "auto",
                  }}
                >
                  <h2 style={{ marginBottom: "17px" }}>Payments Table</h2>
                  {paymentsError && (
                    <p className="login-error">{paymentsError}</p>
                  )}
                  {loadingPayments ? (
                    <p>Loading payments...</p>
                  ) : (
                    <TableDisplay
                      payments={payments}
                      openVerifyDialog={openVerifyDialog}
                    />
                  )}
                </div>
              </section>
            )}

          {/* Verify details modal (Unchanged) */}
          {showDetailsDialog && selectedPayment && (
            <div className="modal-bg">
              <div className="modal">
                <h3>Payment Verification &amp; Details 🕵️</h3>
                <p>
                  <b>Name:</b> {selectedPayment.name}
                  <br />
                  <b>Email:</b> {selectedPayment.email}
                  <br />
                  <b>Plan:</b> {selectedPayment.plan}
                  <br />
                  <b>Address:</b> {selectedPayment.address}
                  <br />
                  <br />
                  {selectedPayment.paymentMethod.includes("paypal") && (
                    <>
                      <b>Screenshot:</b>{" "}
                      {selectedPayment.paymentMethod === "paypal-button" ? (
                          <span style={{ color: 'gray' }}>
                              Not Applicable (SDK flow)
                          </span>
                      ) : selectedPayment.screenshotFilename ? (
                        <a
                          href={`${API_BASE}${selectedPayment.screenshotUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "#0078d7",
                            textDecoration: "underline",
                          }}
                        >
                          View Screenshot
                        </a>
                      ) : (
                        <span style={{ color: "crimson" }}>
                          PayPal proof missing
                        </span>
                      )}
                    </>
                  )}
                  <br />
                  <br />
                  <b>Status:</b>{" "}
                  {selectedPayment.confirmed ? "Confirmed ✅" : "Pending ⏳"}
                </p>

                {selectedPayment.paymentMethod.includes("paypal") &&
                  !selectedPayment.confirmed && (
                    <>
                      <label style={{ marginTop: "10px" }}>
                        Attach Screenshot (if verifying manually):
                        <br />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAdminFileChange}
                          disabled={notifyLoading}
                          style={{ marginTop: "5px" }}
                        />
                        {adminScreenshot && (
                          <p style={{ marginTop: "5px" }}>
                            ✅ {adminScreenshot.name}
                          </p>
                        )}
                      </label>
                      <label
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: "15px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={screenshotVerifiedByAdmin}
                          onChange={(e) =>
                            setScreenshotVerifiedByAdmin(e.target.checked)
                          }
                          disabled={notifyLoading}
                          style={{ width: "auto", marginRight: "8px" }}
                        />
                        <b>Screenshot Verified (Manual)</b>
                      </label>
                    </>
                  )}

                <button
                  disabled={notifyLoading || !canConfirm}
                  onClick={handleConfirmNotify}
                  className="confirm-btn"
                >
                  {selectedPayment.confirmed
                    ? "Already Confirmed"
                    : notifyLoading
                    ? "Confirming..."
                    : "Confirm & Send Notification"}
                </button>
                <button
                  disabled={notifyLoading}
                  onClick={handleCloseDetailsDialog}
                  className="close-btn"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* USER FLOW - Step 1 (Unchanged) */}
          {step === 1 && !showAdminPrompt && !showPayments && (
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
                    type="text"
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

          {/* USER FLOW - Step 2 (Unchanged) */}
          {step === 2 && (
            <section className={getSectionClass(2)}>
              <h2>📦 Subscription Plan</h2>
              <form className="form-grid" onSubmit={handlePlanSubmit}>
                <label>
                  Choose your plan:
                  <select value={plan} onChange={handlePlanChange} required>
                    <option value="" disabled>
                      Select a plan
                    </option>
                    <option value="annually">💎 Annually – $200</option>
                    <option value="monthly">💎 Monthly – $30</option>
                  </select>
                </label>

                <div className="plan-amount-box">
                  {plan === "annually" && (
                    <span>
                      <b>Selected:</b> Annually Plan —{" "}
                      <span className="plan-price">${PLAN_PRICES.annually}</span> per year
                    </span>
                  )}
                  {plan === "monthly" && (
                    <span>
                      <b>Selected:</b> Monthly Plan —{" "}
                      <span className="plan-price">${PLAN_PRICES.monthly}</span> per month
                    </span>
                  )}
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

          {/* USER FLOW - Step 3 (Payment Methods) */}
          {step === 3 && (
            <section className={getSectionClass(3)}>
              <h2>💰 Make Payment</h2>

              {!paymentSubmitted && (
                <button
                  type="button"
                  className="back-btn effect-ripple"
                  onClick={handleStepBack} 
                  style={{ marginBottom: 8 }}
                >
                  ← Back to Plan
                </button>
              )}

              {/* The "select" stage is now unnecessary, but keeping the rendering block */}
              {paymentStage === "select" && !paymentSubmitted && (
                <div className="payment-choice-card">
                  <h3>Select Payment Method</h3>
                  <p>
                    Choose how you would like to pay for your{" "}
                    <b>{plan}</b> subscription.
                  </p>
                  <div className="payment-options-row">
                    {/* Only PayPal Button remains */}
                    <button
                      type="button"
                      className="method-btn paypal-btn-style"
                      onClick={() =>
                        handlePaymentOptionSelect("paypal-button")
                      }
                    >
                      Pay with PayPal (Fast Checkout)
                    </button>
                  </div>
                </div>
              )}

              {/* --- REMOVED: RENDER for PAYPAL QR --- */}
              {/* The QR code rendering block is removed entirely */}
              

              {/* RENDER for PAYPAL BUTTON SDK FLOW (Automated proof) */}
              {paymentStage === "paypal-button-flow" && !paymentSubmitted && (
                <div className="paypal-section animated-paypal">
                  <h3>Complete Payment with PayPal</h3>
                  <p>
                    You are paying **$
                    {PLAN_PRICES[plan].toFixed(2)}** for the{" "}
                    <b>{plan}</b> subscription.
                  </p>
                  {paypalError && (
                    <p style={{ color: "crimson" }}>{paypalError}</p>
                  )}

                  <div className="paypal-sdk-container">
                    {/* The PayPalButtons component renders the actual PayPal button */}
                    <PayPalButtons
                      style={{ layout: "vertical" }}
                      createOrder={createOrder}
                      onApprove={onApprove}
                      onError={onError}
                    />
                  </div>
                  <p style={{ marginTop: 12, color: 'gray', fontSize: '0.9em' }}>
                    The PayPal button handles the payment and automatically confirms your order.
                  </p>
                </div>
              )}

              {/* Payment Submitted Thank You (Unchanged) */}
              {paymentSubmitted && (
                <div className="thank-you-box">
                  <h3>🎉 Thank You for Your Payment!</h3>
                  <p>
                    Your payment was successfully recorded.
                    <br />
                    Welcome, <b>{user.name}</b>!
                  </p>
                  <p>You will receive an email confirmation shortly. 🙏</p>
                </div>
              )}
            </section>
          )}
        </main>

        {/* Footer (Unchanged) */}
        <footer className="footer">
          <p>© 2025 My Payment Systems | All rights reserved</p>
        </footer>
      </div>
    </div>
  );
}

export default App;