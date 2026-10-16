import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../../services/authService";
import bgImage from "../../assets/background.png";
import GlassInput from "../../components/common/GlassInput";
import GlassButton from "../../components/common/GlassButton";

const Register = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false); // Controls the button spinner

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "",
    },
  });

  async function onSubmitForm(data) {
    setIsSubmitting(true);
    try {
      await registerUser(data);
      navigate("/login");
      reset();
    } catch (e) {
      console.error("Registration failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="register min-h-screen flex justify-center items-center relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="ambient-orb-indigo top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute z-0"></div>

      <form
        className="glass-panel-dark p-8 w-full max-w-md z-10 flex flex-col"
        onSubmit={handleSubmit(onSubmitForm)}
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-100">Audit System</h1>
          <p className="text-slate-400 text-sm mt-1">Create your account</p>
        </div>

        <GlassInput
          id="name"
          type="text"
          label="Name"
          placeholder="Enter Your Name"
          error={errors.name}
          {...register("name", {
            required: "Name is required",
            minLength: {
              value: 3,
              message: "At least 3 characters required",
            },
          })}
        />

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
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "At least 8 characters required",
            },
          })}
        />

        <div className="flex flex-col mb-6">
          <label
            className="mb-1 text-sm font-medium text-slate-300"
            htmlFor="role"
          >
            Role
          </label>
          <select
            id="role"
            className={`glass-input ${errors.role ? "border-crimson-500 focus:ring-crimson-500" : ""}`}
            {...register("role", {
              required: "Choose your role",
            })}
          >
            <option value="" disabled>
              Select your role...
            </option>
            <option value="HOD">HOD (Infrastructure)</option>
            <option value="Care Taker">Care Taker (Faculty)</option>
            <option value="Fixer">Fixer (Maintenance)</option>
          </select>
          {errors.role && (
            <span className="text-xs text-crimson-500 mt-1">
              {errors.role.message}
            </span>
          )}
        </div>

        <GlassButton type="submit" loading={isSubmitting}>
          Register
        </GlassButton>

        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Log in here
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
