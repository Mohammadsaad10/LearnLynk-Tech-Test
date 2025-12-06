import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// Updated Type to match DB Schema (related_id instead of application_id)
type Task = {
  id: string;
  title: string;      
  type: string;
  status: string;
  related_id: string;  
  due_at: string;
};

export default function TodayDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchTasks() {
    setLoading(true);
    setError(null);

    try {
      // TODO:
      // - Query tasks that are due today and not completed
      // - Use supabase.from("tasks").select(...)
      // - You can do date filtering in SQL or client-side

      // Example:
      // const { data, error } = await supabase
      //   .from("tasks")
      //   .select("*")
      //   .eq("status", "open");

      // 1. Calculate Today's Range
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // 2. Query Supabase
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .gte("due_at", startOfDay.toISOString()) // Due on or after start of today
        .lte("due_at", endOfDay.toISOString())   // Due on or before end of today
        .order("due_at", { ascending: true });

      if (error) throw error;

      setTasks(data || []);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function markComplete(id: string) {
    try {
      // TODO:
      // - Update task.status to 'completed'
      // - Re-fetch tasks or update state optimistically

      // 3. Optimistic Update (Update UI immediately)
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "completed" } : t))
      );

      // 4. Update Database
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", id);

      if (error) throw error;
      
      // Re-fetch to ensure sync 
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      alert("Failed to update task");
      fetchTasks(); // Revert on error
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) return <div style={{ padding: "2rem" }}>Loading tasks...</div>;
  if (error) return <div style={{ padding: "2rem", color: "red" }}>{error}</div>;

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>Today&apos;s Tasks</h1>
      
      {tasks.length === 0 ? (
        <p>No tasks due today 🎉</p>
      ) : (
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ccc" }}>
              <th style={{ padding: "8px" }}>Title</th> 
              <th style={{ padding: "8px" }}>Type</th>
              <th style={{ padding: "8px" }}>App ID</th> 
              <th style={{ padding: "8px" }}>Due At</th> 
              <th style={{ padding: "8px" }}>Status</th> 
              <th style={{ padding: "8px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px" }}>{t.title || "(No Title)"}</td>
                <td style={{ padding: "8px" }}>{t.type}</td>
                <td style={{ padding: "8px" }}>
                   {/* Displaying UUID mostly, real apps would join 'applications' table */}
                  {t.related_id}
                </td>
                <td style={{ padding: "8px" }}>
                  {new Date(t.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: "8px" }}>
                    <span style={{ 
                        color: t.status === 'completed' ? 'green' : 'orange',
                        fontWeight: 'bold' 
                    }}>
                        {t.status}
                    </span>
                </td>
                <td style={{ padding: "8px" }}>
                  {t.status !== "completed" && (
                    <button 
                        onClick={() => markComplete(t.id)}
                        style={{ cursor: "pointer", padding: "4px 8px" }}
                    >
                      Mark Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
