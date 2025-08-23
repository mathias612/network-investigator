import React, { useState, useRef, useEffect } from "react";
import { NetworkFilter } from "../types";
import { logger } from "../utils/logger";

interface MultiSelectDropdownProps {
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      // Calculate if dropdown should appear above or below
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = Math.min(200, options.length * 20); // Approximate height
        
        if (rect.bottom + dropdownHeight > viewportHeight && rect.top > dropdownHeight) {
          setDropdownPosition('above');
        } else {
          setDropdownPosition('below');
        }
      }
    }
    setIsOpen(!isOpen);
  };

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((v) => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const displayText =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
        ? selectedValues[0]
        : `${selectedValues.length} selected`;

  // Show total count when dropdown is open and has many options
  const showTotalCount = isOpen && options.length > 8;

  return (
    <div className="multi-select-dropdown" ref={dropdownRef}>
      <div
        className="dropdown-header"
        onClick={toggleDropdown}
        style={{
          padding: "4px 6px",
          border: "1px solid #ddd",
          borderRadius: "3px",
          cursor: "pointer",
          fontSize: "11px",
          background: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{displayText}</span>
        <span style={{ fontSize: "8px" }}>{isOpen ? "▲" : "▼"}</span>
      </div>

      {isOpen && (
        <div
          className="dropdown-list"
          style={{
            position: "absolute",
            top: dropdownPosition === 'below' ? "100%" : "auto",
            bottom: dropdownPosition === 'above' ? "100%" : "auto",
            left: 0,
            right: 0,
            background: "white",
            border: dropdownPosition === 'below' ? "1px solid #ddd" : "1px solid #ddd",
            borderTop: dropdownPosition === 'below' ? "none" : "1px solid #ddd",
            borderBottom: dropdownPosition === 'above' ? "none" : "1px solid #ddd",
            borderRadius: dropdownPosition === 'below' ? "0 0 3px 3px" : "3px 3px 0 0",
            zIndex: 1000,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0px",
            maxHeight: "200px",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {showTotalCount && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "4px 8px",
                background: "#f8f9fa",
                borderBottom: "1px solid #e0e0e0",
                fontSize: "9px",
                color: "#666",
                textAlign: "center",
                fontWeight: "500",
              }}
            >
              {options.length} total options
            </div>
          )}
          {options.map((option) => (
            <div
              key={option}
              onClick={() => toggleOption(option)}
              style={{
                padding: "4px 2px",
                cursor: "pointer",
                fontSize: "10px",
                background: selectedValues.includes(option)
                  ? "#e3f2fd"
                  : "white",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option)}
                onChange={() => {}} // Handled by parent div click
                style={{
                  pointerEvents: "none",
                  margin: "0",
                  marginLeft: "2px",
                  marginRight: "6px",
                  flexShrink: 0,
                  width: "12px",
                  height: "12px",
                }}
              />
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: "500",
                  fontSize: "10px",
                  textAlign: "left",
                }}
              >
                {option}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface FilterPanelProps {
  filters: NetworkFilter[];
  onAddFilter: (filter: Omit<NetworkFilter, "id">) => void;
  onUpdateFilter: (id: string, updates: Partial<NetworkFilter>) => void;
  onRemoveFilter: (id: string) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
}) => {
  logger.log("[Browser Investigator] FilterPanel rendering, filters:", filters);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [editingFilter, setEditingFilter] = useState<string | null>(null);
  const [newFilter, setNewFilter] = useState({
    name: "",
    methods: [] as string[],
    urlPattern: "",
    includeHeaders: false,
    includePayload: false,
    includeResponse: false,
    includeErrors: false,
    responseCodeFilter: [] as string[],
    isActive: true,
    isExclude: false,
  });
  const [editFilter, setEditFilter] = useState({
    name: "",
    method: "",
    urlPattern: "",
    includeHeaders: false,
    includePayload: false,
    includeResponse: false,
    includeErrors: false,
    responseCodeFilter: [] as string[],
    isActive: true,
    isExclude: false,
  });

  const handleAddFilter = () => {
    logger.log(
      "[Browser Investigator] handleAddFilter called with:",
      newFilter,
    );
    if (newFilter.name.trim()) {
      logger.log(
        "[Browser Investigator] Filter name valid, calling onAddFilter",
      );
      // Create separate filters for each selected method
      if (newFilter.methods.length > 0) {
        newFilter.methods.forEach((method) => {
          onAddFilter({
            name: `${newFilter.name} (${method})`,
            method: method,
            urlPattern: newFilter.urlPattern,
            includeHeaders: newFilter.includeHeaders,
            includePayload: newFilter.includePayload,
            includeResponse: newFilter.includeResponse,
            includeErrors: newFilter.includeErrors,
            responseCodeFilter:
              newFilter.responseCodeFilter.length > 0
                ? newFilter.responseCodeFilter
                : undefined,
            isActive: true,
            isExclude: newFilter.isExclude,
          });
        });
      } else {
        // No method selected, create a general filter
        onAddFilter({
          name: newFilter.name,
          method: undefined,
          urlPattern: newFilter.urlPattern,
          includeHeaders: newFilter.includeHeaders,
          includePayload: newFilter.includePayload,
          includeResponse: newFilter.includeResponse,
          includeErrors: newFilter.includeErrors,
          responseCodeFilter:
            newFilter.responseCodeFilter.length > 0
              ? newFilter.responseCodeFilter
              : undefined,
          isActive: true,
          isExclude: newFilter.isExclude,
        });
      }

      setNewFilter({
        name: "",
        methods: [],
        urlPattern: "",
        includeHeaders: false,
        includePayload: false,
        includeResponse: false,
        includeErrors: false,
        responseCodeFilter: [],
        isActive: true,
        isExclude: false,
      });
      setShowAddForm(false);
    } else {
      logger.log(
        "[Browser Investigator] Filter name is empty, not adding filter",
      );
    }
  };

  const handleDeleteFilter = (filterId: string) => {
    setShowDeleteConfirm(filterId);
  };

  const confirmDeleteFilter = () => {
    if (showDeleteConfirm) {
      onRemoveFilter(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  const cancelDeleteFilter = () => {
    setShowDeleteConfirm(null);
  };

  const handleEditFilter = (filter: NetworkFilter) => {
    // Close add form if open
    setShowAddForm(false);
    setEditingFilter(filter.id);
    setEditFilter({
      name: filter.name,
      method: filter.method || "",
      urlPattern: filter.urlPattern || "",
      includeHeaders: filter.includeHeaders || false,
      includePayload: filter.includePayload || false,
      includeResponse: filter.includeResponse || false,
      includeErrors: filter.includeErrors || false,
      responseCodeFilter: filter.responseCodeFilter || [],
      isActive: filter.isActive,
      isExclude: filter.isExclude || false,
    });
  };

  const handleSaveEdit = () => {
    if (editingFilter && editFilter.name.trim()) {
      onUpdateFilter(editingFilter, {
        name: editFilter.name,
        method: editFilter.method || undefined,
        urlPattern: editFilter.urlPattern || undefined,
        includeHeaders: editFilter.includeHeaders,
        includePayload: editFilter.includePayload,
        includeResponse: editFilter.includeResponse,
        includeErrors: editFilter.includeErrors,
        responseCodeFilter:
          editFilter.responseCodeFilter.length > 0
            ? editFilter.responseCodeFilter
            : undefined,
        isActive: editFilter.isActive,
        isExclude: editFilter.isExclude,
      });
      setEditingFilter(null);
      setEditFilter({
        name: "",
        method: "",
        urlPattern: "",
        includeHeaders: false,
        includePayload: false,
        includeResponse: false,
        includeErrors: false,
        responseCodeFilter: [],
        isActive: true,
        isExclude: false,
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingFilter(null);
    setEditFilter({
      name: "",
      method: "",
      urlPattern: "",
      includeHeaders: false,
      includePayload: false,
      includeResponse: false,
      includeErrors: false,
      responseCodeFilter: [],
      isActive: true,
      isExclude: false,
    });
  };

  const httpMethods = [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "HEAD",
    "OPTIONS",
  ];
  const responseCodeOptions = [
    "2XX",
    "3XX",
    "4XX",
    "5XX",
    "200",
    "201",
    "204",
    "301",
    "302",
    "400",
    "401",
    "403",
    "404",
    "500",
    "502",
    "503",
  ];

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h3>Filters{filters.filter(f => f.isActive).length > 0 && " (must match ALL active filters)"}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            className="add-filter-btn"
            style={{
              background: "green",
              color: "white",
              padding: "8px",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => {
              logger.log(
                "[Network Investigator] Add Filter button clicked, showAddForm:",
                showAddForm,
              );
              // Close any edit form if open
              setEditingFilter(null);
              setShowAddForm(!showAddForm);
            }}
          >
            {showAddForm ? "Cancel" : "Add Filter"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="add-filter-form">
          <input
            type="text"
            placeholder="Filter name"
            value={newFilter.name}
            onChange={(e) =>
              setNewFilter({ ...newFilter, name: e.target.value })
            }
          />
          <div
            className="method-selection"
            style={{ position: "relative", marginBottom: "6px" }}
          >
            <label
              style={{
                fontSize: "10px",
                fontWeight: "bold",
                marginBottom: "4px",
                display: "block",
              }}
            >
              HTTP Methods:
            </label>
            <MultiSelectDropdown
              options={httpMethods}
              selectedValues={newFilter.methods}
              onChange={(selectedMethods) =>
                setNewFilter({ ...newFilter, methods: selectedMethods })
              }
              placeholder="Select methods..."
            />
          </div>
          <input
            type="text"
            placeholder="URL pattern"
            value={newFilter.urlPattern}
            onChange={(e) =>
              setNewFilter({ ...newFilter, urlPattern: e.target.value })
            }
          />
          <div className="filter-options">
            <label>
              <input
                type="checkbox"
                checked={newFilter.includeHeaders}
                onChange={(e) =>
                  setNewFilter({
                    ...newFilter,
                    includeHeaders: e.target.checked,
                  })
                }
              />
              Headers
            </label>
            <label>
              <input
                type="checkbox"
                checked={newFilter.includePayload}
                onChange={(e) =>
                  setNewFilter({
                    ...newFilter,
                    includePayload: e.target.checked,
                  })
                }
              />
              Payload
            </label>
            <label>
              <input
                type="checkbox"
                checked={newFilter.includeResponse}
                onChange={(e) =>
                  setNewFilter({
                    ...newFilter,
                    includeResponse: e.target.checked,
                  })
                }
              />
              Response
            </label>
            <label>
              <input
                type="checkbox"
                checked={newFilter.includeErrors}
                onChange={(e) =>
                  setNewFilter({
                    ...newFilter,
                    includeErrors: e.target.checked,
                  })
                }
              />
              Errors
            </label>
          </div>
          <div
            className="response-code-selection"
            style={{ position: "relative", marginBottom: "6px" }}
          >
            <label
              style={{
                fontSize: "10px",
                fontWeight: "bold",
                marginBottom: "4px",
                display: "block",
              }}
            >
              Response Codes:
            </label>
            <MultiSelectDropdown
              options={responseCodeOptions}
              selectedValues={newFilter.responseCodeFilter}
              onChange={(selectedCodes) =>
                setNewFilter({
                  ...newFilter,
                  responseCodeFilter: selectedCodes,
                })
              }
              placeholder="Select response codes..."
            />
          </div>
          <div
            className="filter-behavior"
            style={{
              marginTop: "8px",
              padding: "4px",
              border: "1px solid #e0e0e0",
              borderRadius: "3px",
              background: "#f8f9fa",
            }}
          >
            <label
              style={{
                fontWeight: "bold",
                fontSize: "10px",
                color: "#2c3e50",
                marginBottom: "4px",
                display: "block",
              }}
            >
              Filter Behavior:
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
              }}
            >
              <input
                type="checkbox"
                checked={newFilter.isExclude}
                onChange={(e) =>
                  setNewFilter({ ...newFilter, isExclude: e.target.checked })
                }
                style={{ margin: "0" }}
              />
              <span
                style={{
                  color: newFilter.isExclude ? "#e74c3c" : "#27ae60",
                  fontWeight: "500",
                }}
              >
                {newFilter.isExclude
                  ? "Exclude matching items"
                  : "Include matching items"}
              </span>
            </label>
          </div>
          <button
            onClick={handleAddFilter}
            style={{
              background: "blue",
              color: "white",
              padding: "8px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Save Filter
          </button>
        </div>
      )}

      <div className="filters-list">
        {filters.map((filter) => (
          <div key={filter.id} className="filter-item">
            {editingFilter === filter.id ? (
              // Edit form
              <div className="edit-filter-form">
                <input
                  type="text"
                  placeholder="Filter name"
                  value={editFilter.name}
                  onChange={(e) =>
                    setEditFilter({ ...editFilter, name: e.target.value })
                  }
                  style={{ marginBottom: "6px" }}
                />
                <select
                  value={editFilter.method}
                  onChange={(e) =>
                    setEditFilter({ ...editFilter, method: e.target.value })
                  }
                  style={{ marginBottom: "6px" }}
                >
                  <option value="">All methods</option>
                  {httpMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="URL pattern"
                  value={editFilter.urlPattern}
                  onChange={(e) =>
                    setEditFilter({ ...editFilter, urlPattern: e.target.value })
                  }
                  style={{ marginBottom: "6px" }}
                />
                <div className="filter-options">
                  <label>
                    <input
                      type="checkbox"
                      checked={editFilter.includeHeaders}
                      onChange={(e) =>
                        setEditFilter({
                          ...editFilter,
                          includeHeaders: e.target.checked,
                        })
                      }
                    />
                    Headers
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editFilter.includePayload}
                      onChange={(e) =>
                        setEditFilter({
                          ...editFilter,
                          includePayload: e.target.checked,
                        })
                      }
                    />
                    Payload
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editFilter.includeResponse}
                      onChange={(e) =>
                        setEditFilter({
                          ...editFilter,
                          includeResponse: e.target.checked,
                        })
                      }
                    />
                    Response
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editFilter.includeErrors}
                      onChange={(e) =>
                        setEditFilter({
                          ...editFilter,
                          includeErrors: e.target.checked,
                        })
                      }
                    />
                    Errors
                  </label>
                </div>
                <div
                  className="response-code-selection"
                  style={{ position: "relative", marginBottom: "6px" }}
                >
                  <label
                    style={{
                      fontSize: "10px",
                      fontWeight: "bold",
                      marginBottom: "4px",
                      display: "block",
                    }}
                  >
                    Response Codes:
                  </label>
                  <MultiSelectDropdown
                    options={responseCodeOptions}
                    selectedValues={editFilter.responseCodeFilter}
                    onChange={(selectedCodes) =>
                      setEditFilter({
                        ...editFilter,
                        responseCodeFilter: selectedCodes,
                      })
                    }
                    placeholder="Select response codes..."
                  />
                </div>
                <div
                  className="filter-behavior"
                  style={{
                    marginTop: "8px",
                    padding: "4px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "3px",
                    background: "#f8f9fa",
                  }}
                >
                  <label
                    style={{
                      fontWeight: "bold",
                      fontSize: "10px",
                      color: "#2c3e50",
                      marginBottom: "4px",
                      display: "block",
                    }}
                  >
                    Filter Behavior:
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={editFilter.isExclude}
                      onChange={(e) =>
                        setEditFilter({
                          ...editFilter,
                          isExclude: e.target.checked,
                        })
                      }
                      style={{ margin: "0" }}
                    />
                    <span
                      style={{
                        color: editFilter.isExclude ? "#e74c3c" : "#27ae60",
                        fontWeight: "500",
                      }}
                    >
                      {editFilter.isExclude
                        ? "Exclude matching items"
                        : "Include matching items"}
                    </span>
                  </label>
                </div>
                <div
                  className="edit-actions"
                  style={{ display: "flex", gap: "4px", marginTop: "8px" }}
                >
                  <button
                    onClick={handleSaveEdit}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      border: "none",
                      borderRadius: "3px",
                      background: "#27ae60",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      border: "1px solid #ddd",
                      borderRadius: "3px",
                      background: "white",
                      color: "#333",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Normal display
              <>
                <div className="filter-info">
                  <span className="filter-name">
                    {filter.name}
                    {filter.isExclude && (
                      <span
                        style={{
                          color: "#e74c3c",
                          fontSize: "9px",
                          marginLeft: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        [EXCLUDE]
                      </span>
                    )}
                  </span>
                  {filter.method && (
                    <span className="filter-method">{filter.method}</span>
                  )}
                  {filter.urlPattern && (
                    <span className="filter-url">{filter.urlPattern}</span>
                  )}
                  {filter.responseCodeFilter &&
                    filter.responseCodeFilter.length > 0 && (
                      <span
                        className="filter-response-codes"
                        style={{
                          fontSize: "9px",
                          background: "#e8f4f8",
                          padding: "2px 4px",
                          borderRadius: "2px",
                          marginLeft: "4px",
                        }}
                      >
                        {filter.responseCodeFilter.join(", ")}
                      </span>
                    )}
                </div>
                <div className="filter-actions">
                  <label>
                    <input
                      type="checkbox"
                      checked={filter.isActive}
                      onChange={(e) =>
                        onUpdateFilter(filter.id, {
                          isActive: e.target.checked,
                        })
                      }
                    />
                    Active
                  </label>
                  <button
                    className="edit-filter-btn"
                    onClick={() => handleEditFilter(filter)}
                    style={{
                      padding: "1px 4px",
                      border: "none",
                      borderRadius: "2px",
                      background: "#3498db",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "10px",
                      marginRight: "4px",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="remove-filter-btn"
                    onClick={() => handleDeleteFilter(filter.id)}
                  >
                    ×
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              minWidth: "280px",
              textAlign: "center",
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333",
              }}
            >
              Delete Filter
            </h4>
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: "12px",
                color: "#666",
                lineHeight: "1.4",
              }}
            >
              Are you sure you want to delete this filter? This action cannot be
              undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={cancelDeleteFilter}
                style={{
                  padding: "6px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  background: "white",
                  color: "#333",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500",
                }}
              >
                No
              </button>
              <button
                onClick={confirmDeleteFilter}
                style={{
                  padding: "6px 16px",
                  border: "none",
                  borderRadius: "4px",
                  background: "#e74c3c",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500",
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
