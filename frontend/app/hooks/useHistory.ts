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
      setError(err instanceof Error ? err.message : "Could not load history");
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