import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import bgImage from "../../assets/background.png";
import GlassInput from "../../components/common/GlassInput";
import GlassButton from "../../components/common/GlassButton";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState(""); 

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const decodeToken = (token) => {
    try {
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) return null;
      const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  async function onSubmitForm(data) {
    setIsSubmitting(true);
    setAuthError(""); 
    
    try {
      const response = await loginUser(data);
      const token = response.token;
      const decoded = decodeToken(token) || {};
      const user = response.user || {
        id: decoded.id,
        role: decoded.role,
        email: data.email,
      };
      
      login(user, token);
      
      const userRole = user?.role;
      if (userRole === "HOD") {
        navigate("/hod/dashboard");
      } else if (userRole === "Care Taker") {
        navigate("/caretaker/report");
      } else if (userRole === "Fixer") {
        navigate("/fixer/board");
      } else {
        navigate("/"); 
      }
      
    } catch (e) {
      console.error("Login failed:", e);
      setAuthError(e.response?.data?.message || e.message || "Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <div
      className="login min-h-screen flex justify-center items-center relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="ambient-orb-indigo top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute z-0"></div>

      <form
        className="glass-panel-dark p-8 w-full max-w-md z-10 flex flex-col"
        onSubmit={handleSubmit(onSubmitForm)}
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-100">Audit System</h1>
          <p className="text-slate-400 text-sm mt-1">Welcome back. Please log in.</p>
        </div>

        {authError && (
          <div className="mb-4 p-3 rounded-lg bg-crimson-500/20 border border-crimson-500/50 text-crimson-500 text-sm text-center">
            {authError}
          </div>
        )}

        <GlassInput
          id="email"
          type="email"
          label="Email"
          placeholder="Enter Your Email"
          error={errors.email}
          {...register("email", { required: "Email is required" })}
        />

        <GlassInput
          id="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          error={errors.password}
          {...register("password", { required: "Password is required" })}
        />

        <div className="mt-2 mb-6">
          <GlassButton type="submit" loading={isSubmitting}>
            Log In
          </GlassButton>
        </div>

        <p className="text-center text-slate-400 text-sm">
          Don't have an account?{" "}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Create one here
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;