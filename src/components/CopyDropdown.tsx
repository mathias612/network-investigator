import React, { useState, useRef, useEffect } from "react";
import { copyToClipboard } from "../utils/clipboardUtils";
import { logger } from "../utils/logger";
import { useCopyFormat } from "../contexts/CopyFormatContext";

export type CopyFormat = 
  | "curl-bash"
  | "curl-cmd" 
  | "powershell"
  | "fetch"
  | "fetch-node"
  | "url"
  | "request-headers"
  | "response-headers"
  | "response"
  | "stack-trace"
  | "all-urls"
  | "all-curl-bash"
  | "all-curl-cmd"
  | "all-powershell"
  | "all-fetch"
  | "all-fetch-node"
  | "all-har";

interface NetworkCall {
  id: string;
  url: string;
  method: string;
  status?: number;
  requestHeaders?: any;
  responseHeaders?: any;
  requestBody?: string;
  responseBody?: string;
  timestamp: number;
  duration?: number;
  stackTrace?: string;
}

interface CopyDropdownProps {
  call: NetworkCall;
  allCalls?: NetworkCall[];
  className?: string;
  style?: React.CSSProperties;
}

const CopyDropdown: React.FC<CopyDropdownProps> = ({
  call,
  allCalls = [],
  className = "",
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [copySuccess, setCopySuccess] = useState<boolean | null>(null);
  const { selectedFormat, setSelectedFormat } = useCopyFormat();
  const dropdownRef = useRef<HTMLDivElement>(null);


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatOptions = [
    { value: "curl-bash", label: "Copy as cURL (bash)" },
    { value: "curl-cmd", label: "Copy as cURL (cmd)" },
    { value: "powershell", label: "Copy as PowerShell" },
    { value: "fetch", label: "Copy as fetch" },
    { value: "fetch-node", label: "Copy as fetch (Node.js)" },
    { value: "url", label: "Copy URL" },
    { value: "request-headers", label: "Copy request headers" },
    { value: "response-headers", label: "Copy response headers" },
    { value: "response", label: "Copy response" },
    { value: "stack-trace", label: "Copy stack trace" },
    { value: "all-urls", label: "Copy all URLs" },
    { value: "all-curl-bash", label: "Copy all as cURL (bash)" },
    { value: "all-curl-cmd", label: "Copy all as cURL (cmd)" },
    { value: "all-powershell", label: "Copy all as PowerShell" },
    { value: "all-fetch", label: "Copy all as fetch" },
    { value: "all-fetch-node", label: "Copy all as fetch (Node.js)" },
    { value: "all-har", label: "Copy all as HAR (sanitized)" },
  ];

  const generateCurlCommand = (call: NetworkCall, isWindows: boolean = false): string => {
    const method = call.method || "GET";
    const url = call.url || "";
    const prefix = isWindows ? "curl.exe" : "curl";
    let curl = `${prefix} -X ${method} "${url}"`;

    const headers = call.requestHeaders || {};
    if (Array.isArray(headers)) {
      headers.forEach((header: any) => {
        const name = header.name || header.key;
        const value = header.value;
        if (name && value) {
          curl += ` -H "${name}: ${value}"`;
        }
      });
    } else if (typeof headers === "object" && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key && value) {
          const headerValue = typeof value === "object" && value !== null
            ? (value as any).value || (value as any).name || JSON.stringify(value)
            : String(value);
          curl += ` -H "${key}: ${headerValue}"`;
        }
      });
    }

    if (call.requestBody && ["POST", "PUT", "PATCH"].includes(method)) {
      const escapedBody = call.requestBody.replace(/'/g, "'\"'\"'");
      curl += ` -d '${escapedBody}'`;
    }

    return curl;
  };

  const generatePowerShellCommand = (call: NetworkCall): string => {
    const method = call.method || "GET";
    const url = call.url || "";
    
    let psCommand = `Invoke-RestMethod -Uri "${url}" -Method ${method}`;
    
    const headers = call.requestHeaders || {};
    if (Array.isArray(headers) && headers.length > 0) {
      const headerHash = headers
        .filter((header: any) => header.name || header.key)
        .map((header: any) => `"${header.name || header.key}" = "${header.value}"`)
        .join("; ");
      psCommand += ` -Headers @{${headerHash}}`;
    } else if (typeof headers === "object" && headers !== null && Object.keys(headers).length > 0) {
      const headerHash = Object.entries(headers)
        .filter(([key, value]) => key && value)
        .map(([key, value]) => {
          const headerValue = typeof value === "object" && value !== null
            ? (value as any).value || (value as any).name || JSON.stringify(value)
            : String(value);
          return `"${key}" = "${headerValue}"`;
        })
        .join("; ");
      psCommand += ` -Headers @{${headerHash}}`;
    }

    if (call.requestBody && ["POST", "PUT", "PATCH"].includes(method)) {
      psCommand += ` -Body '${call.requestBody}'`;
    }

    return psCommand;
  };

  const generateFetchCommand = (call: NetworkCall, isNode: boolean = false): string => {
    const method = call.method || "GET";
    const url = call.url || "";
    
    let fetchCommand = isNode 
      ? `const fetch = require('node-fetch');\n\n`
      : "";
    
    fetchCommand += `fetch("${url}", {\n`;
    fetchCommand += `  method: "${method}",\n`;
    
    const headers = call.requestHeaders || {};
    if (Array.isArray(headers) && headers.length > 0) {
      fetchCommand += `  headers: {\n`;
      headers.forEach((header: any) => {
        const name = header.name || header.key;
        const value = header.value;
        if (name && value) {
          fetchCommand += `    "${name}": "${value}",\n`;
        }
      });
      fetchCommand += `  },\n`;
    } else if (typeof headers === "object" && headers !== null && Object.keys(headers).length > 0) {
      fetchCommand += `  headers: {\n`;
      Object.entries(headers).forEach(([key, value]) => {
        if (key && value) {
          const headerValue = typeof value === "object" && value !== null
            ? (value as any).value || (value as any).name || JSON.stringify(value)
            : String(value);
          fetchCommand += `    "${key}": "${headerValue}",\n`;
        }
      });
      fetchCommand += `  },\n`;
    }

    if (call.requestBody && ["POST", "PUT", "PATCH"].includes(method)) {
      fetchCommand += `  body: '${call.requestBody}',\n`;
    }

    fetchCommand += `});`;
    
    return fetchCommand;
  };

  const generateHeadersText = (headers: any): string => {
    if (Array.isArray(headers)) {
      return headers
        .map((header: any) => `${header.name || header.key || String(header)}: ${header.value || String(header)}`)
        .join("\n");
    } else if (typeof headers === "object" && headers !== null) {
      return Object.entries(headers)
        .map(([key, value]) => {
          const headerValue = typeof value === "object" && value !== null
            ? (value as any).value || (value as any).name || JSON.stringify(value)
            : String(value || "");
          return `${key}: ${headerValue}`;
        })
        .join("\n");
    }
    return String(headers || "");
  };

  const generateAllUrls = (): string => {
    return allCalls.map(call => call.url).join("\n");
  };

  const generateAllCurlCommands = (isWindows: boolean = false): string => {
    return allCalls.map(call => generateCurlCommand(call, isWindows)).join("\n\n");
  };

  const generateAllPowerShellCommands = (): string => {
    return allCalls.map(call => generatePowerShellCommand(call)).join("\n\n");
  };

  const generateAllFetchCommands = (isNode: boolean = false): string => {
    return allCalls.map(call => generateFetchCommand(call, isNode)).join("\n\n");
  };

  const generateHarData = (): string => {
    const har = {
      log: {
        version: "1.2",
        creator: {
          name: "Network Investigator",
          version: "1.0.0"
        },
        entries: allCalls.map(call => ({
          startedDateTime: new Date(call.timestamp).toISOString(),
          time: call.duration || 0,
          request: {
            method: call.method || "GET",
            url: call.url,
            headers: Array.isArray(call.requestHeaders) 
              ? call.requestHeaders.map((h: any) => ({ name: h.name || h.key, value: h.value }))
              : Object.entries(call.requestHeaders || {}).map(([name, value]) => ({ name, value })),
            body: call.requestBody ? { text: call.requestBody } : undefined
          },
          response: {
            status: call.status || 200,
            headers: Array.isArray(call.responseHeaders)
              ? call.responseHeaders.map((h: any) => ({ name: h.name || h.key, value: h.value }))
              : Object.entries(call.responseHeaders || {}).map(([name, value]) => ({ name, value })),
            content: call.responseBody ? { text: call.responseBody } : undefined
          }
        }))
      }
    };
    return JSON.stringify(har, null, 2);
  };

  const getCopyText = (format: CopyFormat): string => {
    switch (format) {
      case "curl-bash":
        return generateCurlCommand(call, false);
      case "curl-cmd":
        return generateCurlCommand(call, true);
      case "powershell":
        return generatePowerShellCommand(call);
      case "fetch":
        return generateFetchCommand(call, false);
      case "fetch-node":
        return generateFetchCommand(call, true);
      case "url":
        return call.url;
      case "request-headers":
        return generateHeadersText(call.requestHeaders);
      case "response-headers":
        return generateHeadersText(call.responseHeaders);
      case "response":
        return call.responseBody || "";
      case "stack-trace":
        return call.stackTrace || "";
      case "all-urls":
        return generateAllUrls();
      case "all-curl-bash":
        return generateAllCurlCommands(false);
      case "all-curl-cmd":
        return generateAllCurlCommands(true);
      case "all-powershell":
        return generateAllPowerShellCommands();
      case "all-fetch":
        return generateAllFetchCommands(false);
      case "all-fetch-node":
        return generateAllFetchCommands(true);
      case "all-har":
        return generateHarData();
      default:
        return "";
    }
  };

  const handleCopy = async (format: CopyFormat) => {
    try {
      const text = getCopyText(format);
      const success = await copyToClipboard(text);
      
      if (success) {
        setIsCopied(true);
        setCopySuccess(true);
        setSelectedFormat(format);
        
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

  const handlePrimaryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleCopy(selectedFormat);
  };

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const getDisplayText = (format: CopyFormat): string => {
    const option = formatOptions.find(opt => opt.value === format);
    return option ? option.label.replace("Copy ", "").replace("Copy all ", "All ") : "Copy";
  };

  return (
    <div 
      ref={dropdownRef} 
      className={`copy-dropdown ${className}`} 
      style={{ ...style }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="split-button">
        <button
          className="primary-button"
          onClick={handlePrimaryClick}
          style={{
            background: isCopied
              ? copySuccess
                ? "#4caf50"
                : "#e74c3c"
              : undefined,
            color: isCopied ? "white" : undefined,
          }}
        >
          {isCopied ? (
            copySuccess ? "✓ Copied!" : "✗ Failed"
          ) : (
            getDisplayText(selectedFormat)
          )}
        </button>
        <button
          className="dropdown-button"
          onClick={handleDropdownClick}
          style={{
            background: isCopied
              ? copySuccess
                ? "#4caf50"
                : "#e74c3c"
              : undefined,
            color: isCopied ? "white" : undefined,
          }}
        >
          ▼
        </button>
      </div>

      {isOpen && (
        <div 
          className="dropdown-menu"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {formatOptions.map((option) => (
            <button
              key={option.value}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedFormat(option.value as CopyFormat);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CopyDropdown;
