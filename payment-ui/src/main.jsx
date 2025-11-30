import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // Assuming index.css exists
import App from './App.jsx'
import { PayPalScriptProvider } from '@paypal/react-paypal-js' // <-- ESSENTIAL IMPORT

// Your Sandbox Client ID
const PAYPAL_CLIENT_ID = "AUc3zoR4_eN8XyWs7V4u17HvX229agp0VfR5IGWo_r2zpY0LvgIw6Bk_lx2-3r0a_08VwqaGIIdA1YbV";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        currency: "USD",
      }}
    >
      <App />
    </PayPalScriptProvider>
  </StrictMode>,
)