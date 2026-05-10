import { useEffect, useMemo, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const severityClassMap = {
  Low: "sev-low",
  Medium: "sev-medium",
  High: "sev-high"
};

function App() {
  const [alerts, setAlerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [exportAll, setExportAll] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
    ip: "192.168.1.100"
  });
  const [xssInput, setXssInput] = useState("");
  const [statusMessage, setStatusMessage] = useState("System ready.");

  async function fetchAlerts() {
    try {
      const response = await fetch(`${API_BASE}/alerts`);
      const data = await response.json();
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
    } catch (error) {
      setStatusMessage("Unable to fetch alerts from backend.");
    }
  }

  useEffect(() => {
    fetchAlerts();
    const timer = setInterval(fetchAlerts, 3000);
    return () => clearInterval(timer);
  }, []);

  async function handleLoginSubmit(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();
      setStatusMessage(data.message || "Login request processed.");
      fetchAlerts();
    } catch (error) {
      setStatusMessage("Login simulation failed. Check backend connection.");
    }
  }

  async function handleXssSubmit(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/xss-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: xssInput })
      });

      const data = await response.json();
      setStatusMessage(data.message || "XSS test completed.");
      fetchAlerts();
    } catch (error) {
      setStatusMessage("XSS simulation failed. Check backend connection.");
    }
  }

  async function handleClearAlerts() {
    try {
      const response = await fetch(`${API_BASE}/alerts`, {
        method: "DELETE"
      });

      const data = await response.json();
      setStatusMessage(data.message || "Alerts cleared.");
      setConfirmClearOpen(false);
      fetchAlerts();
    } catch (error) {
      setStatusMessage("Unable to clear alerts. Check backend connection.");
    }
  }

  function handleExportCsv() {
    const exportSource = exportAll ? sortedAlerts : filteredAlerts;
    const headers = ["Type", "Severity", "Time", "Suggested Action"];
    const rows = exportSource.map((alert) => [
      alert.type,
      alert.severity,
      new Date(alert.timestamp).toISOString(),
      alert.suggestedAction
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `soc-alerts-${new Date().toISOString()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatusMessage(exportAll ? "Exported all alerts to CSV." : "Exported filtered alerts to CSV.");
  }

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    return sortedAlerts.filter((alert) => {
      const matchesSeverity = severityFilter === "All" || alert.severity === severityFilter;
      const text = `${alert.type} ${alert.suggestedAction}`.toLowerCase();
      const matchesText = text.includes(searchTerm.toLowerCase());
      return matchesSeverity && matchesText;
    });
  }, [searchTerm, severityFilter, sortedAlerts]);

  return (
    <div className="app-shell">
      <header className="hero">
        <h1>Mini SOC + Attack Simulation Platform</h1>
        <p>Simulate attacks, detect anomalies, and review security alerts in real time.</p>
      </header>

      <section className="panel-grid">
        <article className="card">
          <h2>Login Attack Simulation</h2>
          <form onSubmit={handleLoginSubmit} className="form-stack">
            <label>
              Username
              <input
                value={loginForm.username}
                onChange={(event) =>
                  setLoginForm((previous) => ({
                    ...previous,
                    username: event.target.value
                  }))
                }
                placeholder="admin"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((previous) => ({
                    ...previous,
                    password: event.target.value
                  }))
                }
                placeholder="password123"
              />
            </label>
            <label>
              Source IP
              <input
                value={loginForm.ip}
                onChange={(event) =>
                  setLoginForm((previous) => ({
                    ...previous,
                    ip: event.target.value
                  }))
                }
                placeholder="192.168.1.100"
              />
            </label>
            <button type="submit">Send Login Attempt</button>
          </form>
        </article>

        <article className="card">
          <h2>XSS Payload Simulation</h2>
          <form onSubmit={handleXssSubmit} className="form-stack">
            <label>
              Test Input
              <textarea
                rows="5"
                value={xssInput}
                onChange={(event) => setXssInput(event.target.value)}
                placeholder="Try: <script>alert('xss')<\/script>"
              />
            </label>
            <button type="submit">Test XSS Input</button>
          </form>
        </article>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <h2>Security Alerts</h2>
          <span className="status">{statusMessage}</span>
        </div>
        <div className="table-actions">
          <label className="export-scope-toggle">
            <input
              type="checkbox"
              checked={exportAll}
              onChange={(event) => setExportAll(event.target.checked)}
            />
            Export all alerts
          </label>
          <button type="button" className="secondary-btn" onClick={handleExportCsv}>
            Export CSV
          </button>
          <button type="button" className="danger-btn" onClick={() => setConfirmClearOpen(true)}>
            Clear Alerts
          </button>
        </div>
        <div className="table-controls">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search alerts by type or action"
          />
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
            <option value="All">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Severity</th>
                <th>Time</th>
                <th>Suggested Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-row">
                    No alerts match the current filters.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={`${alert.id}-${alert.timestamp}`}>
                    <td>{alert.type}</td>
                    <td>
                      <span className={`severity-pill ${severityClassMap[alert.severity] || "sev-low"}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td>{new Date(alert.timestamp).toLocaleString()}</td>
                    <td>{alert.suggestedAction}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {confirmClearOpen ? (
        <div className="modal-overlay" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-clear-title">
            <h3 id="confirm-clear-title">Clear all alerts?</h3>
            <p>This will remove all alerts from the dashboard and backend storage.</p>
            <div className="confirm-actions">
              <button type="button" className="secondary-btn" onClick={() => setConfirmClearOpen(false)}>
                Cancel
              </button>
              <button type="button" className="danger-btn" onClick={handleClearAlerts}>
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;