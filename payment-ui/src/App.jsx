import React, { useState, useEffect } from "react";
import "./App.css";
import paypalQR from "./paypal-qr.png";
import TableDisplay from "./TableDisplay";

function App() {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState({ name: "", email: "", address: "" });
  const [plan, setPlan] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
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

  // Admin Email and Login
  const adminEmail = "m.r.moharana789@gmail.com";
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPromptEmail, setAdminPromptEmail] = useState("");
  const [adminPromptError, setAdminPromptError] = useState("");

  // UPDATED states for verification dialog
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false); // dialog
  const [notifyLoading, setNotifyLoading] = useState(false);

  // NEW: state for admin screenshot selection
  const [adminScreenshot, setAdminScreenshot] = useState(null);
  const handleAdminFileChange = (e) => setAdminScreenshot(e.target.files[0]);

  // User info, plan, navigation handlers
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
    setPaymentStage("choose");
    setPaymentMethod("");
  };

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

  const handleFileChange = (e) => setScreenshot(e.target.files[0]);

  // Submit payment info (user)
  const handleSubmit = async (e) => {
    e.preventDefault();
    // >> START: ADDED VALIDATION LOGIC <<
    if (paymentMethod === "paypal" && !screenshot) {
      alert("Please upload a PayPal payment screenshot!");
      return;
    }
    if (paymentMethod === "upi" && (!upiId || !upiRef)) {
      alert("Please enter both your UPI ID and transaction reference number!");
      return;
    }
    // >> END: ADDED VALIDATION LOGIC <<
    try {
      const formData = new FormData();
      formData.append("name", user.name);
      formData.append("email", user.email);
      formData.append("address", user.address);
      formData.append("plan", plan);
      formData.append("paymentMethod", paymentMethod);

      if (paymentMethod === "paypal") { // Note: Removed '&& screenshot' here, as validation above covers it
        formData.append("screenshot", screenshot);
      }
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

  // Paypal timer countdown
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

  // Fetch payments for admin
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

  // Admin login flow handlers
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
    }`;

  // ADMIN ACTION HANDLERS

  // Open the new details dialog
  const openVerifyDialog = (payment) => {
    setSelectedPayment(payment);
    setShowDetailsDialog(true);
    setAdminScreenshot(null); // reset per payment
  };

  // Close the new details dialog
  const handleCloseDetailsDialog = () => {
    setShowDetailsDialog(false);
    setSelectedPayment(null);
    setAdminScreenshot(null);
  };

  // UPDATED: Confirm and notify handler with optional admin screenshot
  const handleConfirmNotify = async () => {
    if (!selectedPayment) return;
    setNotifyLoading(true);

    try {
      let res, data;

      // Handle the case where the admin uploads a screenshot or if payment is UPI
      const isFormData = selectedPayment.paymentMethod === "paypal" && adminScreenshot;

      if (isFormData) {
        const formData = new FormData();
        formData.append("email", selectedPayment.email);
        formData.append("name", selectedPayment.name);
        formData.append("plan", selectedPayment.plan);
        formData.append("paymentId", selectedPayment.id);
        formData.append("screenshot", adminScreenshot); // This will attach the new screenshot

        res = await fetch("http://localhost:5000/api/send-confirmation", {
          method: "POST",
          body: formData,
        });
        data = await res.json();
      } else {
        // For UPI or PayPal without a new screenshot being uploaded by admin
        res = await fetch("http://localhost:5000/api/send-confirmation", {
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
      alert("Network error sending email or verifying payment.");
    } finally {
      setNotifyLoading(false);
      setAdminScreenshot(null); // reset file state
    }
  };

  // RENDER FUNCTION START
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
          {/* Admin Actions Panel */}
          {showPayments &&
            adminPromptEmail.trim().toLowerCase() === adminEmail && (
              <section
                className="admin-actions-section"
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  padding: "22px 0",
                  background: "#f5fbff",
                }}
              >
                <div
                  style={{
                    flex: "1 1 350px",
                    maxWidth: "370px",
                    background: "#e8f3ff",
                    border: "2px solid #c6e1ff",
                    borderRadius: "17px",
                    boxShadow: "0 4px 17px #2077a325",
                    padding: "27px 18px 20px 18px",
                    minWidth: "260px",
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h2 style={{ marginBottom: "14px", borderBottom: "none" }}>
                      Admin Actions
                    </h2>
                    <button
                      onClick={handleAdminLogout}
                      style={{
                        background: "#db0606",
                        color: "#fff",
                        borderRadius: "6px",
                        border: "none",
                        padding: "8px 13px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        fontSize: "1em",
                      }}
                    >
                      Logout
                    </button>
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    {loadingPayments ? (
                      <p>Loading payments...</p>
                    ) : paymentsError ? (
                      <p style={{ color: "crimson" }}>Error: {paymentsError}</p>
                    ) : payments.length === 0 ? (
                      <p>No payments found.</p>
                    ) : (
                      payments.map((payment, index) => (
                        <div
                          key={index}
                          style={{
                            background: "#fff",
                            padding: "12px 13px",
                            margin: "12px 0",
                            borderRadius: "11px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.09)",
                          }}
                        >
                          <p
                            style={{
                              marginBottom: "7px",
                              fontWeight: "500",
                              color: "#003d76",
                            }}
                          >
                            <span style={{ color: "#0078d7" }}>
                              {payment.name}
                            </span>
                            <span style={{ color: "#444" }}>
                              {" "}
                              — {payment.email} —{" "}
                            </span>
                            <span style={{ color: "#135d1b" }}>
                              {payment.plan}
                            </span>
                            {payment.confirmed ? (
                              <span
                                style={{ color: "green", marginLeft: 5 }}
                              >
                                ✅
                              </span>
                            ) : (
                              <span
                                style={{ color: "gray", marginLeft: 5 }}
                              >
                                ⏳
                              </span>
                            )}
                          </p>
                          <button
                            onClick={() => openVerifyDialog(payment)}
                            style={{
                              marginTop: "6px",
                              padding: "7px 13px",
                              background: payment.confirmed
                                ? "#a0a0a0" // Grayed out if confirmed
                                : "#18bc61", // Green if pending
                              color: "#fff",
                              border: "none",
                              borderRadius: "7px",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "1em",
                            }}
                            disabled={payment.confirmed}
                          >
                            {payment.confirmed
                              ? "Confirmed"
                              : "Verify & Notify"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            )}

          {/* Payment Details Dialog / Modal */}
          {showDetailsDialog && selectedPayment && (
            <div
              className="modal-bg"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.17)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 50,
              }}
            >
              <div
                className="modal"
                style={{
                  background: "#fff",
                  padding: "25px 23px",
                  borderRadius: "16px",
                  boxShadow: "0 6px 33px #0002",
                  maxWidth: "400px",
                }}
              >
                <h3>Payment Verification & Details 🕵️</h3>
                <p>
                  <b>Name:</b> {selectedPayment.name}
                  <br />
                  <b>Email:</b> {selectedPayment.email}
                  <br />
                  <b>Plan:</b> {selectedPayment.plan}
                  <br />
                  <b>Address:</b> {selectedPayment.address}
                  <br />
                  <b>Method:</b> {selectedPayment.paymentMethod}
                  <br />
                  <br />
                  {/* >> START: UPDATED PAYMENT PROOF LOGIC << */}
                  {selectedPayment.paymentMethod === "upi" ? (
                    <>
                      <b>UPI ID:</b> {selectedPayment.upiId || <span style={{color:"crimson"}}>Missing</span>}
                      <br />
                      <b>UPI Ref:</b> {selectedPayment.upiRef || <span style={{color:"crimson"}}>Missing</span>}
                    </>
                  ) : selectedPayment.paymentMethod === "paypal" ? (
                    <>
                      <b>Screenshot:</b>{" "}
                      {selectedPayment.screenshotFilename ? (
                        <a
                          href={selectedPayment.screenshotUrl}
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
                        <span style={{color:"crimson"}}>PayPal proof missing</span>
                      )}
                    </>
                  ) : (
                    <span style={{color:"crimson"}}>No Payment Proof/Method Specified</span>
                  )}
                  {/* >> END: UPDATED PAYMENT PROOF LOGIC << */}
                  <br />
                  <br />
                  <b>Status:</b>{" "}
                  {selectedPayment.confirmed ? "Confirmed ✅" : "Pending ⏳"}
                </p>

                {/* Optional admin screenshot upload for PayPal pending payments */}
                {selectedPayment.paymentMethod === "paypal" &&
                  !selectedPayment.confirmed &&
                  !selectedPayment.screenshotFilename && (
                    <>
                      <label>
                        Attach Screenshot (if verifying manually):
                        <br />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAdminFileChange}
                          disabled={notifyLoading}
                          style={{marginTop: '5px'}}
                        />
                        {adminScreenshot && (
                          <p style={{marginTop: '5px'}}>✅ {adminScreenshot.name}</p>
                        )}
                      </label>
                    </>
                  )}
                  {/* Note: Added an extra condition `!selectedPayment.screenshotFilename` to hide the admin upload field if the user already uploaded one */}

                {/* Action Buttons */}
                <button
                  disabled={notifyLoading || selectedPayment.confirmed}
                  onClick={handleConfirmNotify}
                  style={{
                    background: selectedPayment.confirmed
                      ? "#a0a0a0"
                      : "#18bc61",
                    color: "#fff",
                    borderRadius: "7px",
                    border: "none",
                    padding: "10px 17px",
                    fontWeight: "bold",
                    marginRight: "11px",
                    marginTop: "15px",
                    cursor: selectedPayment.confirmed ? "default" : "pointer",
                    fontSize: "1.05em",
                  }}
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
                  style={{
                    background: "#eee",
                    borderRadius: "7px",
                    border: "none",
                    padding: "10px 17px",
                    color: "#555",
                    fontWeight: "bold",
                    marginTop: "15px",
                    cursor: "pointer",
                    fontSize: "1.05em",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Payment Table Panel */}
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
                    flex: "2 1 540px",
                    minWidth: "340px",
                    background: "#fff",
                    border: "2px solid #e1eaf7",
                    borderRadius: "18px",
                    boxShadow: "0 4px 18px #19376714",
                    padding: "20px 13px 18px 13px",
                    maxWidth: "780px",
                    overflowX: "auto",
                  }}
                >
                  <h2 style={{ marginBottom: "17px" }}>Payments Table</h2>
                  <TableDisplay payments={payments} />
                </div>
              </section>
            )}

          {/* USER PORTAL FLOW */}
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
                    <option value="lifetime">
                      💎 Lifetime – $1000 (One time)
                    </option>
                    <option value="yearly">💎 Yearly – $100/year</option>
                  </select>
                </label>

                <div className="plan-amount-box">
                  {plan === "lifetime" && (
                    <span>
                      <b>Selected:</b> Lifetime Plan —{" "}
                      <span className="plan-price">$1000</span>
                    </span>
                  )}
                  {plan === "yearly" && (
                    <span>
                      <b>Selected:</b> Yearly Plan —{" "}
                      <span className="plan-price">$100</span> per year
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
                  onClick={handleStepBack}
                  style={{ marginBottom: 8 }}
                >
                  ← Back
                </button>
              )}

              {/* Payment Method Selection */}
              {paymentStage === "choose" && !paymentSubmitted && (
                <>
                  <p>
                    Hello, <b>{user.name}</b>! Your Email: <b>{user.email}</b>
                  </p>
                  <p>Please choose your payment method:</p>

                  <div className="choose-pay-box">
                    <button
                      className="pay-btn effect-ripple"
                      onClick={() => handlePayOption("upi")}
                    >
                      Pay with UPI
                    </button>

                    <button
                      className="pay-btn effect-ripple"
                      onClick={() => handlePayOption("paypal")}
                    >
                      Pay with Scanner (PayPal)
                    </button>
                  </div>
                </>
              )}

              {/* PayPal Section */}
              {paymentStage === "paypal" && !paymentSubmitted && (
                <div className="paypal-section animated-paypal">
                  <h3>Pay via PayPal (UPI Scanner)</h3>

                  <div className="qr-box glowing-border">
                    <img src={paypalQR} alt="PayPal QR" className="qr-image" />
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

                    <button type="submit" className="submit-btn effect-ripple">
                      Submit Payment
                    </button>
                  </form>
                </div>
              )}

              {/* UPI Section */}
              {paymentStage === "upi" && !paymentSubmitted && (
                <div className="upi-section animated-paypal">
                  <h3>Pay using UPI</h3>

                  <div className="qr-box">
                    <ul>
                      <li>
                        Send payment to <b>moharanamr15-2@oksbi</b> using any
                        UPI app.
                      </li>
                      <li>
                        Submit your <b>UPI ID</b> and{" "}
                        <b>Transaction Reference Number</b>.
                      </li>
                    </ul>
                  </div>

                  <form className="upi-form" onSubmit={handleSubmit}>
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

                    <button
                      type="submit"
                      className="submit-btn effect-ripple"
                    >
                      Submit Payment
                    </button>
                  </form>
                </div>
              )}

              {/* Payment Success */}
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

        {/* Footer */}
        <footer className="footer">
          <p>© 2025 My Payment Systems | All rights reserved</p>
        </footer>
      </div>
    </div>
  );
}

export default App;