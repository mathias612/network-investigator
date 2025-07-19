import React from "react";

// CSS for skeleton animations
const skeletonStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }
  
  .skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200px 100%;
    animation: shimmer 1.5s infinite linear;
    border-radius: 4px;
  }
  
  .skeleton-pulse {
    animation: pulse 1.5s ease-in-out infinite alternate;
  }
  
  @keyframes pulse {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0.4;
    }
  }
`;

// Inject skeleton styles
if (
  typeof document !== "undefined" &&
  !document.getElementById("skeleton-styles")
) {
  const style = document.createElement("style");
  style.id = "skeleton-styles";
  style.textContent = skeletonStyles;
  document.head.appendChild(style);
}

export const HeaderSkeleton: React.FC = () => (
  <div
    style={{
      height: 70,
      padding: "15px 20px",
      borderBottom: "1px solid #dee2e6",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#f8f9fa",
    }}
  >
    <div className="skeleton" style={{ width: 200, height: 24 }} />
    <div style={{ display: "flex", gap: 10 }}>
      <div className="skeleton" style={{ width: 40, height: 30 }} />
      <div className="skeleton" style={{ width: 120, height: 30 }} />
      <div className="skeleton" style={{ width: 100, height: 30 }} />
      <div className="skeleton" style={{ width: 80, height: 30 }} />
    </div>
  </div>
);

export const SidebarSkeleton: React.FC = () => (
  <div
    style={{
      width: "33%",
      background: "#f8f9fa",
      borderRight: "1px solid #dee2e6",
      padding: 15,
    }}
  >
    <div
      className="skeleton"
      style={{ width: 120, height: 18, marginBottom: 20 }}
    />

    {/* Search input skeleton */}
    <div
      className="skeleton"
      style={{ width: "100%", height: 35, marginBottom: 15 }}
    />

    {/* Checkboxes skeleton */}
    <div style={{ marginBottom: 20 }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{ display: "flex", alignItems: "center", marginBottom: 8 }}
        >
          <div
            className="skeleton"
            style={{ width: 16, height: 16, marginRight: 8 }}
          />
          <div className="skeleton" style={{ width: 60, height: 14 }} />
        </div>
      ))}
    </div>

    {/* Filters section */}
    <div
      className="skeleton"
      style={{ width: 80, height: 18, marginBottom: 15 }}
    />
    <div
      className="skeleton"
      style={{ width: 80, height: 25, marginBottom: 15 }}
    />

    {/* Filter items */}
    {[1, 2].map((i) => (
      <div
        key={i}
        className="skeleton"
        style={{ width: "90%", height: 16, marginBottom: 10 }}
      />
    ))}
  </div>
);

export const NetworkCallsSkeleton: React.FC = () => (
  <div style={{ flex: 1, padding: 20 }}>
    <div
      className="skeleton"
      style={{ width: 180, height: 20, marginBottom: 20 }}
    />

    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        style={{
          border: "1px solid #dee2e6",
          borderRadius: 4,
          padding: 15,
          marginBottom: 10,
          background: "white",
        }}
      >
        {/* Call header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div className="skeleton" style={{ width: 45, height: 20 }} />
          <div className="skeleton" style={{ width: 35, height: 20 }} />
          <div className="skeleton" style={{ width: 60, height: 16 }} />
          <div className="skeleton" style={{ width: 80, height: 16 }} />
          <div
            className="skeleton"
            style={{ width: 80, height: 20, marginLeft: "auto" }}
          />
        </div>

        {/* URL */}
        <div
          className="skeleton"
          style={{ width: `${Math.random() * 40 + 60}%`, height: 16 }}
        />
      </div>
    ))}
  </div>
);

export const FullPageSkeleton: React.FC = () => (
  <div
    className="side-panel"
    style={{ height: "100vh", display: "flex", flexDirection: "column" }}
  >
    <HeaderSkeleton />
    <div style={{ display: "flex", flex: 1 }}>
      <SidebarSkeleton />
      <NetworkCallsSkeleton />
    </div>
  </div>
);

export const LoadingProgress: React.FC<{
  progress: number;
  message: string;
}> = ({ progress, message }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      background: "rgba(248, 249, 250, 0.95)",
      padding: 20,
      textAlign: "center",
      borderBottom: "1px solid #dee2e6",
      zIndex: 1000,
    }}
  >
    <div style={{ marginBottom: 10, fontSize: 14, color: "#495057" }}>
      {message}
    </div>
    <div
      style={{
        width: "100%",
        height: 4,
        background: "#e9ecef",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          background: "linear-gradient(90deg, #007bff, #0056b3)",
          borderRadius: 2,
          transition: "width 0.3s ease",
        }}
      />
    </div>
    <div style={{ marginTop: 5, fontSize: 12, color: "#6c757d" }}>
      {Math.round(progress)}% complete
    </div>
  </div>
);

export const MinimalSpinner: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      color: "#6c757d",
      fontSize: 14,
    }}
  >
    <div
      style={{
        width: 16,
        height: 16,
        border: "2px solid #e9ecef",
        borderTop: "2px solid #007bff",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginRight: 8,
      }}
    />
    Loading...
  </div>
);

// Add spinner animation
if (
  typeof document !== "undefined" &&
  !document.getElementById("spinner-styles")
) {
  const style = document.createElement("style");
  style.id = "spinner-styles";
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
