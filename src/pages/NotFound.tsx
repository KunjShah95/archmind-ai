import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "hsl(222 62% 11%)",
        backgroundImage:
          "radial-gradient(hsl(220 30% 35% / 0.35) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: "3rem" }}>
        <Logo />
      </div>

      {/* Hero content */}
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        {/* Large 404 */}
        <p
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            fontSize: "clamp(7rem, 20vw, 11rem)",
            fontWeight: 700,
            lineHeight: 1,
            color: "hsl(16 76% 52%)",
            margin: "0 0 1rem 0",
            letterSpacing: "-0.02em",
          }}
        >
          404
        </p>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 600,
            color: "hsl(0 0% 98%)",
            margin: "0 0 0.75rem 0",
            letterSpacing: "-0.01em",
          }}
        >
          Page not found
        </h1>

        {/* Description */}
        <p
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: "1rem",
            color: "hsl(220 18% 65%)",
            lineHeight: 1.6,
            margin: "0 0 2.5rem 0",
          }}
        >
          The page you are looking for does not exist or may have been moved.
          Check the URL or navigate back to safety.
        </p>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Primary: coral */}
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "2.5rem",
              padding: "0 1.25rem",
              borderRadius: "6px",
              fontFamily: "Manrope, sans-serif",
              fontSize: "0.875rem",
              fontWeight: 600,
              backgroundColor: "hsl(16 76% 52%)",
              color: "#fff",
              textDecoration: "none",
              border: "1px solid hsl(16 76% 52%)",
              boxShadow: "0 1px 3px 0 hsl(16 76% 30% / 0.35)",
              transition: "background-color 0.15s ease",
            }}
          >
            Back to home
          </Link>

          {/* Secondary: navy outline */}
          <Link
            to="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "2.5rem",
              padding: "0 1.25rem",
              borderRadius: "6px",
              fontFamily: "Manrope, sans-serif",
              fontSize: "0.875rem",
              fontWeight: 600,
              backgroundColor: "transparent",
              color: "hsl(0 0% 95%)",
              textDecoration: "none",
              border: "1px solid hsl(220 18% 88% / 0.35)",
              boxShadow: "0 1px 2px 0 hsl(222 62% 5% / 0.3)",
              transition: "border-color 0.15s ease",
            }}
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
