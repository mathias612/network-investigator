import React from "react";
import CopyButton from "./CopyButton";

const CopyTest: React.FC = () => {
  const testData = {
    json: { test: "data", number: 123, array: [1, 2, 3] },
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token123",
    },
    text: "This is a test string for copying",
  };

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h3>Copy Functionality Test</h3>

      <div style={{ marginBottom: "20px" }}>
        <h4>JSON Data:</h4>
        <pre>{JSON.stringify(testData.json, null, 2)}</pre>
        <CopyButton
          data={testData.json}
          dataType="json"
          title="Copy JSON data"
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h4>Headers Data:</h4>
        <pre>{JSON.stringify(testData.headers, null, 2)}</pre>
        <CopyButton
          data={testData.headers}
          dataType="headers"
          title="Copy headers data"
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h4>Text Data:</h4>
        <pre>{testData.text}</pre>
        <CopyButton
          data={testData.text}
          dataType="text"
          title="Copy text data"
        />
      </div>
    </div>
  );
};

export default CopyTest;
