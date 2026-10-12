import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/common/ProtectedRoute";

const Login = () => (
  <h1 className="text-white text-center mt-10 text-2xl">
    Login Page (Pending)
  </h1>
);
const HodDashboard = () => (
  <h1 className="text-white text-center mt-10 text-2xl">
    HOD Dashboard (Pending)
  </h1>
);
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

        <Route
          path="/hod/dashboard"
          element={
            <ProtectedRoute allowedRoles={["HOD"]}>
              <HodDashboard />
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

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
};

export default App;
