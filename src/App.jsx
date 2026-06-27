import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import LeaveApplication from "./pages/LeaveApplication";
import Scanner from "./pages/Scanner"; // Import natin ang bagong scanner page
import { AuthProvider } from "./pages/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<EmployeeDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/leave-application" element={<LeaveApplication />} />
          
          {/* Dito ang path para sa scanner */}
          <Route path="/scan" element={<Scanner />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;