import React, { useState, useEffect } from "react";
import "./App.css";
import paypalQR from "./Paypal.png";
import TableDisplay from "./TableDisplay"; 


function App() {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState({ name: "", email: "", address: "" });
  const [plan, setPlan] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(""); // "paypal" for now
  const [paymentStage, setPaymentStage] = useState("select"); // select | paypal-qr | paypal-button | paypal-processing <-- NEW state for button submission flow
  const [screenshot, setScreenshot] = useState(null);
  const [showPayments, setShowPayments] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsError, setPaymentsError] = useState(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [timer, setTimer] = useState(300);

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

  const API_BASE = "http://localhost:5000";

  const handleAdminFileChange = (e) => setAdminScreenshot(e.target.files[0]);

  // ---------- User handlers ----------
  const handleUserChange = (e) =>
    setUser({ ...user, [e.target.name]: e.target.value });

  const handleUserSubmit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePlanChange = (e) => setPlan(e.target.value);

  const handlePlanSubmit = (e) => {
    e.preventDefault();
    if (!plan) {
      alert("Please select a Subscription Plan!");
      return;
    }
    setStep(3);
    setPaymentSubmitted(false);
    setTimer(300);
    setPaymentMethod("");
    setPaymentStage("select");
  };

  // Global back for whole wizard
  const handleStepBack = () => {
    if (step === 3) {
      setStep(2);
      setPaymentStage("select");
      setPaymentMethod("");
      setScreenshot(null);
      setPaymentSubmitted(false);
    } else if (step === 2) {
      setStep(1);
    }
  };

  // Back only inside Step 3
  const handlePaymentBack = () => {
    if (paymentStage === "paypal-qr" || paymentStage === "paypal-button") {
      setPaymentStage("select");
      setScreenshot(null);
      setPaymentSubmitted(false);
    }
  };

  const handleFileChange = (e) => setScreenshot(e.target.files[0]);

  // ---------- Payment selection / Stage change ----------
  const handlePaymentOptionSelect = (type) => {
    // type: 'paypal-qr' | 'paypal-button'
    setPaymentMethod("paypal");
    // Change payment stage to show the relevant section
    setPaymentStage(type); 
    setPaymentSubmitted(false);
    setScreenshot(null);
    setTimer(300);
  };

  // FIX: New handler for the PayPal button click simulation
  const handlePayPalButtonClick = () => {
    // In a real application, this would redirect to PayPal.
    // Here, we simulate completion of external payment by immediately 
    // moving to the 'upload proof' part of the flow.
    setPaymentStage("paypal-processing");
  };

  // ---------- Submit proof ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!screenshot) {
      alert("Please upload a PayPal payment screenshot!");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", user.name);
      formData.append("email", user.email);
      formData.append("address", user.address);
      formData.append("plan", plan);
      formData.append("paymentMethod", "paypal");
      formData.append("screenshot", screenshot);

      const res = await fetch(`${API_BASE}/api/payments`, {
        method: "POST",
        body: formData,
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        // if backend crashes before sending JSON
      }

      if (!res.ok || !data.ok) {
        console.error("Payment error:", data);
        alert(data.message || "Error submitting payment. Check console.");
        return;
      }

      setPaymentSubmitted(true);
      console.log("Saved payment:", data.payment);
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Network error while submitting payment.");
    }
  };

  // ---------- Timer for QR ----------
  useEffect(() => {
    if (paymentStage === "paypal-qr" && timer > 0 && !paymentSubmitted) {
      const countdown = setInterval(
        () => setTimer((t) => (t > 0 ? t - 1 : 0)),
        1000
      );
      return () => clearInterval(countdown);
    }
  }, [paymentStage, timer, paymentSubmitted]);

  // ---------- Admin ----------
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
    }${stepNum === 1 ? " section-step-1" : ""}`; // Added section-step-1 class for advanced effect

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
      const isFormData =
        selectedPayment.paymentMethod === "paypal" && adminScreenshot;

      if (isFormData) {
        const formData = new FormData();
        formData.append("email", selectedPayment.email);
        formData.append("name", selectedPayment.name);
        formData.append("plan", selectedPayment.plan);
        formData.append("paymentId", selectedPayment.id);
        formData.append("screenshot", adminScreenshot);

        res = await fetch(`${API_BASE}/api/send-confirmation`, {
          method: "POST",
          body: formData,
        });
        data = await res.json();
      } else {
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
      }

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
    (selectedPayment.screenshotFilename ||
      screenshotVerifiedByAdmin ||
      adminScreenshot);

  // ---------- RENDER ----------
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

        {/* Admin Login Modal */}
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
          {/* Admin payments table */}
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

          {/* Verify details modal */}
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
                  {selectedPayment.paymentMethod === "paypal" && (
                    <>
                      <b>Screenshot:</b>{" "}
                      {selectedPayment.screenshotFilename ? (
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

                {selectedPayment.paymentMethod === "paypal" &&
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

          {/* USER FLOW */}
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
                      <span className="plan-price">$200</span> per year
                    </span>
                  )}
                  {plan === "monthly" && (
                    <span>
                      <b>Selected:</b> Monthly Plan —{" "}
                      <span className="plan-price">$30</span> per month
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

          {step === 3 && (
            <section className={getSectionClass(3)}>
              <h2>💰 Make Payment</h2>

              {!paymentSubmitted && (
                <button
                  type="button"
                  className="back-btn effect-ripple"
                  onClick={
                    // Check if we are in the initial 'select' stage
                    paymentStage === "select" || paymentStage === "paypal-processing"
                      ? handleStepBack // Go back to Plan selection (Step 2)
                      : handlePaymentBack // Go back to Payment Methods selection (paymentStage="select")
                  }
                  style={{ marginBottom: 8 }}
                >
                  {paymentStage === "select" || paymentStage === "paypal-processing"
                    ? "← Back to Plan"
                    : "← Back to Payment Methods"}
                </button>
              )}

              {paymentStage === "select" && !paymentSubmitted && (
                <div className="payment-choice-card">
                  <h3>Select Payment Method</h3>
                  <p>
                    Choose how you would like to pay for your{" "}
                    <b>{plan}</b> subscription.
                  </p>
                  <div className="payment-options-row">
                    <button
                      type="button"
                      className="method-btn"
                      onClick={() => handlePaymentOptionSelect("paypal-qr")}
                    >
                      🔳 Pay with QR (PayPal)
                    </button>
                    <button
                      type="button"
                      className="method-btn paypal-btn-style"
                      onClick={() =>
                        handlePaymentOptionSelect("paypal-button")
                      }
                    >
                      Pay with PayPal
                    </button>
                  </div>
                </div>
              )}

              {paymentStage === "paypal-qr" && !paymentSubmitted && (
                <div className="paypal-section animated-paypal">
                  <h3>Pay with PayPal (QR)</h3>
                  <p>
                    Hello, <b>{user.name}</b>! To pay for your{" "}
                    <b>{plan}</b> subscription, please complete the steps below:
                  </p>

                  <div className="qr-box glowing-border">
                    <p
                      style={{
                        marginBottom: 10,
                        fontWeight: "bold",
                      }}
                    >
                      1. Scan the QR code using your PayPal app:
                    </p>
                    <img
                      src={paypalQR}
                      alt="PayPal QR"
                      className="qr-image"
                    />
                    <p className="timer-text">
                      ⏱ Payment window: <b>{formatTime(timer)}</b>
                    </p>
                  </div>

                  <p style={{ marginTop: 10, marginBottom: 5 }}>
                    2. After payment, upload the confirmation screenshot.
                  </p>

                  <form className="paypal-form" onSubmit={handleSubmit}>
                    <div className="upload-box">
                      <p>📎 Required: Upload Payment Screenshot:</p>
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
                      Submit Payment Proof
                    </button>
                  </form>
                </div>
              )}

              {/* RENDER for PAYPAL BUTTON CLICK - Initial screen */}
              {paymentStage === "paypal-button" && !paymentSubmitted && (
                <div className="paypal-section animated-paypal">
                  <h3>Pay with PayPal</h3>
                  <p>
                    Hello, <b>{user.name}</b>! Click the PayPal button below to
                    complete the payment for your <b>{plan}</b> subscription.
                  </p>

                  <div className="paypal-button-box">
                    <button
                      type="button"
                      className="paypal-real-button"
                      // FIX: ADD onClick handler here to simulate payment and advance the stage
                      onClick={handlePayPalButtonClick} 
                    >
                      <span className="paypal-logo-text">Pay</span>{" "}
                      <span className="paypal-logo-brand">Pal</span>
                    </button>
                  </div>

                  <p style={{ marginTop: 12, marginBottom: 5, color: 'crimson' }}>
                    **Note:** In a real app, this redirects. Click the button to advance.
                  </p>
                  
                  {/* The form section below is hidden until handlePayPalButtonClick is clicked */}
                </div>
              )}
              
              {/* RENDER for PAYPAL BUTTON CLICK - Proof Upload screen (FIX) */}
              {paymentStage === "paypal-processing" && !paymentSubmitted && (
                <div className="paypal-section animated-paypal">
                  <h3>Upload Payment Proof</h3>
                  <p style={{ color: 'green', fontWeight: 'bold' }}>
                    ✅ Simulated PayPal payment complete.
                  </p>
                  <p style={{ marginTop: 12, marginBottom: 5 }}>
                    Now, upload the confirmation screenshot from PayPal below.
                  </p>

                  <form className="paypal-form" onSubmit={handleSubmit}>
                    <div className="upload-box">
                      <p>📎 Required: Upload Payment Screenshot:</p>
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
                      Submit Payment Proof
                    </button>
                  </form>
                </div>
              )}

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

        <footer className="footer">
          <p>© 2025 My Payment Systems | All rights reserved</p>
        </footer>
      </div>
    </div>
  );
}


export default App;