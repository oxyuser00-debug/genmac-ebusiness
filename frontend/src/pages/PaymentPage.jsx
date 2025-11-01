import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { ArrowLeft, CreditCard } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Load Stripe with test key
const stripePromise = loadStripe("pk_test_51SOWWcPFvjeRz9zNkDTjDKVvjIDtIbQCovOYIbbjKqcPUwVP4sbQwTc3IXJc0zYRIgrIZ5MMNaALw9ElaF12CpdJ00Ilxbbp0u");

const CheckoutForm = ({ app }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    try {
      const token = localStorage.getItem("token");

      // Create PaymentIntent
      const { data } = await axios.post(
        "http://localhost:5000/api/payments/create-payment-intent",
        { applicationId: app.id, amount: app.payment_amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Confirm card payment
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: elements.getElement(CardNumberElement) }, // only card number, no postal
      });

      if (result.error) {
        Swal.fire("Error", result.error.message || "Payment failed", "error");
      } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
        // Record payment in backend
        await axios.post(
          "http://localhost:5000/api/payments",
          {
            applicationId: app.id,
            amount: app.payment_amount,
            transactionId: result.paymentIntent.id,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        Swal.fire("Success", "Payment completed successfully!", "success");
        navigate("/applications");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.response?.data?.error || "Payment failed", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border p-3 rounded">
        <label className="text-sm font-medium">Card Number</label>
        <CardNumberElement options={{ style: { base: { fontSize: "16px" } } }} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="border p-3 rounded">
          <label className="text-sm font-medium">Expiry</label>
          <CardExpiryElement options={{ style: { base: { fontSize: "16px" } } }} />
        </div>
        <div className="border p-3 rounded">
          <label className="text-sm font-medium">CVC</label>
          <CardCvcElement options={{ style: { base: { fontSize: "16px" } } }} />
        </div>
      </div>
      <button
        type="submit"
        disabled={!stripe}
        className="w-full bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition"
      >
        Pay ₱{app.payment_amount.toFixed(2)}
      </button>
    </form>
  );
};

export default function PaymentPage() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:5000/api/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApp({ ...res.data, payment_amount: res.data.fee || 0 });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load application details.", "error");
    }
  };

  const handleGCashPayment = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:5000/api/payments`,
        {
          applicationId: app.id,
          amount: app.payment_amount,
          transactionId: `GCASH-${Date.now()}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Swal.fire("Success", "Marked as paid via GCash!", "success");
      navigate("/applications");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.response?.data?.error || "Failed to mark payment", "error");
    }
  };

  if (!app)
    return (
      <div className="p-6 text-center text-gray-600">
        <p>Loading payment details...</p>
      </div>
    );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition"
      >
        <ArrowLeft /> Back
      </button>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Payment for {app.business_name}
        </h1>
        <p className="mb-4">Amount Due: ₱{app.payment_amount.toFixed(2)}</p>

        <Elements stripe={stripePromise}>
          <CheckoutForm app={app} />
        </Elements>

        <div className="mt-6 p-4 border rounded bg-yellow-50">
          <p className="text-gray-700 mb-2">
            Pay via GCash: Send ₱{app.payment_amount.toFixed(2)} to <strong>0917-XXXX-XXX</strong> and click below.
          </p>
          <button
            onClick={handleGCashPayment}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
          >
            I’ve Paid via GCash
          </button>
        </div>
      </div>
    </div>
  );
}
