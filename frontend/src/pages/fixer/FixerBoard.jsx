import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCw,
  Search,
  X,
  Building,
  Boxes,
  Calendar,
  User as UserIcon,
  Eye,
  Check,
  Inbox,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { getTickets, updateTicketStatus } from "../../services/ticketService";
import { getRooms } from "../../services/infraService";

const FixerBoard = () => {
  // Data states
  const [tickets, setTickets] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatingTicketId, setUpdatingTicketId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [blockFilter, setBlockFilter] = useState("ALL");

  // Inspect detail modal state
  const [inspectingTicket, setInspectingTicket] = useState(null);

  // Load initial data (tickets + rooms)
  const loadBoardData = useCallback(async () => {
    setError(null);
    try {
      const [ticketsRes, roomsRes] = await Promise.allSettled([
        getTickets(),
        getRooms(),
      ]);

      if (roomsRes.status === "fulfilled" && roomsRes.value) {
        const val = roomsRes.value;
        const list = Array.isArray(val) ? val : val.rooms || [];
        setRooms(list);
      }

      if (ticketsRes.status === "fulfilled" && ticketsRes.value) {
        const val = ticketsRes.value;
        const list = Array.isArray(val) ? val : val.tickets || [];
        setTickets(list);
      } else if (ticketsRes.status === "rejected") {
        throw new Error(
          ticketsRes.reason?.response?.data?.message ||
            ticketsRes.reason?.message ||
            "Failed to load tickets from the maintenance registry."
        );
      }
    } catch (err) {
      console.error("Failed to load Kanban board data:", err);
      setError(err.message || "Failed to connect to the maintenance server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Mount effect
  useEffect(() => {
    let ignore = false;

    async function init() {
      if (!ignore) {
        await loadBoardData();
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, [loadBoardData]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    setActionSuccess(null);
    setActionError(null);
    await loadBoardData();
  };

  // Build room lookup map
  const roomsMap = useMemo(() => {
    const map = {};
    rooms.forEach((r) => {
      if (r && r._id) {
        map[r._id] = r;
      }
    });
    return map;
  }, [rooms]);

  // Extract unique blocks for filter dropdown
  const availableBlocks = useMemo(() => {
    const set = new Set();
    rooms.forEach((r) => {
      if (r?.block) set.add(r.block);
    });
    return Array.from(set).sort();
  }, [rooms]);

  // Filtered tickets based on search, severity, and block
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const assetCode = (
          ticket.assetRef?.assetTagId ||
          ticket.assetRef?.assetCode ||
          ""
        ).toLowerCase();
        const assetName = (
          ticket.assetRef?.category ||
          ticket.assetRef?.name ||
          ""
        ).toLowerCase();
        const desc = (ticket.description || "").toLowerCase();
        const ticketId = (ticket._id || "").toLowerCase();

        const room = ticket.assetRef?.roomref
          ? roomsMap[ticket.assetRef.roomref]
          : null;
        const roomNum = room?.roomNumber ? String(room.roomNumber).toLowerCase() : "";
        const block = room?.block ? String(room.block).toLowerCase() : "";
        const dept = room?.department ? String(room.department).toLowerCase() : "";
        const roomLabel = `room ${roomNum}`.toLowerCase();

        const matchesSearch =
          assetCode.includes(q) ||
          assetName.includes(q) ||
          desc.includes(q) ||
          ticketId.includes(q) ||
          roomNum.includes(q) ||
          roomLabel.includes(q) ||
          block.includes(q) ||
          dept.includes(q);

        if (!matchesSearch) return false;
      }

      // 2. Severity Filter
      if (severityFilter !== "ALL") {
        if (ticket.severity !== severityFilter) return false;
      }

      // 3. Block Filter
      if (blockFilter !== "ALL") {
        const room = ticket.assetRef?.roomref
          ? roomsMap[ticket.assetRef.roomref]
          : null;
        if (room?.block !== blockFilter) return false;
      }

      return true;
    });
  }, [tickets, searchQuery, severityFilter, blockFilter, roomsMap]);

  // Group filtered tickets into 3 Kanban columns
  // Column 1: OPEN (status === "Open")
  const openTickets = useMemo(() => {
    return filteredTickets.filter((t) => t.status === "Open");
  }, [filteredTickets]);

  // Column 2: DISPATCHED (status === "Dispatched")
  const dispatchedTickets = useMemo(() => {
    return filteredTickets.filter((t) => t.status === "Dispatched");
  }, [filteredTickets]);

  // Column 3: RESOLVED (status === "Closed" or "Pending Verification")
  const resolvedTickets = useMemo(() => {
    return filteredTickets.filter(
      (t) => t.status === "Closed" || t.status === "Pending Verification"
    );
  }, [filteredTickets]);

  // Handle status update
  const handleUpdateStatus = async (ticketId, newStatus) => {
    if (updatingTicketId) return;

    setUpdatingTicketId(ticketId);
    setActionError(null);
    setActionSuccess(null);

    const targetTicket = tickets.find((t) => t._id === ticketId);
    const assetTag = targetTicket?.assetRef?.assetTagId || "Ticket";

    try {
      const res = await updateTicketStatus(ticketId, newStatus);

      // Confirm update on client state
      setTickets((prev) =>
        prev.map((t) => {
          if (t._id === ticketId) {
            return {
              ...t,
              status: newStatus,
              updatedAt: res?.ticket?.updatedAt || new Date().toISOString(),
            };
          }
          return t;
        })
      );

      setActionSuccess(
        `Ticket for ${assetTag} successfully transitioned to "${newStatus}".`
      );

      // If viewing in inspect modal, update the open modal data
      if (inspectingTicket && inspectingTicket._id === ticketId) {
        setInspectingTicket((prev) => ({
          ...prev,
          status: newStatus,
          updatedAt: res?.ticket?.updatedAt || new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.error("Status update error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to update ticket status on server.";
      setActionError(`Could not update ${assetTag}: ${msg}`);
    } finally {
      setUpdatingTicketId(null);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setSeverityFilter("ALL");
    setBlockFilter("ALL");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    severityFilter !== "ALL" ||
    blockFilter !== "ALL";

  return (
    <div className="w-full space-y-6 transition-colors">
      {/* ======================================================== */}
      {/* 1. PAGE HEADER & STATS SUMMARY                           */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Wrench size={18} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Maintenance Kanban Board
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track, prioritize, and resolve campus maintenance requests.
          </p>
        </div>

        {/* Global Summary Stats & Refresh */}
        <div className="flex items-center space-x-2 sm:space-x-3 self-start sm:self-auto">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>{openTickets.length} Open</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>{dispatchedTickets.length} Dispatched</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{resolvedTickets.length} Resolved</span>
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh maintenance board"
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5 shadow-xs"
          >
            <RotateCw
              size={15}
              className={refreshing ? "animate-spin text-indigo-500" : ""}
            />
            <span className="text-xs font-semibold hidden md:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Toast / Feedback Alerts */}
      {actionSuccess && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-center justify-between animate-in fade-in duration-200"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:opacity-75 cursor-pointer ml-3"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300 text-xs sm:text-sm font-medium flex items-center justify-between animate-in fade-in duration-200"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-600 dark:text-red-400 hover:opacity-75 cursor-pointer ml-3"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SEARCH & FILTER TOOLBAR                               */}
      {/* ======================================================== */}
      <div className="rounded-2xl bg-white/95 dark:bg-[#131B2A]/70 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl p-4 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search asset, room, block, or defect details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/60 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex items-center space-x-2.5">
          {/* Severity Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-400 hidden sm:inline">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="Routine">Routine</option>
            </select>
          </div>

          {/* Block Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-400 hidden sm:inline">Block:</span>
            <select
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Blocks</option>
              {availableBlocks.map((b) => (
                <option key={b} value={b}>
                  Block {b}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1.5 cursor-pointer shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Board Area (Loading & Error States) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((col) => (
            <div
              key={col}
              className="rounded-2xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
            >
              <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-32 bg-slate-200 dark:bg-slate-800/60 rounded-xl animate-pulse" />
              <div className="h-32 bg-slate-200 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#131B2A]/70 border border-red-200 dark:border-red-500/30">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Failed to Load Kanban Board
          </h2>
          <p className="text-xs text-red-600 dark:text-red-400 max-w-md mx-auto mt-1 mb-4">
            {error}
          </p>
          <button
            onClick={loadBoardData}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : (
        /* ======================================================== */
        /* 3. THREE-COLUMN KANBAN BOARD                             */
        /* ======================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {/* ---------------------------------------------------- */}
          {/* COLUMN 1: OPEN                                       */}
          {/* ---------------------------------------------------- */}
          <div className="rounded-2xl bg-slate-100/70 dark:bg-[#0F172A]/70 border border-slate-200/90 dark:border-slate-800/80 p-4 sm:p-5 flex flex-col transition-all">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Open
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                  {openTickets.length}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Awaiting Dispatch
              </span>
            </div>

            {/* Column Cards Feed */}
            <div className="space-y-3.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
              {openTickets.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Inbox size={20} className="mx-auto mb-1.5 opacity-40" />
                  <p className="font-medium">No open tickets</p>
                  <p className="text-[11px] mt-0.5">
                    {hasActiveFilters
                      ? "No tickets match your filters."
                      : "All defect reports have been dispatched."}
                  </p>
                </div>
              ) : (
                openTickets.map((ticket) => (
                  <TicketCard
                    key={ticket._id}
                    ticket={ticket}
                    roomsMap={roomsMap}
                    isUpdating={updatingTicketId === ticket._id}
                    onUpdateStatus={handleUpdateStatus}
                    onInspect={setInspectingTicket}
                    column="OPEN"
                  />
                ))
              )}
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* COLUMN 2: DISPATCHED                                 */}
          {/* ---------------------------------------------------- */}
          <div className="rounded-2xl bg-slate-100/70 dark:bg-[#0F172A]/70 border border-slate-200/90 dark:border-slate-800/80 p-4 sm:p-5 flex flex-col transition-all">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Dispatched
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                  {dispatchedTickets.length}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Work In Progress
              </span>
            </div>

            {/* Column Cards Feed */}
            <div className="space-y-3.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
              {dispatchedTickets.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Wrench size={20} className="mx-auto mb-1.5 opacity-40" />
                  <p className="font-medium">No tickets in dispatch</p>
                  <p className="text-[11px] mt-0.5">
                    {hasActiveFilters
                      ? "No tickets match your filters."
                      : "Dispatch an open ticket to begin work."}
                  </p>
                </div>
              ) : (
                dispatchedTickets.map((ticket) => (
                  <TicketCard
                    key={ticket._id}
                    ticket={ticket}
                    roomsMap={roomsMap}
                    isUpdating={updatingTicketId === ticket._id}
                    onUpdateStatus={handleUpdateStatus}
                    onInspect={setInspectingTicket}
                    column="DISPATCHED"
                  />
                ))
              )}
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* COLUMN 3: RESOLVED                                   */}
          {/* ---------------------------------------------------- */}
          <div className="rounded-2xl bg-slate-100/70 dark:bg-[#0F172A]/70 border border-slate-200/90 dark:border-slate-800/80 p-4 sm:p-5 flex flex-col transition-all">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Resolved
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                  {resolvedTickets.length}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Closed & Verified
              </span>
            </div>

            {/* Column Cards Feed */}
            <div className="space-y-3.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
              {resolvedTickets.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <CheckCircle2 size={20} className="mx-auto mb-1.5 opacity-40" />
                  <p className="font-medium">No resolved tickets</p>
                  <p className="text-[11px] mt-0.5">
                    {hasActiveFilters
                      ? "No tickets match your filters."
                      : "Resolved work orders will accumulate here."}
                  </p>
                </div>
              ) : (
                resolvedTickets.map((ticket) => (
                  <TicketCard
                    key={ticket._id}
                    ticket={ticket}
                    roomsMap={roomsMap}
                    isUpdating={updatingTicketId === ticket._id}
                    onUpdateStatus={handleUpdateStatus}
                    onInspect={setInspectingTicket}
                    column="RESOLVED"
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TICKET INSPECT DETAIL MODAL                           */}
      {/* ======================================================== */}
      {inspectingTicket && (
        <TicketDetailModal
          ticket={inspectingTicket}
          roomsMap={roomsMap}
          isUpdating={updatingTicketId === inspectingTicket._id}
          onUpdateStatus={handleUpdateStatus}
          onClose={() => setInspectingTicket(null)}
        />
      )}
    </div>
  );
};

// ==============================================================
// SUB-COMPONENT: KANBAN TICKET CARD
// ==============================================================
const TicketCard = ({
  ticket,
  roomsMap,
  isUpdating,
  onUpdateStatus,
  onInspect,
  column,
}) => {
  const asset = ticket.assetRef;
  const roomObj = asset?.roomref ? roomsMap[asset.roomref] : null;

  const isCritical = ticket.severity === "Critical";
  const isPendingVerification = ticket.status === "Pending Verification";

  const reporterName =
    typeof ticket.reportedBy === "object"
      ? ticket.reportedBy?.name || ticket.reportedBy?.email?.split("@")[0]
      : "Faculty Member";

  const formattedDate = ticket.createdAt
    ? new Date(ticket.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <div className="rounded-xl bg-white dark:bg-[#1E293B]/90 border border-slate-200/90 dark:border-slate-700/60 p-4 shadow-xs hover:shadow-md dark:shadow-none hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all space-y-3 relative overflow-hidden group">
      {/* Top Accent for Critical */}
      {isCritical && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
      )}

      {/* Row 1: Asset Identifier & Severity Badges */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 truncate">
            {asset?.assetTagId || "ASSET"}
          </span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            {asset?.category || "Equipment"}
          </span>
        </div>

        {/* Severity Badge */}
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1 shrink-0 ${
            isCritical
              ? "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30"
              : "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
          }`}
        >
          {isCritical ? (
            <AlertTriangle size={11} className="shrink-0" />
          ) : (
            <Clock size={11} className="shrink-0" />
          )}
          <span>{ticket.severity}</span>
        </span>
      </div>

      {/* Row 2: Location Details */}
      <div className="flex items-center text-xs text-slate-600 dark:text-slate-400 space-x-1.5">
        <Building size={13} className="text-slate-400 shrink-0" />
        {roomObj ? (
          <span className="truncate">
            Room {roomObj.roomNumber} (Block {roomObj.block}) • Floor {roomObj.floor}
          </span>
        ) : (
          <span className="text-slate-400">Campus Facility</span>
        )}
      </div>

      {/* Row 3: Description Preview */}
      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed">
        {ticket.description}
      </p>

      {/* Status Alert if Pending Verification */}
      {isPendingVerification && (
        <div className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 text-[11px] text-purple-700 dark:text-purple-300 font-medium">
          Pending HOD / Caretaker Verification
        </div>
      )}

      {/* Row 4: Meta info (Reporter & Date) */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <div className="flex items-center space-x-1 truncate max-w-[130px]">
          <UserIcon size={12} className="shrink-0" />
          <span className="truncate">{reporterName}</span>
        </div>

        <div className="flex items-center space-x-1">
          <Calendar size={12} />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Row 5: Action Controls */}
      <div className="pt-1 flex items-center justify-between gap-2">
        {/* Quick action buttons depending on column */}
        {column === "OPEN" && (
          <button
            onClick={() => onUpdateStatus(ticket._id, "Dispatched")}
            disabled={isUpdating}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1 shadow-xs"
          >
            {isUpdating ? (
              <RotateCw size={12} className="animate-spin" />
            ) : (
              <>
                <span>Dispatch Work</span>
                <ArrowRight size={12} />
              </>
            )}
          </button>
        )}

        {column === "DISPATCHED" && (
          <div className="flex-1 flex items-center space-x-1.5">
            <button
              onClick={() => onUpdateStatus(ticket._id, "Closed")}
              disabled={isUpdating}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1 shadow-xs"
            >
              {isUpdating ? (
                <RotateCw size={12} className="animate-spin" />
              ) : (
                <>
                  <Check size={12} />
                  <span>Mark Resolved</span>
                </>
              )}
            </button>

            <button
              onClick={() => onUpdateStatus(ticket._id, "Open")}
              disabled={isUpdating}
              title="Revert back to Open"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft size={12} />
            </button>
          </div>
        )}

        {column === "RESOLVED" && (
          <button
            onClick={() => onUpdateStatus(ticket._id, "Open")}
            disabled={isUpdating}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1"
          >
            {isUpdating ? (
              <RotateCw size={12} className="animate-spin" />
            ) : (
              <>
                <RotateCw size={12} />
                <span>Reopen Ticket</span>
              </>
            )}
          </button>
        )}

        {/* View Details / Inspect Modal Trigger */}
        <button
          onClick={() => onInspect(ticket)}
          title="Inspect full ticket details"
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
        >
          <Eye size={15} />
        </button>
      </div>
    </div>
  );
};

// ==============================================================
// SUB-COMPONENT: TICKET DETAIL MODAL
// ==============================================================
const TicketDetailModal = ({
  ticket,
  roomsMap,
  isUpdating,
  onUpdateStatus,
  onClose,
}) => {
  const asset = ticket.assetRef;
  const roomObj = asset?.roomref ? roomsMap[asset.roomref] : null;

  const isCritical = ticket.severity === "Critical";

  const reporterName =
    typeof ticket.reportedBy === "object"
      ? ticket.reportedBy?.name || ticket.reportedBy?.email?.split("@")[0]
      : "Faculty Member";

  const reporterEmail =
    typeof ticket.reportedBy === "object" ? ticket.reportedBy?.email : "";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#131B2A] border border-slate-200 dark:border-white/10 shadow-2xl p-6 space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
              <Boxes size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ticket Details
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                ID: {ticket._id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 text-xs">
          {/* Status & Severity Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">
                Current Status
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {ticket.status}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">
                Severity
              </span>
              <span
                className={`font-bold ${
                  isCritical
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {ticket.severity}
              </span>
            </div>
          </div>

          {/* Asset & Room Details */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 dark:text-white">
                {asset?.assetTagId || "Asset"} — {asset?.category || "Equipment"}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                {asset?.status || "Active"}
              </span>
            </div>

            {roomObj && (
              <p className="text-slate-600 dark:text-slate-400">
                Allocated to <strong>Room {roomObj.roomNumber}</strong>, Block {roomObj.block} (Floor {roomObj.floor} • {roomObj.department})
              </p>
            )}
          </div>

          {/* Full Description */}
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Issue Description
            </span>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

          {/* Reporter & Timestamps */}
          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <div>
              <span className="block text-slate-400">Reported By:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {reporterName}
              </span>
              {reporterEmail && (
                <span className="block text-[10px] text-slate-400 truncate">
                  {reporterEmail}
                </span>
              )}
            </div>

            <div>
              <span className="block text-slate-400">Created At:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {ticket.createdAt
                  ? new Date(ticket.createdAt).toLocaleString("en-US")
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions: Status Transition Controls */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Set Status:
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onUpdateStatus(ticket._id, "Open")}
              disabled={isUpdating || ticket.status === "Open"}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ticket.status === "Open"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              Open
            </button>

            <button
              onClick={() => onUpdateStatus(ticket._id, "Dispatched")}
              disabled={isUpdating || ticket.status === "Dispatched"}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ticket.status === "Dispatched"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              Dispatched
            </button>

            <button
              onClick={() => onUpdateStatus(ticket._id, "Pending Verification")}
              disabled={isUpdating || ticket.status === "Pending Verification"}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ticket.status === "Pending Verification"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              Verification
            </button>

            <button
              onClick={() => onUpdateStatus(ticket._id, "Closed")}
              disabled={isUpdating || ticket.status === "Closed"}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ticket.status === "Closed"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              Closed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixerBoard;
