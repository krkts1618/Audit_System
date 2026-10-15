import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../../services/authService";
import bgImage from "../../assets/background.png";

const Register = () => {
  const navigate = useNavigate();
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
      role: "", // Matched to backend expectations
    },
  });

  async function onSubmitForm(data) {
    try {
      await registerUser(data);
      navigate("/login");
      reset();
    } catch (e) {
      console.error("Registration failed:", e);
      // In Phase 4, we will add a toast notification here
    }
  }

  return (
    <div
      className=" register min-h-screen flex justify-center items-center relative overflow-hidden  bg-cover bg-center"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="ambient-orb-indigo top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute z-0"></div>

      <form
        className="glass-panel-dark p-8 w-full max-w-md z-10 flex flex-col space-y-5"
        onSubmit={handleSubmit(onSubmitForm)}
      >
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-slate-100">Audit System</h1>
          <p className="text-slate-400 text-sm mt-1">Create your account</p>
        </div>

        <div>
          <label
            className="block text-slate-300 font-medium mb-1 text-sm"
            htmlFor="name"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            {...register("name", {
              required: "Name is required",
              minLength: {
                value: 3,
                message: "At least 3 characters required",
              },
            })}
            placeholder="Enter Your Name"
            className="glass-input"
          />
          {errors.name && (
            <p className="text-crimson-500 text-xs mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="block text-slate-300 font-medium mb-1 text-sm"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email" // Changed to email for native browser validation
            {...register("email", { required: "Email is required" })}
            className="glass-input"
            placeholder="Enter Your Email"
          />
          {errors.email && (
            <p className="text-crimson-500 text-xs mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="block text-slate-300 font-medium mb-1 text-sm"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            type="password" // Changed to password to hide characters
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 8,
                message: "At least 8 characters required",
              },
            })}
            className="glass-input"
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="text-crimson-500 text-xs mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="block text-slate-300 font-medium mb-1 text-sm"
            htmlFor="role"
          >
            Role
          </label>
          <select
            id="role"
            className="glass-input "
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
            <p className="text-crimson-500 text-xs mt-1">
              {errors.role.message}
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary w-full mt-2">
          Register
        </button>

        <p className="text-center text-slate-400 text-sm mt-4">
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
