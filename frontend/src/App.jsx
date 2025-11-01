import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import ApplicationForm from "./pages/ApplicationForm";
import ApplicationDetails from "./pages/ApplicationDetails";
import ApplicationEdit from "./pages/ApplicationEdit";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PaymentPage from "./pages/PaymentPage"; // 👈 Import PaymentPage

// Admin imports 👇
import AdminDashboardLayout from "./layouts/AdminDashboardLayout";
import AdminDashboardPage from "./pages/admin/DashboardPage";
import AdminApplications from "./pages/admin/Applications";
import AdminApplicationsDetails from "./pages/admin/ApplicationDetails";
import AdminPayments from "./pages/admin/Payments";
import AdminReports from "./pages/admin/Reports";
import StaffManagement from "./pages/admin/StaffManagement";
import Payments from "./pages/admin/Payments";
import UserDetails from "./pages/admin/UserDetails"; 
import AdminProfile from "./pages/admin/AdminProfile"; 

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Business Owner Dashboard */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/apply" element={<ApplicationForm />} />
          <Route path="/application/:id" element={<ApplicationDetails />} />
          <Route path="/application/edit/:id" element={<ApplicationEdit />} />
          <Route path="/payment/:id" element={<PaymentPage />} /> {/* 👈 PaymentPage route */}
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminDashboardLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="applications/:id" element={<AdminApplicationsDetails />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="users/:id" element={<UserDetails />} /> 
          <Route path="payments" element={<Payments />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>
      </Routes>
    </Router>
  );
}
