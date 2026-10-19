import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Boxes,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  RotateCw,
  X,
  CheckCircle2,
  AlertCircle,
  Upload,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { getRooms, createRoom, getAssets } from "../../services/infraService";
import { getTickets } from "../../services/ticketService";

const HodDashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [assetsCount, setAssetsCount] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("ALL");

  // Add Room Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [formData, setFormData] = useState({
    roomNumber: "",
    block: "",
    floor: "",
    department: "",
  });

  // Initial data loading on mount
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [roomsRes, ticketsRes, assetsRes] = await Promise.allSettled([
          getRooms(),
          getTickets(),
          getAssets(),
        ]);

        if (ignore) return;

        let roomsData = [];
        let ticketsData = [];
        let fetchErrors = [];

        // 1. Process Rooms
        if (roomsRes.status === "fulfilled" && roomsRes.value) {
          const val = roomsRes.value;
          roomsData = Array.isArray(val) ? val : val.rooms || [];
          setRooms(roomsData);
        } else {
          fetchErrors.push("Failed to load rooms.");
        }

        // 2. Process Tickets
        if (ticketsRes.status === "fulfilled" && ticketsRes.value) {
          const val = ticketsRes.value;
          ticketsData = Array.isArray(val) ? val : val.tickets || [];
          setTickets(ticketsData);
        } else {
          fetchErrors.push("Failed to load tickets.");
        }

        // 3. Process Assets
        if (assetsRes.status === "fulfilled" && assetsRes.value) {
          const val = assetsRes.value;
          const assetList = Array.isArray(val) ? val : val.assets || [];
          setAssetsCount(assetList.length);
        } else {
          setAssetsCount(null);
        }

        if (fetchErrors.length === 2) {
          setError("Unable to connect to the server. Please check your backend connection and retry.");
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
        if (!ignore) {
          setError("An unexpected error occurred while loading dashboard statistics.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  // Explicit refresh handler triggered by user interaction
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const [roomsRes, ticketsRes, assetsRes] = await Promise.allSettled([
        getRooms(),
        getTickets(),
        getAssets(),
      ]);

      if (roomsRes.status === "fulfilled" && roomsRes.value) {
        const val = roomsRes.value;
        setRooms(Array.isArray(val) ? val : val.rooms || []);
      }

      if (ticketsRes.status === "fulfilled" && ticketsRes.value) {
        const val = ticketsRes.value;
        setTickets(Array.isArray(val) ? val : val.tickets || []);
      }

      if (assetsRes.status === "fulfilled" && assetsRes.value) {
        const val = assetsRes.value;
        const assetList = Array.isArray(val) ? val : val.assets || [];
        setAssetsCount(assetList.length);
      } else {
        setAssetsCount(null);
      }
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Dynamic Metrics Calculation
  const totalRooms = rooms.length;

  const activeTickets = useMemo(() => {
    return tickets.filter((t) => t.status && t.status !== "Closed");
  }, [tickets]);

  const activeTicketsCount = activeTickets.length;

  const criticalTicketsCount = useMemo(() => {
    return activeTickets.filter((t) => t.severity === "Critical").length;
  }, [activeTickets]);

  const routineTicketsCount = activeTicketsCount - criticalTicketsCount;

  // Extract unique blocks from real data
  const uniqueBlocks = useMemo(() => {
    const blocks = new Set(rooms.map((r) => r.block).filter(Boolean));
    return Array.from(blocks).sort();
  }, [rooms]);

  // Combined Search and Block Filtering
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // 1. Block Filter
      if (selectedBlock !== "ALL" && room.block?.toLowerCase() !== selectedBlock.toLowerCase()) {
        return false;
      }

      // 2. Search query filter
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const roomNum = (room.roomNumber || "").toLowerCase();
      const dept = (room.department || "").toLowerCase();
      const block = (room.block || "").toLowerCase();
      const floor = (room.floor || "").toLowerCase();

      return (
        roomNum.includes(q) ||
        dept.includes(q) ||
        block.includes(q) ||
        floor.includes(q)
      );
    });
  }, [rooms, selectedBlock, searchQuery]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedBlock("ALL");
  };

  // Handle Add Room Form Submission
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setModalError("");
    setModalSuccess("");

    if (!formData.roomNumber.trim()) {
      setModalError("Room number is required.");
      return;
    }
    if (!formData.block.trim()) {
      setModalError("Block is required (e.g. A, B, C).");
      return;
    }
    if (!formData.floor.trim()) {
      setModalError("Floor is required (e.g. 1, 2, Ground).");
      return;
    }
    if (!formData.department.trim()) {
      setModalError("Department is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createRoom({
        roomNumber: formData.roomNumber.trim(),
        block: formData.block.trim(),
        floor: formData.floor.trim(),
        department: formData.department.trim(),
      });

      setModalSuccess("Room successfully created!");
      setFormData({ roomNumber: "", block: "", floor: "", department: "" });

      // Refresh list to show newly created room in table & cards
      await refreshData();

      setTimeout(() => {
        setModalOpen(false);
        setModalSuccess("");
      }, 1000);
    } catch (err) {
      console.error("Failed to create room:", err);
      setModalError(
        err.response?.data?.message || err.message || "Failed to create room. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-7 transition-colors">
      {/* Top Header / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Campus Infrastructure Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time status of physical campus spaces, maintenance alerts, and facility allocations.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Refresh Button */}
          <button
            onClick={() => refreshData()}
            disabled={refreshing || loading}
            title="Refresh statistics"
            className="p-2.5 rounded-xl bg-white dark:bg-[#131B2A]/80 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            aria-label="Refresh dashboard data"
          >
            <RotateCw size={17} className={refreshing ? "animate-spin text-indigo-500" : ""} />
          </button>

          {/* Bulk CSV Ingestion Link */}
          <Link
            to="/hod/ingestion"
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
          >
            <Upload size={16} />
            <span>Bulk Upload</span>
          </Link>

          {/* Add Room Button */}
          <button
            onClick={() => {
              setModalOpen(true);
              setModalError("");
              setModalSuccess("");
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner with Retry */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-start justify-between gap-3 text-sm text-red-800 dark:text-red-300 shadow-sm"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle size={19} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to load dashboard data</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => refreshData()}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all cursor-pointer shrink-0 shadow-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. SUMMARY CARDS ROW                                      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {/* Card 1: Total Rooms */}
        <div className="rounded-2xl bg-white/95 dark:bg-[#131B2A]/70 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl p-6 shadow-lg dark:shadow-2xl relative overflow-hidden transition-all group hover:border-indigo-300 dark:hover:border-indigo-500/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Rooms
              </p>
              <div className="mt-2.5 flex items-baseline space-x-2">
                {loading ? (
                  <div className="h-9 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                ) : (
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {totalRooms}
                  </span>
                )}
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  spaces
                </span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0">
              <Building2 size={24} />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {uniqueBlocks.length > 0
                ? `${uniqueBlocks.length} ${uniqueBlocks.length === 1 ? "Block" : "Blocks"} Registered`
                : "Campus Facilities"}
            </span>
            <span className="inline-flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 font-semibold">
              <Layers size={13} />
              <span>Audited</span>
            </span>
          </div>
        </div>

        {/* Card 2: Total Assets */}
        <div className="rounded-2xl bg-white/95 dark:bg-[#131B2A]/70 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl p-6 shadow-lg dark:shadow-2xl relative overflow-hidden transition-all group hover:border-cyan-300 dark:hover:border-cyan-500/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Assets
              </p>
              <div className="mt-2.5 flex items-baseline space-x-2">
                {loading ? (
                  <div className="h-9 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                ) : assetsCount !== null ? (
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {assetsCount}
                  </span>
                ) : (
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 dark:text-slate-500 tracking-tight">
                    —
                  </span>
                )}
                {assetsCount !== null && (
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    items
                  </span>
                )}
              </div>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-100 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm shrink-0">
              <Boxes size={24} />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[170px]" title="Endpoint not supported on server">
              {assetsCount !== null ? "Inventory tracked" : "Inventory API pending"}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {assetsCount !== null ? "Live" : "Unavailable"}
            </span>
          </div>
        </div>

        {/* Card 3: Active Tickets (Amber warning styling matching reference) */}
        <div className="rounded-2xl bg-white/95 dark:bg-[#131B2A]/70 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl p-6 shadow-lg dark:shadow-2xl relative overflow-hidden transition-all group hover:border-amber-300 dark:hover:border-amber-500/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Tickets
              </p>
              <div className="mt-2.5 flex items-baseline space-x-2">
                {loading ? (
                  <div className="h-9 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                ) : (
                  <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                    {activeTicketsCount}
                  </span>
                )}
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  pending
                </span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm shrink-0">
              <AlertTriangle size={24} />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {criticalTicketsCount > 0 ? (
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  {criticalTicketsCount} Critical attention
                </span>
              ) : (
                `${routineTicketsCount} Routine tasks`
              )}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
              Action Required
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CAMPUS ROOMS OVERVIEW SECTION                         */}
      {/* ======================================================== */}
      <div className="rounded-2xl bg-white/95 dark:bg-[#131B2A]/70 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl shadow-lg dark:shadow-2xl overflow-hidden transition-all">
        {/* Section Header & Search/Filters Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Campus Rooms Overview
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  {filteredRooms.length} {filteredRooms.length === 1 ? "Room" : "Rooms"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Filter and inspect room numbers, building blocks, floors, and departmental allocations.
              </p>
            </div>

            {/* Sparkle decorative element */}
            <div className="hidden sm:flex items-center space-x-1 text-indigo-500/60 dark:text-indigo-400/50">
              <Sparkles size={16} />
              <span className="text-xs font-medium">Audited Facilities</span>
            </div>
          </div>

          {/* Search Input & Block Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by room number, department, block, or floor..."
                className="w-full bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/60 rounded-xl pl-9 pr-9 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                aria-label="Search rooms"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  aria-label="Clear search query"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Block Filter Dropdown */}
            <div className="relative min-w-[170px]">
              <div className="relative">
                <Filter
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <select
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/60 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
                  aria-label="Filter rooms by block"
                >
                  <option value="ALL">All Blocks</option>
                  {uniqueBlocks.map((block) => (
                    <option key={block} value={block}>
                      Block {block}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <span className="text-xs">▼</span>
                </div>
              </div>
            </div>

            {/* Clear Filters Button (conditional) */}
            {(searchQuery || selectedBlock !== "ALL") && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shrink-0"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            /* Skeleton Loading State */
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            /* Empty State: No Rooms Registered at all */
            <div className="py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-3.5 shadow-sm">
                <Building2 size={26} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                No Campus Rooms Registered Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Get started by creating your first room or import records instantly using bulk CSV ingestion.
              </p>
              <div className="mt-5 flex items-center justify-center space-x-3">
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Add Room
                </button>
                <Link
                  to="/hod/ingestion"
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                >
                  Bulk Upload CSV
                </Link>
              </div>
            </div>
          ) : filteredRooms.length === 0 ? (
            /* Empty State: Search / Filter produced 0 matches */
            <div className="py-14 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Search size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                No Matching Rooms Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                No records matched your search query{" "}
                {searchQuery && <span className="font-semibold text-slate-700 dark:text-slate-300">"{searchQuery}"</span>}{" "}
                {selectedBlock !== "ALL" && (
                  <span>
                    in <span className="font-semibold text-slate-700 dark:text-slate-300">Block {selectedBlock}</span>
                  </span>
                )}
                . Try adjusting your query or resetting the filters.
              </p>
              <button
                onClick={handleClearFilters}
                className="mt-4 px-4 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            /* Rooms Table Displaying Real API Fields */
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/75 dark:bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th scope="col" className="py-3.5 px-6">
                    Room Number
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Block
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Floor
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Department
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Registered On
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {filteredRooms.map((room) => (
                  <tr
                    key={room._id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-150"
                  >
                    {/* Room Number */}
                    <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 text-xs font-bold">
                          {room.roomNumber?.slice(0, 3)}
                        </div>
                        <span>Room {room.roomNumber}</span>
                      </div>
                    </td>

                    {/* Block */}
                    <td className="py-4 px-6">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        Block {room.block}
                      </span>
                    </td>

                    {/* Floor */}
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium">
                      Floor {room.floor}
                    </td>

                    {/* Department */}
                    <td className="py-4 px-6 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[240px]">
                      {room.department}
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-6 text-xs text-slate-400 dark:text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <Calendar size={13} className="shrink-0" />
                        <span>
                          {room.createdAt
                            ? new Date(room.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. ADD ROOM MODAL DIALOG (Using Real POST /api/rooms)     */}
      {/* ======================================================== */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-room-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl relative">
            {/* Close Button */}
            <button
              onClick={() => {
                if (!isSubmitting) setModalOpen(false);
              }}
              disabled={isSubmitting}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <h3 id="add-room-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  Add New Campus Room
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Register a physical room into the audit directory.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300 text-xs font-medium flex items-center space-x-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Success Message */}
            {modalSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateRoom} className="space-y-4">
              {/* Room Number & Floor */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="roomNumber"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Room Number *
                  </label>
                  <input
                    id="roomNumber"
                    name="roomNumber"
                    type="text"
                    required
                    value={formData.roomNumber}
                    onChange={handleFormChange}
                    placeholder="e.g. 104"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="floor"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Floor *
                  </label>
                  <input
                    id="floor"
                    name="floor"
                    type="text"
                    required
                    value={formData.floor}
                    onChange={handleFormChange}
                    placeholder="e.g. 1"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Block */}
              <div>
                <label
                  htmlFor="block"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Block Identifier *
                </label>
                <input
                  id="block"
                  name="block"
                  type="text"
                  required
                  value={formData.block}
                  onChange={handleFormChange}
                  placeholder="e.g. A, B, or Main"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Department */}
              <div>
                <label
                  htmlFor="department"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Department / Allocation *
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  required
                  value={formData.department}
                  onChange={handleFormChange}
                  placeholder="e.g. Information Technology"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Room</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodDashboard;
