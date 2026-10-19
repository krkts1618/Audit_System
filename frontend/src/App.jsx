import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import Layout from "./pages/auth/Layout";
import Ingestion from "./pages/hod/Ingestion";
import HodDashboard from "./pages/hod/HodDashboard";
const CareTakerReport = () => (
  <h1 className="text-white text-center mt-10 text-2xl">
    Care Taker Form (Pending)
  </h1>
);
const FixerBoard = () => (
  <h1 className="text-white text-center mt-10 text-2xl">
    Fixer Board (Pending)
  </h1>
);

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />}></Route>
        <Route element={<Layout />}>
          <Route
            path="/hod/dashboard"

            element={
              <ProtectedRoute allowedRoles={["HOD"]}>
                <HodDashboard />
              </ProtectedRoute>
            }
          />


          <Route
            path="/hod/ingestion"
            element={
              <ProtectedRoute allowedRoles={["HOD"]}>
                <Ingestion />
              </ProtectedRoute>
            }
          />


          <Route
            path="/caretaker/report"
            element={
              <ProtectedRoute allowedRoles={["Care Taker"]}>
                <CareTakerReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/fixer/board"
            element={
              <ProtectedRoute allowedRoles={["Fixer"]}>
                <FixerBoard />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
};

export default App;
