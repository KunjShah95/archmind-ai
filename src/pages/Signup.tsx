import { Link } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";

export default function Signup() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start with 10 free analyses. No card required."
      cta="Create account"
      alt={<>Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></>}
      footer="By creating an account you agree to our Terms and Privacy Policy."
    />
  );
}
