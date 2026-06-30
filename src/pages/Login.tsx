import { Link } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";

export default function Login() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your workspace."
      cta="Sign in"
      mode="login"
      alt={<>Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link></>}
      footer="By signing in you agree to our Terms and Privacy Policy."
    />
  );
}
