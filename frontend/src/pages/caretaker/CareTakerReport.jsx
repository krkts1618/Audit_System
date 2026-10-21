import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCw,
  Building,
  Tag,
  Boxes,
  Calendar,
  User as UserIcon,
  Info,
  RefreshCw,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import { createTicket, getTickets } from "../../services/ticketService";
import { getRooms, getAssets } from "../../services/infraService";
import { useAuth } from "../../context/AuthContext";

const CareTakerReport = () => {
  const { user } = useAuth();

  // Data states
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tickets, setTickets] = useState([]);

  // Independent loading and error states
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState(null);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState(null);
  const [refreshingTickets, setRefreshingTickets] = useState(false);

  // Form submission feedback
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [ticketFilter, setTicketFilter] = useState("ALL"); // "ALL" or "MY"

  // Active selections & search state
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("Routine");
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      assetId: "",
      description: "",
      severity: "Routine",
    },
  });

  // Fetch assets and rooms independently
  const loadAssetsAndRooms = useCallback(async () => {
    setAssetsLoading(true);
    setAssetsError(null);

    try {
      const [assetsRes, roomsRes, ticketsRes] = await Promise.allSettled([
        getAssets(),
        getRooms(),
        getTickets(),
      ]);

      // Process Rooms for facility mapping
      if (roomsRes.status === "fulfilled" && roomsRes.value) {
        const val = roomsRes.value;
        const roomList = Array.isArray(val) ? val : val.rooms || [];
        setRooms(roomList);
      }

      // Collect available assets
      const assetMap = new Map();

      // 1. If backend has dedicated asset registry
      if (assetsRes.status === "fulfilled" && assetsRes.value) {
        const val = assetsRes.value;
        const directAssets = Array.isArray(val) ? val : val.assets || [];
        directAssets.forEach((a) => {
          if (a && a._id) assetMap.set(a._id, a);
        });
      }

      // 2. Extract populated assets from existing tickets as fallback
      if (ticketsRes.status === "fulfilled" && ticketsRes.value) {
        const val = ticketsRes.value;
        const ticketList = Array.isArray(val) ? val : val.tickets || [];
        ticketList.forEach((t) => {
          if (t.assetRef && t.assetRef._id) {
            assetMap.set(t.assetRef._id, t.assetRef);
          }
        });
      }

      const aggregatedAssets = Array.from(assetMap.values());
      setAssets(aggregatedAssets);
    } catch (err) {
      console.error("Error loading assets:", err);
      setAssetsError("Unable to load asset registry. Please check backend connection.");
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  // Fetch tickets independently
  const loadRecentTickets = useCallback(async () => {
    setTicketsLoading(true);
    setTicketsError(null);

    try {
      const res = await getTickets();
      const list = Array.isArray(res) ? res : res?.tickets || [];
      // Sort newest first
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      setTickets(sorted);
    } catch (err) {
      console.error("Error loading tickets:", err);
      setTicketsError("Failed to load recent tickets. Please try again.");
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  // Mount effect with cleanup flag
  useEffect(() => {
    let ignore = false;

    async function initialize() {
      if (!ignore) {
        await Promise.all([loadAssetsAndRooms(), loadRecentTickets()]);
      }
    }

    initialize();

    return () => {
      ignore = true;
    };
  }, [loadAssetsAndRooms, loadRecentTickets]);

  // Click outside listener for combobox dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Refresh recent tickets without reloading the whole page
  const handleRefreshTickets = async () => {
    setRefreshingTickets(true);
    try {
      const res = await getTickets();
      const list = Array.isArray(res) ? res : res?.tickets || [];
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      setTickets(sorted);
    } catch (err) {
      console.error("Failed to refresh tickets:", err);
    } finally {
      setRefreshingTickets(false);
    }
  };

  // Map of rooms by ID for rapid lookup
  const roomsMap = useMemo(() => {
    const map = {};
    rooms.forEach((r) => {
      if (r && r._id) {
        map[r._id] = r;
      }
    });
    return map;
  }, [rooms]);

  // Currently selected asset object
  const selectedAsset = useMemo(() => {
    return assets.find((a) => a._id === selectedAssetId) || null;
  }, [assets, selectedAssetId]);

  // Room resolved from the selected asset
  const resolvedRoom = useMemo(() => {
    if (!selectedAsset?.roomref) return null;
    return roomsMap[selectedAsset.roomref] || null;
  }, [selectedAsset, roomsMap]);

  // Filter assets based on search query (case-insensitive)
  // Supports: assetTagId, category/name, roomNumber, block, department
  const filteredAssets = useMemo(() => {
    if (!assetSearchQuery.trim()) {
      return assets;
    }
    const q = assetSearchQuery.toLowerCase().trim();
    return assets.filter((asset) => {
      const assetCode = (
        asset.assetTagId ||
        asset.assetId ||
        asset.assetCode ||
        ""
      ).toLowerCase();
      const name = (asset.category || asset.name || "").toLowerCase();
      const room = roomsMap[asset.roomref];
      const roomNumber = room?.roomNumber ? String(room.roomNumber).toLowerCase() : "";
      const block = room?.block ? String(room.block).toLowerCase() : "";
      const dept = room?.department ? String(room.department).toLowerCase() : "";
      const roomLabel = `room ${roomNumber}`.toLowerCase();

      return (
        assetCode.includes(q) ||
        name.includes(q) ||
        roomNumber.includes(q) ||
        roomLabel.includes(q) ||
        block.includes(q) ||
        dept.includes(q)
      );
    });
  }, [assets, assetSearchQuery, roomsMap]);

  // Handle selecting an asset from combobox
  const handleSelectAsset = (asset) => {
    setSelectedAssetId(asset._id);
    setValue("assetId", asset._id, { shouldValidate: true });

    const room = roomsMap[asset.roomref];
    const roomLabel = room
      ? `(Room ${room.roomNumber}, Block ${room.block})`
      : "";
    const displayLabel = `${asset.assetTagId || "Asset"} — ${
      asset.category || "General Equipment"
    } ${roomLabel}`.trim();

    setAssetSearchQuery(displayLabel);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  // Handle clearing the selected asset
  const handleClearAsset = () => {
    setSelectedAssetId("");
    setValue("assetId", "", { shouldValidate: true });
    setAssetSearchQuery("");
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Handle keyboard navigation in search input
  const handleKeyDown = (e) => {
    if (!isDropdownOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsDropdownOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredAssets.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredAssets.length - 1
      );
    } else if (e.key === "Enter") {
      if (
        isDropdownOpen &&
        highlightedIndex >= 0 &&
        highlightedIndex < filteredAssets.length
      ) {
        e.preventDefault();
        handleSelectAsset(filteredAssets[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Handle search input typing
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setAssetSearchQuery(val);
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);

    // If user modifies text away from the selected asset, clear selected asset
    if (selectedAssetId) {
      const room = selectedAsset?.roomref ? roomsMap[selectedAsset.roomref] : null;
      const roomLabel = room
        ? `(Room ${room.roomNumber}, Block ${room.block})`
        : "";
      const currentDisplay = `${selectedAsset?.assetTagId || "Asset"} — ${
        selectedAsset?.category || "General Equipment"
      } ${roomLabel}`.trim();

      if (val !== currentDisplay) {
        setSelectedAssetId("");
        setValue("assetId", "", { shouldValidate: true });
      }
    } else if (!val) {
      setSelectedAssetId("");
      setValue("assetId", "", { shouldValidate: true });
    }
  };

  // Filtered tickets (All vs My Reports)
  const displayedTickets = useMemo(() => {
    if (ticketFilter === "MY" && user?.id) {
      return tickets.filter((t) => {
        const reporterId =
          typeof t.reportedBy === "object"
            ? t.reportedBy?._id
            : t.reportedBy;
        return reporterId === user.id;
      });
    }
    return tickets;
  }, [tickets, ticketFilter, user]);

  // Form submission handler
  const onSubmit = async (formData) => {
    setSubmitSuccess("");
    setSubmitError("");

    if (!selectedAssetId && !formData.assetId) {
      setSubmitError("Please search and select a target asset.");
      return;
    }

    // Exact backend payload contract: { assetId, description, severity }
    // Sending the real MongoDB _id
    const payload = {
      assetId: selectedAssetId || formData.assetId,
      description: formData.description.trim(),
      severity: selectedSeverity,
    };

    try {
      const response = await createTicket(payload);

      const isCritical = selectedSeverity === "Critical";
      const successMsg = isCritical
        ? "🚨 Critical ticket created! Automatic maintenance dispatch triggered and emergency notification sent."
        : response?.message || "Defect ticket successfully submitted!";

      setSubmitSuccess(successMsg);

      // Reset form to clean state
      reset({
        assetId: "",
        description: "",
        severity: "Routine",
      });
      setSelectedAssetId("");
      setSelectedSeverity("Routine");
      setAssetSearchQuery("");
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);

      // Instantly refresh ticket feed
      await handleRefreshTickets();
    } catch (err) {
      console.error("Defect report submission failed:", err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to submit defect ticket. Please check the asset and try again.";
      setSubmitError(errMsg);
    }
  };

  // Cancel action resets form to initial state and clears validation errors
  const handleCancel = () => {
    reset({
      assetId: "",
      description: "",
      severity: "Routine",
    });
    setSelectedAssetId("");
    setSelectedSeverity("Routine");
    setAssetSearchQuery("");
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    setSubmitSuccess("");
    setSubmitError("");
  };

  return (
    <div className="w-full space-y-7 transition-colors">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Care Taker Portal: Defect Report Form
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Report damaged facilities, malfunctioning equipment, and safety hazards for immediate maintenance dispatch.
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN: REPORT A NEW DEFECT FORM (lg:col-span-7)    */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 rounded-2xl bg-white/95 dark:bg-[#131B2A]/70 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl p-6 sm:p-7 shadow-lg dark:shadow-2xl transition-all">
          {/* Form Header */}
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Report a New Defect
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logged tickets are immediately assigned to the maintenance dispatch queue.
              </p>
            </div>
          </div>

          {/* Submission Alerts */}
          {submitSuccess && (
            <div
              role="alert"
              className="mb-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-start space-x-2.5 animate-in fade-in duration-200"
            >
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300 text-xs sm:text-sm font-medium flex items-start space-x-2.5 animate-in fade-in duration-200"
            >
              <AlertCircle size={18} className="shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Defect Report Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* 1. Searchable Target Asset Autocomplete Combobox */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="asset-search-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Search Asset ID or Name *
                </label>
                {selectedAsset ? (
                  <button
                    type="button"
                    onClick={handleClearAsset}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                  >
                    Clear selection
                  </button>
                ) : (
                  assets.length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      {assets.length} registered {assets.length === 1 ? "asset" : "assets"} available
                    </span>
                  )
                )}
              </div>

              {assetsLoading ? (
                <div className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-400 flex items-center space-x-2">
                  <RotateCw size={15} className="animate-spin text-indigo-500" />
                  <span>Loading asset inventory...</span>
                </div>
              ) : assetsError ? (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-center justify-between text-xs text-red-700 dark:text-red-300">
                  <span>{assetsError}</span>
                  <button
                    type="button"
                    onClick={loadAssetsAndRooms}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Retry</span>
                  </button>
                </div>
              ) : assets.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold">
                    <Info size={14} className="shrink-0" />
                    <span>No assets registered yet</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    The asset registry is currently empty. Ask the department HOD to import assets via CSV Ingestion.
                  </p>
                  <button
                    type="button"
                    onClick={loadAssetsAndRooms}
                    className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Check again</span>
                  </button>
                </div>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  {/* Search Input Box with Icon */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                      <Search size={16} />
                    </div>

                    <input
                      id="asset-search-input"
                      ref={searchInputRef}
                      type="text"
                      role="combobox"
                      aria-expanded={isDropdownOpen}
                      aria-haspopup="listbox"
                      aria-controls="asset-listbox"
                      aria-autocomplete="list"
                      autoComplete="off"
                      placeholder="Enter Asset ID, asset name, or room number..."
                      value={assetSearchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => setIsDropdownOpen(true)}
                      onKeyDown={handleKeyDown}
                      className={`w-full bg-slate-50 dark:bg-slate-900/70 border rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all ${
                        errors.assetId && !selectedAssetId
                          ? "border-red-500 focus:ring-red-500/30"
                          : "border-slate-200 dark:border-slate-700/60"
                      }`}
                    />

                    {/* Clear selection or dropdown chevron */}
                    {selectedAssetId || assetSearchQuery ? (
                      <button
                        type="button"
                        onClick={handleClearAsset}
                        title="Clear asset selection"
                        className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    ) : (
                      <div className="absolute right-3.5 text-slate-400 pointer-events-none">
                        <ChevronDown size={16} />
                      </div>
                    )}
                  </div>

                  {/* Hidden field storing the actual MongoDB _id for react-hook-form */}
                  <input
                    type="hidden"
                    {...register("assetId", {
                      required: "Please search and select a target asset",
                    })}
                  />

                  {/* Search Result Listbox Popover */}
                  {isDropdownOpen && (
                    <div
                      id="asset-listbox"
                      role="listbox"
                      className="absolute left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xl z-30 divide-y divide-slate-100 dark:divide-slate-800/60 transition-all"
                    >
                      {filteredAssets.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                          <p className="font-semibold text-slate-700 dark:text-slate-300">
                            No matching assets found
                          </p>
                          <p className="text-[11px] mt-0.5 text-slate-400">
                            Try searching by asset identifier, equipment category, or room number
                          </p>
                        </div>
                      ) : (
                        filteredAssets.map((asset, idx) => {
                          const roomObj = roomsMap[asset.roomref];
                          const isSelected = asset._id === selectedAssetId;
                          const isHighlighted = idx === highlightedIndex;

                          return (
                            <div
                              key={asset._id}
                              id={`asset-option-${asset._id}`}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => handleSelectAsset(asset)}
                              onMouseEnter={() => setHighlightedIndex(idx)}
                              className={`p-3 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                                isSelected
                                  ? "bg-indigo-50/80 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-100 font-semibold"
                                  : isHighlighted
                                  ? "bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-white"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 shrink-0">
                                  {asset.assetTagId || "Asset"}
                                </span>
                                <div className="truncate">
                                  <span className="font-medium text-slate-800 dark:text-slate-100">
                                    {asset.category || "General Equipment"}
                                  </span>
                                  {roomObj && (
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5">
                                      • Room {roomObj.roomNumber} ({roomObj.block})
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
                                  Selected
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Inline Error Message */}
                  {errors.assetId && !selectedAssetId && (
                    <p className="text-xs text-red-500 mt-1">{errors.assetId.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* 2. Location / Room Number (Derived from selected asset) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Location / Facility Allocation
              </label>
              {resolvedRoom ? (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Building size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Room {resolvedRoom.roomNumber} • Block {resolvedRoom.block}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Floor {resolvedRoom.floor} • {resolvedRoom.department}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                    Linked
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                  <Info size={15} className="shrink-0 text-slate-400" />
                  <span>Search and select an asset above to view its allocated room location.</span>
                </div>
              )}
            </div>

            {/* 3. Severity Level Selection (Routine vs Critical) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Defect Severity Level *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Routine Choice */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeverity("Routine");
                    setValue("severity", "Routine");
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    selectedSeverity === "Routine"
                      ? "bg-amber-50/70 dark:bg-amber-500/10 border-amber-400 dark:border-amber-500 shadow-sm"
                      : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400">
                      <Clock size={16} />
                      <span className="text-sm font-bold">Routine</span>
                    </div>
                    {selectedSeverity === "Routine" && (
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Standard maintenance or cosmetic defect. Logged as <strong>Open</strong> status in the work order queue.
                  </p>
                </button>

                {/* Critical Choice */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeverity("Critical");
                    setValue("severity", "Critical");
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    selectedSeverity === "Critical"
                      ? "bg-red-50/70 dark:bg-red-500/15 border-red-500 shadow-sm shadow-red-500/10"
                      : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-bold">Critical</span>
                    </div>
                    {selectedSeverity === "Critical" && (
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Urgent safety hazard or severe failure. Automatically marked as <strong>Dispatched</strong> with emergency alert.
                  </p>
                </button>
              </div>
            </div>

            {/* 4. Description Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="description"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Description *
                </label>
                <span className="text-[11px] text-slate-400">
                  Min 10 characters
                </span>
              </div>
              <textarea
                id="description"
                rows={4}
                placeholder="Describe the issue, including what is damaged and where the problem occurs."
                {...register("description", {
                  required: "Description is required",
                  validate: (val) =>
                    val.trim().length >= 10 ||
                    "Please provide at least 10 characters of detail",
                })}
                className={`w-full bg-slate-50 dark:bg-slate-900/70 border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all resize-y ${
                  errors.description
                    ? "border-red-500 focus:ring-red-500/30"
                    : "border-slate-200 dark:border-slate-700/60"
                }`}
              />
              {errors.description && (
                <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* 5. Action Buttons (Submit Report & Cancel) */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || assetsLoading}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50 flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Report</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: RECENT TICKETS PANEL (lg:col-span-5)       */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 rounded-2xl bg-white/95 dark:bg-[#131B2A]/70 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-lg dark:shadow-2xl transition-all">
          {/* Header & Refresh */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800/80">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Recent Tickets
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  {displayedTickets.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Audit feed of logged maintenance requests.
              </p>
            </div>

            <button
              onClick={handleRefreshTickets}
              disabled={refreshingTickets}
              title="Refresh ticket feed"
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              aria-label="Refresh tickets"
            >
              <RotateCw
                size={15}
                className={refreshingTickets ? "animate-spin text-indigo-500" : ""}
              />
            </button>
          </div>

          {/* Filter Pills (All vs My Reports) */}
          <div className="pt-3 pb-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setTicketFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ticketFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              All Campus Tickets
            </button>
            <button
              type="button"
              onClick={() => setTicketFilter("MY")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ticketFilter === "MY"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              My Reports
            </button>
          </div>

          {/* Ticket Feed List */}
          <div className="mt-2 space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {ticketsLoading ? (
              <div className="py-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : ticketsError ? (
              <div className="py-8 px-4 text-center">
                <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                  {ticketsError}
                </p>
                <button
                  type="button"
                  onClick={loadRecentTickets}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-all cursor-pointer inline-flex items-center space-x-1"
                >
                  <RefreshCw size={12} />
                  <span>Retry</span>
                </button>
              </div>
            ) : displayedTickets.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-2.5">
                  <Tag size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No tickets found
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {ticketFilter === "MY"
                    ? "You haven't reported any defect tickets yet."
                    : "No maintenance tickets currently logged in the system."}
                </p>
              </div>
            ) : (
              displayedTickets.map((ticket) => {
                const asset =
                  typeof ticket.assetRef === "object" && ticket.assetRef !== null
                    ? ticket.assetRef
                    : assets.find((a) => a._id === ticket.assetRef) || null;

                const roomObj = asset?.roomref ? roomsMap[asset.roomref] : null;
                const reporterName =
                  typeof ticket.reportedBy === "object"
                    ? ticket.reportedBy?.name || ticket.reportedBy?.email?.split("@")[0]
                    : "Faculty Member";

                return (
                  <div
                    key={ticket._id}
                    className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all space-y-2"
                  >
                    {/* Top Row: Asset & Status Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <Boxes size={14} className="text-indigo-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {asset?.assetTagId || "Asset"}
                        </span>
                        {asset?.category && (
                          <span className="text-[11px] text-slate-400 truncate">
                            • {asset.category}
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          ticket.status === "Dispatched"
                            ? "bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30"
                            : ticket.status === "Closed"
                            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                            : "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    {/* Room & Severity Badges */}
                    <div className="flex items-center justify-between text-xs">
                      {roomObj ? (
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                          <Building size={12} className="text-slate-400" />
                          <span>
                            Room {roomObj.roomNumber} ({roomObj.block})
                          </span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Campus Facility</span>
                      )}

                      {/* Severity Pill */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1 ${
                          ticket.severity === "Critical"
                            ? "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30"
                            : "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                        }`}
                      >
                        {ticket.severity === "Critical" ? (
                          <AlertTriangle size={10} className="shrink-0" />
                        ) : (
                          <Clock size={10} className="shrink-0" />
                        )}
                        <span>{ticket.severity}</span>
                      </span>
                    </div>

                    {/* Description Preview */}
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {ticket.description}
                    </p>

                    {/* Footer: Date & Reporter */}
                    <div className="pt-1.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                      <div className="flex items-center space-x-1">
                        <Calendar size={11} />
                        <span>
                          {ticket.createdAt
                            ? new Date(ticket.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <UserIcon size={11} />
                        <span className="truncate max-w-[120px]">{reporterName}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareTakerReport;
