import { useEffect, useState } from "react";
import { API_BASE, HistoryItem } from "../lib/types";

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/history`);
      if (!res.ok) throw new Error("Could not load history");
      
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      // Intercept the specific network error for better UX
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError("Cannot connect to the server. It might be waking up from sleep mode—please wait 30 seconds and refresh.");
      } else {
        setError(err instanceof Error ? err.message : "Could not load history");
      }
      setHistory([]); // Guarantee array fallback so the UI never crashes
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/history/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setHistory((prev) => prev.filter((h) => h._id !== id));
    } catch {
      setError("Could not delete that video — try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return { history, loading, error, deletingId, load, remove };
}