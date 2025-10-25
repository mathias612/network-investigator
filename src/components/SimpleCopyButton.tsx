import React, { useState } from "react";
import { copyToClipboard } from "../utils/clipboardUtils";
import { logger } from "../utils/logger";

interface SimpleCopyButtonProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

const SimpleCopyButton: React.FC<SimpleCopyButtonProps> = ({
  text,
  className = "",
  style = {},
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [copySuccess, setCopySuccess] = useState<boolean | null>(null);

  const handleCopy = async () => {
    try {
      const success = await copyToClipboard(text);
      
      if (success) {
        setIsCopied(true);
        setCopySuccess(true);
        
        setTimeout(() => {
          setIsCopied(false);
          setCopySuccess(null);
        }, 2000);
      } else {
        setIsCopied(true);
        setCopySuccess(false);
        setTimeout(() => {
          setIsCopied(false);
          setCopySuccess(null);
        }, 1000);
      }
    } catch (error) {
      logger.error("Failed to copy:", error);
      setIsCopied(true);
      setCopySuccess(false);
      setTimeout(() => {
        setIsCopied(false);
        setCopySuccess(null);
      }, 1000);
    }
  };

  return (
    <button
      className={`simple-copy-button ${className}`}
      onClick={handleCopy}
      style={{
        background: isCopied
          ? copySuccess
            ? "#4caf50"
            : "#e74c3c"
          : undefined,
        color: isCopied ? "white" : undefined,
        ...style,
      }}
      title={isCopied ? (copySuccess ? "Copied!" : "Failed to copy") : "Copy to clipboard"}
    >
      {isCopied ? (
        copySuccess ? "✓ Copied!" : "✗ Failed"
      ) : (
        "Copy"
      )}
    </button>
  );
};

export default SimpleCopyButton;
