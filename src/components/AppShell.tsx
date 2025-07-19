import React from "react";
import { FullPageSkeleton } from "./LoadingSkeletons";

interface AppShellProps {
  children: React.ReactNode;
  isLoading: boolean;
  error?: string | null;
}

const AppShell: React.FC<AppShellProps> = ({ children, isLoading, error }) => {
  if (error) {
    return (
      <div
        className="side-panel"
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "#fff5f5",
            border: "1px solid #fed7d7",
            borderRadius: 8,
            padding: 20,
            color: "#c53030",
            maxWidth: 500,
          }}
        >
          <h2 style={{ margin: "0 0 10px 0", color: "#c53030" }}>
            Network Investigator
          </h2>
          <p style={{ margin: "0 0 10px 0" }}>{error}</p>
          <p style={{ margin: 0, fontSize: 14, color: "#718096" }}>
            Please open this panel from Chrome/Edge DevTools (F12) to capture
            network calls.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <FullPageSkeleton />;
  }

  return <>{children}</>;
};

export default AppShell;
