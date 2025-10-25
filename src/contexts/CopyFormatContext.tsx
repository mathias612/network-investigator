import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

interface CopyFormatContextType {
  selectedFormat: CopyFormat;
  setSelectedFormat: (format: CopyFormat) => void;
}

const CopyFormatContext = createContext<CopyFormatContextType | undefined>(undefined);

interface CopyFormatProviderProps {
  children: ReactNode;
}

export const CopyFormatProvider: React.FC<CopyFormatProviderProps> = ({ children }) => {
  const [selectedFormat, setSelectedFormatState] = useState<CopyFormat>("curl-bash");

  // Load saved preference from localStorage on mount
  useEffect(() => {
    const savedFormat = localStorage.getItem("network-investigator-copy-format") as CopyFormat;
    const isValidFormat = (format: string): format is CopyFormat => {
      return [
        "curl-bash", "curl-cmd", "powershell", "fetch", "fetch-node", "url",
        "request-headers", "response-headers", "response", "stack-trace",
        "all-urls", "all-curl-bash", "all-curl-cmd", "all-powershell", 
        "all-fetch", "all-fetch-node", "all-har"
      ].includes(format);
    };
    
    if (savedFormat && isValidFormat(savedFormat)) {
      setSelectedFormatState(savedFormat);
    }
  }, []);

  const setSelectedFormat = (format: CopyFormat) => {
    setSelectedFormatState(format);
    // Save to localStorage
    localStorage.setItem("network-investigator-copy-format", format);
  };

  return (
    <CopyFormatContext.Provider value={{ selectedFormat, setSelectedFormat }}>
      {children}
    </CopyFormatContext.Provider>
  );
};

export const useCopyFormat = (): CopyFormatContextType => {
  const context = useContext(CopyFormatContext);
  if (context === undefined) {
    throw new Error('useCopyFormat must be used within a CopyFormatProvider');
  }
  return context;
};
