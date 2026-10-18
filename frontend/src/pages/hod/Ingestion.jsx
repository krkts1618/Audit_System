import { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Download,
} from "lucide-react";
import { uploadCsv, getRooms } from "../../services/infraService";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB backend limit
const STORAGE_KEY = "campus_audit_upload_history";

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
  return (bytes / 1024).toFixed(0) + " KB";
};

const Ingestion = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState({ type: null, message: "" });

  // Purely dynamic history loaded from localStorage
  const [recentUploads, setRecentUploads] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync upload history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentUploads));
    } catch {
      // ignore storage errors
    }
  }, [recentUploads]);

  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return "Please choose a file to upload.";
    if (file.size > MAX_FILE_SIZE) {
      return `File exceeds the 5MB limit (${formatFileSize(file.size)}). Please select a smaller file.`;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return "Only CSV files are allowed.";
    }
    return null;
  };

  const handleDownloadSample = async () => {
    try {
      let roomRef = "6ac4c0a62d63da69e35f4414";
      try {
        const roomsData = await getRooms();
        const roomsList = roomsData?.rooms || roomsData || [];
        if (Array.isArray(roomsList) && roomsList.length > 0 && roomsList[0]._id) {
          roomRef = roomsList[0]._id;
        }
      } catch {
        // Fall back to sample ObjectId
      }

      const csvContent =
        "assetTagId,category,status,roomref\n" +
        `PC-101-01,Computer,Active,${roomRef}\n` +
        `PR-101-02,Projector,Active,${roomRef}\n` +
        `AC-101-03,Air Conditioner,Active,${roomRef}\n`;

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "sample_assets.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to generate sample template:", e);
    }
  };

  const handleFileSelect = (file) => {
    const errorMsg = validateFile(file);
    if (errorMsg) {
      setStatus({ type: "error", message: errorMsg });
      setSelectedFile(null);
      return;
    }
    setStatus({ type: null, message: "" });
    setSelectedFile(file);
    setUploadProgress(0);
    // Trigger quick complete animation from 0% to 100%
    setTimeout(() => {
      setUploadProgress(100);
    }, 60);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setStatus({ type: null, message: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearHistory = () => {
    setRecentUploads([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setStatus({ type: null, message: "" });
    setUploadProgress(0);

    // Dynamic fluid animation ticker moving across
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return 90;
        const step = Math.floor(Math.random() * 14) + 10;
        return Math.min(prev + step, 90);
      });
    }, 110);

    try {
      const response = await uploadCsv(selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Brief delay so the user visibly sees the bar reach 100% completely
      await new Promise((resolve) => setTimeout(resolve, 600));

      const successMsg =
        response?.message || "Assets successfully uploaded!";

      setStatus({
        type: "success",
        message: successMsg,
      });

      // Add dynamic real entry to history
      const newEntry = {
        id: Date.now().toString(),
        name: selectedFile.name,
        date: `Uploaded ${new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} at ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        status: "Completed",
        size: formatFileSize(selectedFile.size),
      };

      setRecentUploads((prev) => [newEntry, ...prev]);
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error("CSV Ingestion Error:", err);
      let errMsg = "Upload failed. Please ensure the CSV matches the required columns (assetTagId, category, status, roomref).";
      if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (typeof err.response?.data === "string" && !err.response.data.includes("<html")) {
        errMsg = err.response.data;
      } else if (err.message) {
        errMsg = err.message;
      }

      setStatus({
        type: "error",
        message: errMsg,
      });

      // Record failed attempt dynamically in history
      const failedEntry = {
        id: Date.now().toString(),
        name: selectedFile.name,
        date: `Failed ${new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} at ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        status: "Failed",
        size: formatFileSize(selectedFile.size),
      };
      setRecentUploads((prev) => [failedEntry, ...prev]);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full space-y-7 transition-colors">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Bulk CSV Ingestion
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload and import multiple room and asset records instantly.
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="relative rounded-2xl bg-white/95 dark:bg-[#131B2A]/70 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl p-6 sm:p-8 shadow-lg dark:shadow-2xl transition-all">
        {/* Subtle decorative sparkle at bottom right matching reference */}
        <div className="absolute -bottom-2 -right-2 text-indigo-400/40 pointer-events-none">
          <Sparkles size={24} />
        </div>

        {/* Dashed Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="Upload CSV file by drag and drop or browsing"
          className={`relative border-2 border-dashed rounded-xl py-12 px-6 sm:px-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/10 scale-[1.005] shadow-glow-indigo"
              : "border-indigo-300 dark:border-indigo-500/30 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/70 dark:bg-transparent hover:bg-indigo-50/30 dark:hover:bg-slate-800/20"
          }`}
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            className="sr-only"
            id="csv-upload-input"
          />

          {/* Ambient Glowing Cloud Icon */}
          <div className="relative mb-4 flex items-center justify-center">
            {/* Glowing Orb in dark mode */}
            <div className="w-24 h-24 rounded-full bg-blue-500/20 dark:bg-blue-500/25 blur-xl absolute pointer-events-none"></div>

            {/* Cloud Icon */}
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-gradient-to-tr dark:from-indigo-500/20 dark:to-blue-500/20 border border-indigo-100 dark:border-white/10 flex items-center justify-center relative z-10 shadow-sm dark:shadow-lg">
              <UploadCloud size={32} className="text-indigo-600 dark:text-white drop-shadow" />
            </div>
          </div>

          {/* Text Instructions */}
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">
            Drag & Drop CSV File Here
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            or{" "}
            <span className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
              browse
            </span>{" "}
            to upload from your computer
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 flex items-center justify-center gap-2 flex-wrap">
            <span>Maximum file size 5MB. CSV format only.</span>
            <span>•</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadSample();
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center space-x-1 cursor-pointer"
            >
              <Download size={13} />
              <span>Download Sample CSV</span>
            </button>
          </p>
        </div>

        {/* Selected File Capsule (matches reference image) */}
        {selectedFile && (
          <div className="mt-5 rounded-lg bg-slate-100 dark:bg-[#0E1522] border border-slate-200 dark:border-white/10 px-4 py-3 relative overflow-hidden flex items-center justify-between shadow-inner">
            {/* File Info */}
            <div className="flex items-center space-x-2.5 text-sm z-10 truncate pr-4">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {selectedFile.name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({formatFileSize(selectedFile.size)})
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                {isUploading
                  ? `Uploading ${uploadProgress}%`
                  : uploadProgress === 100
                  ? "100% Ready"
                  : `${uploadProgress}%`}
              </span>
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={isUploading}
              aria-label="Remove selected file"
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded transition-colors z-10 cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Glowing Accent Progress Bar with Complete Moving Animation */}
            <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-slate-200 dark:bg-slate-800/80 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ease-out relative ${
                  uploadProgress === 100
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                    : "bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_10px_rgba(99,102,241,0.7)]"
                }`}
                style={{ width: `${uploadProgress}%` }}
              >
                {/* Active shimmering light traveling across the bar */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Controls */}
        <div className="mt-5 flex items-center space-x-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="bg-[#10B981] hover:bg-[#059669] text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2 text-sm cursor-pointer"
          >
            {isUploading ? (
              <>
                <svg
                  className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Uploading...</span>
              </>
            ) : (
              <span>Upload Assets</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleRemoveFile}
            disabled={!selectedFile || isUploading}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-[#1E293B]/80 dark:hover:bg-[#334155] dark:text-slate-300 dark:border-slate-700/60 px-5 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Status Alerts */}
        {status.type && (
          <div
            role="alert"
            className={`mt-5 p-3.5 rounded-xl flex items-start space-x-3 text-sm ${
              status.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <p className="font-medium">{status.message}</p>
          </div>
        )}
      </div>

      {/* Recent Uploads Section (Purely Dynamic) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            Recent Uploads
          </h2>
          {recentUploads.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs text-slate-400 hover:text-red-500 flex items-center space-x-1 transition-colors cursor-pointer"
              title="Clear dynamic history"
            >
              <Trash2 size={12} />
              <span>Clear History</span>
            </button>
          )}
        </div>

        <div className="rounded-2xl bg-white/95 dark:bg-[#131B2A]/70 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl p-4 sm:p-5 shadow-lg dark:shadow-xl divide-y divide-slate-100 dark:divide-slate-800/60">
          {recentUploads.length > 0 ? (
            recentUploads.map((item) => (
              <div
                key={item.id}
                className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-4"
              >
                {/* File details */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-400">
                      {item.date} {item.size && `• ${item.size}`}
                    </p>
                  </div>
                </div>

                {/* Status Pill Badge */}
                <div className="shrink-0">
                  {item.status === "Completed" ? (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                      Completed
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            /* Honest Dynamic Empty State */
            <div className="py-8 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto mb-2">
                <FileSpreadsheet size={20} />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No recent uploads yet
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                Dynamic upload records will be tracked and saved here as you import CSV files.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ingestion;
