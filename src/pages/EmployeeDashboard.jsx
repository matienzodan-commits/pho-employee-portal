import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";

const OFFICE_TIME_IN = "08:00:00";
const OFFICE_TIME_OUT = "17:00:00";

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("attendance");
  const [todayRecord, setTodayRecord] = useState(null);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const qrRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      // 🛠️ INAYOS: Hinahanap na si Clark gamit ang login email (Case-Insensitive)
      const { data: emp } = await supabase
        .from("employees")
        .select("*")
        .ilike("email", user.email)
        .single();

      setEmployee(emp);

      if (emp) {
        const today = new Date().toLocaleDateString("en-CA");

        const { data: att } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", emp.employee_id)
          .order("date", { ascending: false });

        setAttendance(att || []);

        const todayAtt = (att || []).find(a => a.date === today);
        setTodayRecord(todayAtt || null);

        const { data: leaves } = await supabase
          .from("leave_applications")
          .select("*")
          .eq("employee_id", emp.employee_id)
          .order("created_at", { ascending: false });

        setLeaveApplications(leaves || []);
      }

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleTimeIn = async () => {
    if (!employee) return;
    const now = new Date();
    const today = now.toLocaleDateString("en-CA");
    const timeNow = now.toTimeString().split(" ")[0];

    const officeIn = new Date(`${today}T${OFFICE_TIME_IN}`);
    const lateMs = now - officeIn;
    const lateMinutes = lateMs > 0 ? Math.floor(lateMs / 60000) : 0;

    const { error } = await supabase
      .from("attendance")
      .insert([{
        employee_id: employee.employee_id,
        date: today,
        day_type: "Regular",
        shift: "(08:00-17:00)",
        time_in: timeNow,
        basic_hours: 0,
        late_minutes: lateMinutes,
        late_hours: parseFloat((lateMinutes / 60).toFixed(2)),
      }]);

    if (!error) {
      alert(lateMinutes > 0
        ? `✅ Time In recorded! You are ${lateMinutes} minute(s) late.`
        : `✅ Time In recorded! You are on time.`
      );
      fetchEmployeeData();
    } else {
      alert("Error: " + error.message);
    }
  };

  const handleTimeOut = async () => {
    if (!todayRecord) {
      alert("No Time In record found for today!");
      return;
    }

    const now = new Date();
    const today = now.toLocaleDateString("en-CA");
    const timeNow = now.toTimeString().split(" ")[0];

    const officeOut = new Date(`${today}T${OFFICE_TIME_OUT}`);
    const undertimeMs = officeOut - now;
    const undertimeMinutes = undertimeMs > 0 ? Math.floor(undertimeMs / 60000) : 0;

    const timeInDate = new Date(`${today}T${todayRecord.time_in}`);
    const workedMs = now - timeInDate;
    const basicHours = parseFloat((workedMs / 3600000).toFixed(2));

    const { error } = await supabase
      .from("attendance")
      .update({
        time_out: timeNow,
        basic_hours: basicHours > 8 ? 8 : basicHours,
        excess_hours: basicHours > 8 ? parseFloat((basicHours - 8).toFixed(2)) : 0,
        undertime_minutes: undertimeMinutes,
        undertime_hours: parseFloat((undertimeMinutes / 60).toFixed(2)),
      })
      .eq("id", todayRecord.id);

    if (!error) {
      alert(undertimeMinutes > 0
        ? `✅ Time Out recorded! You have ${undertimeMinutes} minute(s) undertime.`
        : `✅ Time Out recorded! Good job completing your shift.`
      );
      fetchEmployeeData();
    } else {
      alert("Error: " + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadge = (row) => {
    const badges = [];
    if (row.late_minutes > 0) badges.push({ label: `🔴 Late ${row.late_minutes} min`, color: "#c0392b" });
    if (row.undertime_minutes > 0) badges.push({ label: `🟠 Undertime ${row.undertime_minutes} min`, color: "#e65100" });
    if (row.leave_type) badges.push({ label: `🔵 ${row.leave_type}`, color: "#1565c0" });
    if (badges.length === 0 && row.time_in && row.time_out) badges.push({ label: "🟢 Complete", color: "#2e7d32" });
    return badges;
  };

  const totalLateMinutes = attendance.reduce((sum, a) => sum + (a.late_minutes || 0), 0);
  const totalLeaveHours = attendance.reduce((sum, a) => sum + (a.leave_hours || 0), 0);
  const today = new Date().toLocaleDateString("en-CA");

  if (loading) return (
    <div style={styles.loadingScreen}>
      <div style={styles.loadingText}>Loading...</div>
    </div>
  );

  return (
    <div style={styles.wrapper}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoCircle}>PHO</div>
          <div>
            <div style={styles.headerTitle}>PHO Employee Portal</div>
            {/* 🛠️ INAYOS: Sumasalo kung first_name o full_name ang column sa database */}
            <div style={styles.headerSub}>Welcome, {employee?.first_name || employee?.full_name || "Employee"}!</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <img
            src="/gobyernong_solusyon.png"
            alt="Gobyernong May Solusyon"
            style={styles.headerLogo}
          />
          <button
            onClick={handleLogout}
            onMouseEnter={() => setHoveredBtn("logout")}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              ...styles.logoutBtn,
              background: hoveredBtn === "logout" ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.2)",
              transform: hoveredBtn === "logout" ? "scale(1.05)" : "scale(1)",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* NAV */}
      <div style={styles.nav}>
        {["attendance", "leaves", "payslip"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            onMouseEnter={() => setHoveredBtn(`nav-${tab}`)}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              ...styles.navBtn,
              ...(activeTab === tab ? styles.navBtnActive : {}),
              ...(hoveredBtn === `nav-${tab}` && activeTab !== tab ? { color: "white", background: "rgba(255,255,255,0.08)" } : {})
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.content}>

        {/* SUMMARY CARDS */}
        <div style={styles.cardsRow}>
          {[
            { icon: "📋", label: "Leave Taken", value: totalLeaveHours.toFixed(1), sub: "Total leave hours used", id: "leave" },
            { icon: "⚠️", label: "Total Lates", value: totalLateMinutes, sub: "minutes total", id: "late", color: totalLateMinutes > 0 ? "#c0392b" : "#8B0000" },
            { icon: "📅", label: "Leave Credits", value: employee?.leave_credits || 0, sub: "days available", id: "credits" },
          ].map(card => (
            <div
              key={card.id}
              onMouseEnter={() => setHoveredBtn(`card-${card.id}`)}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                ...styles.card,
                transform: hoveredBtn === `card-${card.id}` ? "translateY(-4px)" : "translateY(0)",
                boxShadow: hoveredBtn === `card-${card.id}` ? "0 8px 20px rgba(0,0,0,0.12)" : "0 4px 12px rgba(0,0,0,0.05)",
                transition: "all 0.25s ease",
              }}
            >
              <div style={styles.cardIcon}>{card.icon}</div>
              <div style={styles.cardLabel}>{card.label}</div>
              <div style={{ ...styles.cardValue, color: card.color || "#8B0000" }}>{card.value}</div>
              <div style={styles.cardSub}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div style={styles.tableContainer}>
            <div style={styles.tableHeader}>
              <h2 style={styles.tableTitle}>Attendance Logs</h2>
              <div style={{ display: "flex", gap: "12px" }}>
                {!todayRecord ? (
                  <button
                    onClick={handleTimeIn}
                    onMouseEnter={() => setHoveredBtn("timein")}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{
                      ...styles.timeInBtn,
                      background: hoveredBtn === "timein" ? "#1b5e20" : "#2e7d32",
                      transform: hoveredBtn === "timein" ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    🕒 Time In
                  </button>
                ) : !todayRecord.time_out ? (
                  <button
                    onClick={handleTimeOut}
                    onMouseEnter={() => setHoveredBtn("timeout")}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{
                      ...styles.timeOutBtn,
                      background: hoveredBtn === "timeout" ? "#0d47a1" : "#1565c0",
                      transform: hoveredBtn === "timeout" ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    🏁 Time Out
                  </button>
                ) : (
                  <span style={styles.completedBadge}>✅ Shift Complete</span>
                )}
              </div>
            </div>

            {/* Today's Status Box */}
            {todayRecord && (
              <div style={styles.todayBox}>
                <strong>Today ({today}):</strong>
                &nbsp; Time In: <strong>{todayRecord.time_in || "—"}</strong>
                &nbsp;|&nbsp; Time Out: <strong>{todayRecord.time_out || "—"}</strong>
                {todayRecord.late_minutes > 0 && (
                  <span style={styles.lateBadge}>🔴 Late: {todayRecord.late_minutes} min</span>
                )}
                {todayRecord.undertime_minutes > 0 && (
                  <span style={styles.undertimeBadge}>🟠 Undertime: {todayRecord.undertime_minutes} min</span>
                )}
              </div>
            )}

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    {["Date", "Day Type", "Shift", "Time In", "Time Out", "Basic", "Excess", "OT", "Late", "Undertime", "Status"].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={styles.noData}>No attendance records found.</td>
                    </tr>
                  ) : (
                    attendance.map((row, i) => (
                      <tr
                        key={i}
                        onMouseEnter={() => setHoveredRow(`att-${i}`)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          ...(i % 2 === 0 ? styles.trEven : styles.trOdd),
                          ...(hoveredRow === `att-${i}` ? styles.trHover : {}),
                        }}
                      >
                        <td style={styles.tdBold}>{row.date}</td>
                        <td style={styles.td}>{row.day_type}</td>
                        <td style={styles.td}>{row.shift}</td>
                        <td style={styles.tdBold}>{row.time_in || "—"}</td>
                        <td style={styles.tdBold}>{row.time_out || "—"}</td>
                        <td style={styles.td}>{row.basic_hours || "—"}</td>
                        <td style={styles.td}>{row.excess_hours || "—"}</td>
                        <td style={styles.td}>{row.overtime_hours || "—"}</td>
                        <td style={{ ...styles.td, color: row.late_minutes > 0 ? "#c0392b" : "#333", fontWeight: row.late_minutes > 0 ? "bold" : "normal" }}>
                          {row.late_minutes > 0 ? `${row.late_minutes} min` : "—"}
                        </td>
                        <td style={{ ...styles.td, color: row.undertime_minutes > 0 ? "#e65100" : "#333", fontWeight: row.undertime_minutes > 0 ? "bold" : "normal" }}>
                          {row.undertime_minutes > 0 ? `${row.undertime_minutes} min` : "—"}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
                            {getStatusBadge(row).map((badge, bi) => (
                              <span key={bi} style={{ ...styles.statusBadge, background: badge.color }}>
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LEAVES TAB */}
        {activeTab === "leaves" && (
          <div style={styles.tableContainer}>
            <div style={styles.tableHeader}>
              <h2 style={styles.tableTitle}>Leave Applications History</h2>
              <button
                onClick={() => navigate("/leave-application")}
                onMouseEnter={() => setHoveredBtn("apply-leave")}
                onMouseLeave={() => setHoveredBtn(null)}
                style={{
                  ...styles.applyBtn,
                  background: hoveredBtn === "apply-leave" ? "#6b0000" : "#8B0000",
                  transform: hoveredBtn === "apply-leave" ? "scale(1.05)" : "scale(1)",
                }}
              >
                + Apply for Leave
              </button>
            </div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    {["Leave Type", "Days", "Dates", "Filed On", "Status", "Remarks"].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaveApplications.length === 0 ? (
                    <tr><td colSpan={6} style={styles.noData}>No leave applications yet.</td></tr>
                  ) : (
                    leaveApplications.map((leave, i) => (
                      <tr
                        key={i}
                        onMouseEnter={() => setHoveredRow(`leave-${i}`)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          ...(i % 2 === 0 ? styles.trEven : styles.trOdd),
                          ...(hoveredRow === `leave-${i}` ? styles.trHover : {}),
                        }}
                      >
                        <td style={styles.tdBold}>{leave.leave_type}</td>
                        <td style={styles.td}>{leave.working_days_applied}</td>
                        <td style={styles.td}>{leave.inclusive_dates}</td>
                        <td style={styles.td}>{leave.date_of_filing}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusBadge,
                            background: leave.status === "Approved" ? "#2e7d32" : leave.status === "Rejected" ? "#c0392b" : "#e65100"
                          }}>
                            {leave.status}
                          </span>
                        </td>
                        <td style={styles.td}>{leave.admin_remarks || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAYSLIP TAB */}
        {activeTab === "payslip" && (
          <div style={styles.tableContainer}>
            <div style={styles.tableHeader}>
              <h2 style={styles.tableTitle}>Payslips</h2>
            </div>
            <div style={styles.noData}>No payslips generated yet.</div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    overflowY: "auto",
    width: "100vw", height: "100vh",
    background: "#f4f6f9",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Segoe UI', sans-serif",
  },
  loadingScreen: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0" },
  loadingText: { fontSize: 24, color: "#8B0000", fontWeight: "bold" },
  header: { background: "#8B0000", padding: "4px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", boxSizing: "border-box" },
  headerLeft: { display: "flex", alignItems: "center", gap: 16 },
  headerRight: { display: "flex", alignItems: "center", gap: 24 },
  headerLogo: { width: "160px", height: "auto", transform: "scale(1.25)", transformOrigin: "right center", objectFit: "contain" },
  logoCircle: { width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "2.5px solid white", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: 16, flexShrink: 0 },
  headerTitle: { color: "white", fontWeight: "bold", fontSize: 22 },
  headerSub: { color: "rgba(255,255,255,0.9)", fontSize: 16, fontWeight: "500" },
  logoutBtn: { color: "white", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 16, fontWeight: "bold", transition: "all 0.2s ease" },
  nav: { background: "#6b0000", display: "flex", gap: 8, padding: "0 24px", width: "100%", boxSizing: "border-box" },
  navBtn: { background: "transparent", color: "rgba(255,255,255,0.7)", border: "none", padding: "16px 24px", cursor: "pointer", fontSize: 18, borderBottom: "4px solid transparent", transition: "all 0.2s ease" },
  navBtnActive: { color: "white", borderBottom: "4px solid white", fontWeight: "bold" },
  content: { padding: "24px", maxWidth: 1400, width: "100%", margin: "0 auto", boxSizing: "border-box" },
  cardsRow: { display: "flex", gap: 16, marginBottom: 24 },
  card: { flex: 1, background: "white", borderRadius: 10, padding: "24px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #e0e0e0", cursor: "default" },
  cardIcon: { fontSize: 36, marginBottom: 8 },
  cardLabel: { fontSize: 16, color: "#444", fontWeight: "bold", marginBottom: 8 },
  cardValue: { fontSize: 42, fontWeight: "bold", color: "#8B0000", marginBottom: 4 },
  cardSub: { fontSize: 14, color: "#777" },
  tableContainer: { background: "white", borderRadius: 10, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.07)", border: "1px solid #e0e0e0" },
  tableHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  tableTitle: { fontSize: 22, fontWeight: "bold", color: "#222", margin: 0 },
  todayBox: { background: "#f8f8f8", border: "1px solid #e0e0e0", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#333", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 },
  lateBadge: { background: "#c0392b", color: "white", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: "bold" },
  undertimeBadge: { background: "#e65100", color: "white", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: "bold" },
  timeInBtn: { color: "white", border: "none", borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontWeight: "bold", fontSize: 16, transition: "all 0.2s ease" },
  timeOutBtn: { color: "white", border: "none", borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontWeight: "bold", fontSize: 16, transition: "all 0.2s ease" },
  completedBadge: { background: "#e8f5e9", color: "#2e7d32", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: "bold", border: "1px solid #c8e6c9" },
  applyBtn: { color: "white", border: "none", borderRadius: 6, padding: "12px 24px", cursor: "pointer", fontSize: 16, fontWeight: "bold", transition: "all 0.2s ease" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 16 },
  thead: { background: "#8B0000" },
  th: { color: "white", padding: "14px 12px", textAlign: "center", fontWeight: "bold", whiteSpace: "nowrap", fontSize: 15 },
  td: { padding: "14px 12px", textAlign: "center", color: "#333", borderBottom: "1px solid #eaeaea" },
  tdBold: { padding: "14px 12px", textAlign: "center", color: "#000", fontWeight: "bold", borderBottom: "1px solid #eaeaea" },
  trEven: { background: "white", transition: "background 0.15s ease" },
  trOdd: { background: "#f9f9f9", transition: "background 0.15s ease" },
  trHover: { background: "#f1f5f9" },
  noData: { textAlign: "center", color: "#666", padding: "50px", fontSize: 18, fontWeight: "500" },
  statusBadge: { color: "white", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: "bold", whiteSpace: "nowrap" },
};