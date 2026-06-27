import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";
import LeaveApprovalPanel from "../components/LeaveApprovalPanel";

export default function AdminDashboard() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("leaves");
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [viewingLeave, setViewingLeave] = useState(null);
  const [remarks, setRemarks] = useState("");
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [editingEmp, setEditingEmp] = useState(null);
  const [newCreditValue, setNewCreditValue] = useState(0);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  // Monthly Report States
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showReport, setShowReport] = useState(false);

  // Leave Filter States
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("All");
  const [leaveSearchTerm, setLeaveSearchTerm] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("All");
  const [leaveDateFrom, setLeaveDateFrom] = useState("");
  const [leaveDateTo, setLeaveDateTo] = useState("");

  // NEW: Employee Modal States
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empModalMode, setEmpModalMode] = useState("add"); // "add" or "edit"
  const [selectedEmp, setSelectedEmp] = useState(null);
const [empForm, setEmpForm] = useState({
     full_name: "", last_name: "", first_name: "",
     middle_initial: "", username: "", email: "", role: "employee",
     department: "", position: "", monthly_salary: "", leave_credits: 15,
   });

  // NEW: QR Modal State
  const [qrEmployee, setQrEmployee] = useState(null);
  const qrPrintRef = useRef(null);

  const handleQrPrint = useReactToPrint({
    contentRef: qrPrintRef,
    documentTitle: `QR_${qrEmployee?.employee_id || "employee"}`,
  });

  const printRef = useRef(null);
  const reportPrintRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Leave_Application_${selectedLeave?.last_name || "Form"}`,
  });

  const handleReportPrint = useReactToPrint({
    contentRef: reportPrintRef,
    documentTitle: `Monthly_Attendance_Report_${selectedMonth}`,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: leaveData } = await supabase.from("leave_applications").select("*").order("created_at", { ascending: false });
    const { data: empData } = await supabase.from("employees").select("*").order("created_at", { ascending: false });
    const { data: attData } = await supabase.from("attendance").select("*, employees (full_name)").order("date", { ascending: false });
    setLeaves(leaveData || []);
    setEmployees(empData || []);
    setAttendanceLogs(attData || []);
    setLoading(false);
  };

  const getMonthlySummary = () => {
    const filtered = attendanceLogs.filter(log => log.date?.startsWith(selectedMonth));
    const summary = {};
    filtered.forEach(log => {
      const name = log.employees?.full_name || "Unknown";
      if (!summary[name]) {
        summary[name] = { totalLate: 0, totalUndertime: 0, totalOvertime: 0, totalLeave: 0, days: 0 };
      }
      summary[name].totalLate += parseFloat(log.late_hours || 0);
      summary[name].totalUndertime += parseFloat(log.undertime_hours || 0);
      summary[name].totalOvertime += parseFloat(log.overtime_hours || 0);
      summary[name].totalLeave += parseFloat(log.leave_hours || 0);
      summary[name].days += 1;
    });
    return Object.entries(summary).map(([name, data]) => ({ name, ...data }));
  };

  const updateCredits = async (id) => {
    const { error } = await supabase.from("employees").update({ leave_credits: newCreditValue }).eq("id", id);
    if (error) alert("Error: " + error.message);
    else { alert("Credits updated!"); setEditingEmp(null); fetchData(); }
  };

  // NEW: Add Employee
  const handleAddEmployee = async () => {
    if (!empForm.username || !empForm.email) {
      alert("Please fill in Username and Email.");
      return;
    }
    try {
      // Insert employee record
      const { error } = await supabase.from("employees").insert([{
        full_name: `${empForm.first_name} ${empForm.last_name}`.trim(),
        last_name: empForm.last_name,
        first_name: empForm.first_name,
        middle_initial: empForm.middle_initial,
        username: empForm.username,
        email: empForm.email,
        role: empForm.role,
        department: empForm.department,
        position: empForm.position,
        monthly_salary: parseFloat(empForm.monthly_salary) || 0,
        leave_credits: parseFloat(empForm.leave_credits) || 15,
      }]);

      if (error) throw error;
      alert(`✅ Employee added! To allow login, go to Supabase Auth > Add User with email: ${empForm.email}`);
      setShowEmpModal(false);
      resetEmpForm();
      fetchData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // NEW: Edit Employee
  const handleEditEmployee = async () => {
    try {
      const { error } = await supabase.from("employees").update({
        full_name: `${empForm.first_name} ${empForm.last_name}`.trim(),
        last_name: empForm.last_name,
        first_name: empForm.first_name,
        middle_initial: empForm.middle_initial,
        username: empForm.username,
        email: empForm.email,
        role: empForm.role,
        department: empForm.department,
        position: empForm.position,
        monthly_salary: parseFloat(empForm.monthly_salary) || 0,
        leave_credits: parseFloat(empForm.leave_credits) || 15,
      }).eq("id", selectedEmp.id);

      if (error) throw error;
      alert("✅ Employee updated successfully!");
      setShowEmpModal(false);
      resetEmpForm();
      fetchData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // NEW: Delete Employee
  const handleDeleteEmployee = async (emp) => {
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete ${emp.full_name}?\n\nThis will permanently remove their record. This cannot be undone.`
    );
    if (!confirmed) return;

    const { error } = await supabase.from("employees").delete().eq("id", emp.id);
    if (error) alert("Error: " + error.message);
    else { alert("✅ Employee deleted."); fetchData(); }
  };

  const resetEmpForm = () => {
    setEmpForm({
      full_name: "", last_name: "", first_name: "",
      middle_initial: "", username: "", email: "", role: "employee",
      department: "", position: "", monthly_salary: "", leave_credits: 15,
    });
    setSelectedEmp(null);
  };

  const openAddModal = () => {
    resetEmpForm();
    setEmpModalMode("add");
    setShowEmpModal(true);
  };

  const openEditModal = (emp) => {
    setEmpForm({
      full_name: emp.full_name || "",
      last_name: emp.last_name || "",
      first_name: emp.first_name || "",
      middle_initial: emp.middle_initial || "",
      username: emp.username || "",
      email: emp.email || "",
      role: emp.role || "employee",
      department: emp.department || "",
      position: emp.position || "",
      monthly_salary: emp.monthly_salary || "",
      leave_credits: emp.leave_credits || 15,
    });
    setSelectedEmp(emp);
    setEmpModalMode("edit");
    setShowEmpModal(true);
  };

  const handleUpdateLeave = async (id, status) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from("leave_applications")
        .update({ status, admin_remarks: remarks, reviewed_at: new Date() })
        .eq("id", id);
      if (error) throw error;

      if (status === "Approved" && selectedLeave) {
        let start = new Date(selectedLeave.inclusive_dates?.split(" to ")[0] || new Date());
        let end = new Date(selectedLeave.inclusive_dates?.split(" to ")[1] || start);
        const recordsToInsert = [];
        while (start <= end) {
          recordsToInsert.push({
            employee_id: selectedLeave.employee_id,
            date: start.toISOString().split('T')[0],
            day_type: "Regular",
            shift: "Day Shift",
            time_in: "ON LEAVE",
            time_out: "ON LEAVE",
            leave_type: selectedLeave.leave_type,
            leave_hours: 8
          });
          start.setDate(start.getDate() + 1);
        }
        if (recordsToInsert.length > 0) {
          const { error: attInsertError } = await supabase.from("attendance").insert(recordsToInsert);
          if (attInsertError) console.error("Attendance Sync Error:", attInsertError.message);
        }
      }

      alert(`Leave application ${status} successfully!`);
      setSelectedLeave(null);
      setViewingLeave(null);
      setRemarks("");
      fetchData();
    } catch (err) {
      alert("Error updating leave application: " + err.message);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  const getStatusColor = (status) => {
    if (status === "Approved") return "#2e7d32";
    if (status === "Rejected") return "#c0392b";
    return "#e65100";
  };

  const filteredAttendance = attendanceLogs.filter(log => {
    const empName = (log.employees?.full_name || "").toLowerCase();
    const matchesSearch = empName.includes(searchTerm.toLowerCase());
    const matchesDate = filterDate ? log.date === filterDate : true;
    return matchesSearch && matchesDate;
  });

  const leaveTypes = [
    "All", "Vacation Leave", "Mandatory/Forced Leave", "Sick Leave",
    "Maternity Leave", "Paternity Leave", "Special Privilege Leave",
    "Solo Parent Leave", "Study Leave", "10-Day VAWC Leave",
    "Rehabilitation Privilege", "Special Leave Benefits for Women",
    "Special Emergency (Calamity) Leave", "Adoption Leave",
  ];

  const filteredLeaves = leaves.filter(leave => {
    const matchesStatus = leaveStatusFilter === "All" || leave.status === leaveStatusFilter;
    const matchesSearch = leaveSearchTerm === "" ||
      `${leave.first_name} ${leave.last_name}`.toLowerCase().includes(leaveSearchTerm.toLowerCase()) ||
      leave.employee_id?.toLowerCase().includes(leaveSearchTerm.toLowerCase());
    const matchesType = leaveTypeFilter === "All" || leave.leave_type === leaveTypeFilter;
    const matchesFrom = leaveDateFrom === "" || leave.date_of_filing >= leaveDateFrom;
    const matchesTo = leaveDateTo === "" || leave.date_of_filing <= leaveDateTo;
    return matchesStatus && matchesSearch && matchesType && matchesFrom && matchesTo;
  });

  const pendingCount = leaves.filter(l => l.status === "Pending").length;
  const approvedCount = leaves.filter(l => l.status === "Approved").length;
  const rejectedCount = leaves.filter(l => l.status === "Rejected").length;

  const urgentCount = leaves.filter(l => {
    if (l.status !== "Pending") return false;
    const filed = new Date(l.created_at);
    const now = new Date();
    const diffDays = (now - filed) / (1000 * 60 * 60 * 24);
    return diffDays > 3;
  }).length;

  if (loading) return (
    <div style={styles.loadingScreen}>
      <div style={styles.loadingText}>Loading Admin Dashboard...</div>
    </div>
  );

  return (
    <div style={styles.wrapper}>

      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <img src="/pho-seal.png" alt="Seal" style={styles.sealImg} />
          <div>
            <div style={styles.headerTitle}>PHO Admin Portal</div>
            <div style={styles.headerSub}>Provincial Health Office — Admin</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          onMouseEnter={() => setHoveredBtn("logout")}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{ ...styles.logoutBtn, ...(hoveredBtn === "logout" ? { background: "rgba(255,255,255,0.35)", transform: "scale(1.03)" } : {}) }}
        >
          Logout
        </button>
      </div>

      {/* NAV */}
      <div style={styles.nav}>
        {[
          { id: "leaves", label: "Leave Applications" },
          { id: "employees", label: "Employees" },
          { id: "attendance", label: "Attendance Logs" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onMouseEnter={() => setHoveredBtn(`tab-${tab.id}`)}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              ...styles.navBtn,
              ...(activeTab === tab.id ? styles.navBtnActive : {}),
              ...(hoveredBtn === `tab-${tab.id}` && activeTab !== tab.id ? { color: "white", background: "rgba(255,255,255,0.05)" } : {})
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={styles.content}>

        {/* SUMMARY CARDS */}
        <div style={styles.cardsRow}>
          {[
            { id: "pending", icon: "📋", label: "Pending", val: pendingCount, color: "#e65100" },
            { id: "approved", icon: "✅", label: "Approved", val: approvedCount, color: "#2e7d32" },
            { id: "rejected", icon: "❌", label: "Rejected", val: rejectedCount, color: "#c0392b" },
            { id: "total", icon: "👥", label: "Total Employees", val: employees.length, color: "#8B0000" }
          ].map((card) => (
            <div
              key={card.id}
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{ ...styles.card, ...(hoveredCard === card.id ? styles.cardHover : {}) }}
            >
              <div style={styles.cardIcon}>{card.icon}</div>
              <div style={styles.cardLabel}>{card.label}</div>
              <div style={{ ...styles.cardValue, color: card.color }}>{card.val}</div>
            </div>
          ))}
          {urgentCount > 0 && (
            <div
              onMouseEnter={() => setHoveredCard("urgent")}
              onMouseLeave={() => setHoveredCard(null)}
              style={{ ...styles.card, border: "2px solid #c0392b", background: "#fff5f5", ...(hoveredCard === "urgent" ? styles.cardHover : {}) }}
            >
              <div style={styles.cardIcon}>🚨</div>
              <div style={{ ...styles.cardLabel, color: "#c0392b" }}>Urgent</div>
              <div style={{ ...styles.cardValue, color: "#c0392b" }}>{urgentCount}</div>
              <div style={{ ...styles.cardSub, color: "#c0392b" }}>Pending &gt; 3 days</div>
            </div>
          )}
        </div>

        {/* LEAVE APPLICATIONS TAB */}
        {activeTab === "leaves" && (
          <div style={styles.tableContainer}>
            <div style={styles.tableHeader}>
              <h3 style={styles.tableTitle}>Leave Applications</h3>
            </div>
            <div style={styles.statusTabBar}>
              {["All", "Pending", "Approved", "Rejected"].map(status => (
                <button
                  key={status}
                  onClick={() => setLeaveStatusFilter(status)}
                  style={{
                    ...styles.statusTab,
                    ...(leaveStatusFilter === status ? {
                      background: status === "Pending" ? "#e65100" : status === "Approved" ? "#2e7d32" : status === "Rejected" ? "#c0392b" : "#8B0000",
                      color: "white", borderColor: "transparent",
                    } : {})
                  }}
                >
                  {status}
                  <span style={styles.statusTabCount}>
                    {status === "All" ? leaves.length : status === "Pending" ? pendingCount : status === "Approved" ? approvedCount : rejectedCount}
                  </span>
                </button>
              ))}
            </div>
            <div style={styles.leaveFilterBar}>
              <input type="text" placeholder="🔍 Search by name or ID..." value={leaveSearchTerm} onChange={(e) => setLeaveSearchTerm(e.target.value)} style={styles.filterInput} />
              <select value={leaveTypeFilter} onChange={(e) => setLeaveTypeFilter(e.target.value)} style={styles.filterInput}>
                {leaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="date" value={leaveDateFrom} onChange={(e) => setLeaveDateFrom(e.target.value)} style={styles.filterInput} />
              <input type="date" value={leaveDateTo} onChange={(e) => setLeaveDateTo(e.target.value)} style={styles.filterInput} />
              {(leaveSearchTerm || leaveTypeFilter !== "All" || leaveDateFrom || leaveDateTo) && (
                <button onClick={() => { setLeaveSearchTerm(""); setLeaveTypeFilter("All"); setLeaveDateFrom(""); setLeaveDateTo(""); }} style={styles.clearBtn}>Reset</button>
              )}
            </div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    {["Employee ID", "Name", "Leave Type", "Days", "Dates", "Filed On", "Status", "Action"].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.length === 0 ? (
                    <tr><td colSpan={8} style={styles.noData}>No leave applications found.</td></tr>
                  ) : (
                    filteredLeaves.map((leave, i) => {
                      const rowId = `leave-${i}`;
                      const isUrgent = leave.status === "Pending" && ((new Date() - new Date(leave.created_at)) / (1000 * 60 * 60 * 24)) > 3;
                      return (
                        <tr key={i} onMouseEnter={() => setHoveredRow(rowId)} onMouseLeave={() => setHoveredRow(null)}
                          style={{ ...(i % 2 === 0 ? styles.trEven : styles.trOdd), ...(hoveredRow === rowId ? styles.trHover : {}), ...(isUrgent ? { borderLeft: "3px solid #c0392b" } : {}) }}>
                          <td style={styles.td}>{leave.employee_id}{isUrgent && <span style={styles.urgentDot}>🚨</span>}</td>
                          <td style={styles.td}>{leave.first_name} {leave.last_name}</td>
                          <td style={styles.td}>{leave.leave_type}</td>
                          <td style={styles.td}>{leave.working_days_applied}</td>
                          <td style={styles.td}>{leave.inclusive_dates}</td>
                          <td style={styles.td}>{leave.date_of_filing}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.statusBadge, background: getStatusColor(leave.status) }}>{leave.status}</span>
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                              <button onClick={() => setViewingLeave(leave)} onMouseEnter={() => setHoveredBtn(`view-${i}`)} onMouseLeave={() => setHoveredBtn(null)}
                                style={{ ...styles.viewBtn, ...(hoveredBtn === `view-${i}` ? styles.viewBtnHover : {}) }}>👁️ View</button>
                              {leave.status === "Pending" && (
                                <>
                                  <button onClick={() => { setSelectedLeave(leave); setRemarks(""); }} onMouseEnter={() => setHoveredBtn(`review-${i}`)} onMouseLeave={() => setHoveredBtn(null)}
                                    style={{ ...styles.reviewBtn, ...(hoveredBtn === `review-${i}` ? styles.reviewBtnHover : {}) }}>Review</button>
                                  <button onClick={() => { setSelectedLeave(leave); setRemarks(""); handleUpdateLeave(leave.id, "Approved"); }} onMouseEnter={() => setHoveredBtn(`approve-${i}`)} onMouseLeave={() => setHoveredBtn(null)}
                                    style={{ ...styles.quickApproveBtn, ...(hoveredBtn === `approve-${i}` ? { background: "#1b5e20" } : {}) }}>✅</button>
                                  <button onClick={() => { setSelectedLeave(leave); setRemarks(""); handleUpdateLeave(leave.id, "Rejected"); }} onMouseEnter={() => setHoveredBtn(`reject-${i}`)} onMouseLeave={() => setHoveredBtn(null)}
                                    style={{ ...styles.quickRejectBtn, ...(hoveredBtn === `reject-${i}` ? { background: "#7b1a1a" } : {}) }}>❌</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
              Showing {filteredLeaves.length} of {leaves.length} applications
            </div>
          </div>
        )}

        {/* EMPLOYEES TAB */}
        {activeTab === "employees" && (
          <div style={styles.tableContainer}>
            <div style={styles.tableHeader}>
              <h3 style={styles.tableTitle}>Employee List</h3>
              {/* NEW: Add Employee Button */}
              <button
                onClick={openAddModal}
                onMouseEnter={() => setHoveredBtn("add-emp")}
                onMouseLeave={() => setHoveredBtn(null)}
                style={{ ...styles.addEmpBtn, ...(hoveredBtn === "add-emp" ? { background: "#6b0000" } : {}) }}
              >
                + Add Employee
              </button>
            </div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    {["Employee ID", "Full Name", "Department", "Position", "Role", "Leave Credits", "Actions"].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, i) => {
                    const rowId = `emp-${i}`;
                    return (
                      <tr key={i} onMouseEnter={() => setHoveredRow(rowId)} onMouseLeave={() => setHoveredRow(null)}
                        style={{ ...(i % 2 === 0 ? styles.trEven : styles.trOdd), ...(hoveredRow === rowId ? styles.trHover : {}) }}>
                        <td style={styles.td}>{emp.employee_id}</td>
                        <td style={styles.td}>{emp.full_name}</td>
                        <td style={styles.td}>{emp.department}</td>
                        <td style={styles.td}>{emp.position}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.statusBadge, background: emp.role === "admin" ? "#8B0000" : "#1565c0" }}>{emp.role}</span>
                        </td>
                        <td style={styles.td}>{emp.leave_credits}</td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                            {/* Edit */}
                            <button onClick={() => openEditModal(emp)} onMouseEnter={() => setHoveredBtn(`edit-${i}`)} onMouseLeave={() => setHoveredBtn(null)}
                              style={{ ...styles.viewBtn, ...(hoveredBtn === `edit-${i}` ? styles.viewBtnHover : {}) }}>✏️ Edit</button>
                            {/* Edit Credits */}
                            <button onClick={() => { setEditingEmp(emp); setNewCreditValue(emp.leave_credits); }} onMouseEnter={() => setHoveredBtn(`cred-${i}`)} onMouseLeave={() => setHoveredBtn(null)}
                              style={{ ...styles.reviewBtn, ...(hoveredBtn === `cred-${i}` ? styles.reviewBtnHover : {}) }}>📋 Credits</button>
                            {/* QR Code */}
                            <button onClick={() => setQrEmployee(emp)} onMouseEnter={() => setHoveredBtn(`qr-${i}`)} onMouseLeave={() => setHoveredBtn(null)}
                              style={{ ...styles.qrBtn, ...(hoveredBtn === `qr-${i}` ? { background: "#1565c0" } : {}) }}>📱 QR</button>
                            {/* Delete */}
                            <button onClick={() => handleDeleteEmployee(emp)} onMouseEnter={() => setHoveredBtn(`del-${i}`)} onMouseLeave={() => setHoveredBtn(null)}
                              style={{ ...styles.deleteBtn, ...(hoveredBtn === `del-${i}` ? { background: "#7b1a1a" } : {}) }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ATTENDANCE LOGS TAB */}
        {activeTab === "attendance" && (
          <div style={styles.tableContainer}>
            <div style={styles.attendanceFilterHeader}>
              <h3 style={styles.tableTitle}>Employee Attendance Master Logs</h3>
              <div style={styles.filterBar}>
                <input type="text" placeholder="🔍 Search Employee Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.filterInput} />
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={styles.filterInput} />
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={styles.filterInput} />
                <button onClick={() => setShowReport(true)} style={{ ...styles.reviewBtn, padding: "8px 16px", fontSize: 13 }}>📊 Monthly Report</button>
                {(searchTerm || filterDate) && (
                  <button onClick={() => { setSearchTerm(""); setFilterDate(""); }} style={styles.clearBtn}>Reset</button>
                )}
              </div>
            </div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    {["Employee Name", "Date", "Time In", "Time Out", "Late (Hrs)", "Undertime", "Shift/Type"].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.length === 0 ? (
                    <tr><td colSpan={7} style={styles.noData}>No attendance logs match your search.</td></tr>
                  ) : (
                    filteredAttendance.map((log, i) => {
                      const rowId = `att-${i}`;
                      const isLate = log.late_hours > 0;
                      const isUndertime = log.undertime_hours > 0;
                      const isOnLeave = log.time_in === "ON LEAVE";
                      return (
                        <tr key={i} onMouseEnter={() => setHoveredRow(rowId)} onMouseLeave={() => setHoveredRow(null)}
                          style={{ ...(i % 2 === 0 ? styles.trEven : styles.trOdd), ...(hoveredRow === rowId ? styles.trHover : {}) }}>
                          <td style={{ ...styles.td, fontWeight: "600", color: "#1e293b" }}>{log.employees?.full_name || "Unknown Employee"}</td>
                          <td style={styles.td}>{log.date}</td>
                          <td style={{ ...styles.td, fontWeight: "bold", color: isOnLeave ? "#1565c0" : isLate ? "#c0392b" : "#2e7d32" }}>{log.time_in || "—"}</td>
                          <td style={{ ...styles.td, fontWeight: "600" }}>{log.time_out || "—"}</td>
                          <td style={{ ...styles.td, color: isLate ? "#c0392b" : "#334155", fontWeight: isLate ? "bold" : "normal" }}>{isLate ? `${log.late_hours} hr/s` : "—"}</td>
                          <td style={{ ...styles.td, color: isUndertime ? "#e65100" : "#334155", fontWeight: isUndertime ? "bold" : "normal" }}>{isUndertime ? `${log.undertime_hours} hr/s` : "—"}</td>
                          <td style={{ ...styles.td, fontWeight: isOnLeave ? "bold" : "normal", color: isOnLeave ? "#1565c0" : "#334155" }}>
                            {log.leave_type ? `🌴 ${log.leave_type}` : log.day_type || "Regular"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* REVIEW MODAL */}
      {selectedLeave && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Review Leave Application</h3>
            <div style={styles.modalInfoContainer}>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Employee:</span><span>{selectedLeave.first_name} {selectedLeave.last_name}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Leave Type:</span><span>{selectedLeave.leave_type}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Days:</span><span>{selectedLeave.working_days_applied}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Dates:</span><span>{selectedLeave.inclusive_dates}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Details:</span><span>{selectedLeave.leave_details || "—"}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Commutation:</span><span>{selectedLeave.commutation}</span></div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={styles.modalLabel}>Admin Remarks (optional):</label>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter remarks..." style={styles.textarea} rows={3} />
            </div>
            <div style={styles.modalBtns}>
              <button onClick={() => handlePrint()} onMouseEnter={() => setHoveredBtn("m-print")} onMouseLeave={() => setHoveredBtn(null)}
                style={{ ...styles.printBtn, ...(hoveredBtn === "m-print" ? styles.printBtnHover : {}) }}>🖨️ Print Form</button>
              <button onClick={() => handleUpdateLeave(selectedLeave.id, "Approved")} onMouseEnter={() => setHoveredBtn("m-approve")} onMouseLeave={() => setHoveredBtn(null)}
                style={{ ...styles.approveBtn, ...(hoveredBtn === "m-approve" ? styles.approveBtnHover : {}) }}>✅ Approve</button>
              <button onClick={() => handleUpdateLeave(selectedLeave.id, "Rejected")} onMouseEnter={() => setHoveredBtn("m-reject")} onMouseLeave={() => setHoveredBtn(null)}
                style={{ ...styles.rejectBtn, ...(hoveredBtn === "m-reject" ? styles.rejectBtnHover : {}) }}>❌ Reject</button>
              <button onClick={() => setSelectedLeave(null)} onMouseEnter={() => setHoveredBtn("m-cancel")} onMouseLeave={() => setHoveredBtn(null)}
                style={{ ...styles.cancelBtn, ...(hoveredBtn === "m-cancel" ? styles.cancelBtnHover : {}) }}>Cancel</button>
            </div>
          </div>
          <div style={{ display: "none" }}>
            <div ref={printRef}><LeaveApprovalPanel leave={selectedLeave} /></div>
          </div>
        </div>
      )}

      {/* EDIT CREDITS MODAL */}
      {editingEmp && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Update Leave Credits</h3>
            <p style={{ color: "#475569", marginBottom: 12 }}>{editingEmp.full_name}</p>
            <input type="number" value={newCreditValue} onChange={(e) => setNewCreditValue(e.target.value)}
              style={{ ...styles.textarea, resize: "none", height: 44 }} />
            <div style={styles.modalBtns}>
              <button onClick={() => updateCredits(editingEmp.id)} style={styles.approveBtn}>💾 Save</button>
              <button onClick={() => setEditingEmp(null)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT EMPLOYEE MODAL */}
      {showEmpModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, width: 620, maxWidth: "95%", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={styles.modalTitle}>{empModalMode === "add" ? "➕ Add New Employee" : "✏️ Edit Employee"}</h3>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Email", key: "email", disabled: empModalMode === "edit" },
                { label: "Last Name", key: "last_name" },
                { label: "First Name", key: "first_name" },
                { label: "Middle Initial", key: "middle_initial" },
                { label: "Username", key: "username" },
                { label: "Department", key: "department" },
                { label: "Position", key: "position" },
                { label: "Monthly Salary", key: "monthly_salary" },
                { label: "Leave Credits", key: "leave_credits" },
                { label: "Role", key: "role", type: "select" },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: 12, fontWeight: "700", color: "#475569", display: "block", marginBottom: 4 }}>
                    {field.label}
                  </label>
                  {field.type === "select" ? (
                    <select value={empForm.role} onChange={(e) => setEmpForm(prev => ({ ...prev, role: e.target.value }))}
                      style={{ ...styles.textarea, resize: "none", height: 38 }}>
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={empForm[field.key]}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      disabled={field.disabled}
                      style={{ ...styles.textarea, resize: "none", height: 38, opacity: field.disabled ? 0.6 : 1 }}
                    />
                  )}
                </div>
              ))}
            </div>
            {empModalMode === "add" && (
              <div style={{ marginTop: 12, padding: 12, background: "#fff8e1", borderRadius: 8, border: "1px solid #ffe082", fontSize: 12, color: "#6d4c00" }}>
                ⚠️ After adding, you must also create a login account in <strong>Supabase → Authentication → Add User</strong> using the same email and a password.
              </div>
            )}
            <div style={styles.modalBtns}>
              <button onClick={empModalMode === "add" ? handleAddEmployee : handleEditEmployee} style={styles.approveBtn}>
                {empModalMode === "add" ? "➕ Add Employee" : "💾 Save Changes"}
              </button>
              <button onClick={() => { setShowEmpModal(false); resetEmpForm(); }} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {qrEmployee && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, width: 380, textAlign: "center" }}>
            <h3 style={styles.modalTitle}>📱 Employee QR Code</h3>
            <div ref={qrPrintRef} style={{ padding: 20, textAlign: "center" }}>
              <img src="/pho-seal.png" alt="PHO" style={{ width: 50, height: 50, objectFit: "contain", marginBottom: 8 }} />
              <div style={{ fontWeight: "bold", fontSize: 13, color: "#8B0000", marginBottom: 4 }}>PROVINCIAL HEALTH OFFICE</div>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 16 }}>{qrEmployee.full_name}</div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <QRCodeSVG
                  value={qrEmployee.employee_id}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div style={{ fontWeight: "bold", fontSize: 16, color: "#333", letterSpacing: 2 }}>{qrEmployee.employee_id}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{qrEmployee.position} — {qrEmployee.department}</div>
            </div>
            <div style={styles.modalBtns}>
              <button onClick={handleQrPrint} style={styles.approveBtn}>🖨️ Print QR</button>
              <button onClick={() => setQrEmployee(null)} style={styles.cancelBtn}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY REPORT MODAL */}
      {showReport && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, width: 700, maxWidth: "95%" }}>
            <div ref={reportPrintRef} style={{ padding: "10px" }}>
              <div style={{ textAlign: "center", marginBottom: 20, borderBottom: "2px solid #8B0000", paddingBottom: 12 }}>
                <img src="/pho-seal.png" alt="PHO Seal" style={{ width: 60, height: 60, objectFit: "contain" }} />
                <div style={{ fontWeight: "bold", fontSize: 14, color: "#8B0000" }}>PROVINCIAL GOVERNMENT OF LAGUNA</div>
                <div style={{ fontSize: 13 }}>PROVINCIAL HEALTH OFFICE</div>
                <div style={{ fontWeight: "bold", fontSize: 16, marginTop: 8 }}>MONTHLY ATTENDANCE SUMMARY REPORT</div>
                <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                  Month: {new Date(selectedMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#8B0000" }}>
                    <th style={styles.reportTh}>Employee Name</th>
                    <th style={styles.reportTh}>Days Present</th>
                    <th style={styles.reportTh}>Total Late (hrs)</th>
                    <th style={styles.reportTh}>Total Undertime (hrs)</th>
                    <th style={styles.reportTh}>Total Overtime (hrs)</th>
                    <th style={styles.reportTh}>Leave Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {getMonthlySummary().length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 20, color: "#888" }}>No attendance records for this month.</td></tr>
                  ) : (
                    getMonthlySummary().map((item, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                        <td style={styles.reportTd}>{item.name}</td>
                        <td style={styles.reportTd}>{item.days}</td>
                        <td style={{ ...styles.reportTd, color: item.totalLate > 0 ? "#c0392b" : "#334155", fontWeight: item.totalLate > 0 ? "bold" : "normal" }}>{item.totalLate.toFixed(2)}</td>
                        <td style={{ ...styles.reportTd, color: item.totalUndertime > 0 ? "#e65100" : "#334155", fontWeight: item.totalUndertime > 0 ? "bold" : "normal" }}>{item.totalUndertime.toFixed(2)}</td>
                        <td style={{ ...styles.reportTd, color: item.totalOvertime > 0 ? "#2e7d32" : "#334155" }}>{item.totalOvertime.toFixed(2)}</td>
                        <td style={styles.reportTd}>{item.totalLeave.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555" }}>
                <div>Prepared by: _______________________</div>
                <div>Noted by: _______________________</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={handleReportPrint} style={{ ...styles.approveBtn, flex: 1 }}>🖨️ Print / Export PDF</button>
              <button onClick={() => setShowReport(false)} style={{ ...styles.cancelBtn, flex: 1 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* FULL LEAVE DOCUMENT VIEW */}
      {viewingLeave && (
        <LeaveApprovalPanel leave={viewingLeave} onClose={() => setViewingLeave(null)} onRefresh={fetchData} />
      )}

    </div>
  );
}

const styles = {
  wrapper: { minHeight: "100vh", background: "#f5f6f8", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  loadingScreen: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6f8" },
  loadingText: { fontSize: 20, color: "#8B0000", fontWeight: "bold" },
  header: { background: "#8B0000", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  sealImg: { width: 45, height: 45, borderRadius: "50%", objectFit: "cover" },
  headerTitle: { color: "white", fontWeight: "bold", fontSize: 18, letterSpacing: "0.5px" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  logoutBtn: { background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: "500", transition: "all 0.2s ease" },
  nav: { background: "#6b0000", display: "flex", gap: 4, padding: "0 24px", boxShadow: "inset 0 -2px 5px rgba(0,0,0,0.1)" },
  navBtn: { background: "transparent", color: "rgba(255,255,255,0.7)", border: "none", padding: "14px 22px", cursor: "pointer", fontSize: 14, borderBottom: "3px solid transparent", transition: "all 0.2s ease" },
  navBtnActive: { color: "white", borderBottom: "3px solid white", fontWeight: "bold", background: "rgba(255,255,255,0.06)" },
  content: { padding: "28px 24px", maxWidth: 1250, margin: "0 auto" },
  cardsRow: { display: "flex", gap: 18, marginBottom: 28, flexWrap: "wrap" },
  card: { flex: 1, minWidth: 150, background: "white", borderRadius: 12, padding: "22px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.04)", border: "1px solid #eef0f2", transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", transform: "translateY(0)" },
  cardHover: { transform: "translateY(-4px)", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", borderColor: "#d1d5db" },
  cardIcon: { fontSize: 30, marginBottom: 10 },
  cardLabel: { fontSize: 14, color: "#64748b", fontWeight: 600, marginBottom: 6 },
  cardValue: { fontSize: 38, fontWeight: "700" },
  cardSub: { fontSize: 12, color: "#64748b", marginTop: 4 },
  statusTabBar: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  statusTab: { padding: "7px 16px", borderRadius: 20, border: "1.5px solid #cbd5e1", background: "white", color: "#475569", cursor: "pointer", fontSize: 13, fontWeight: "600", transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: 6 },
  statusTabCount: { background: "rgba(0,0,0,0.12)", borderRadius: 10, padding: "1px 7px", fontSize: 11 },
  leaveFilterBar: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" },
  urgentDot: { marginLeft: 4, fontSize: 12 },
  quickApproveBtn: { background: "#2e7d32", color: "white", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 13, fontWeight: "bold", transition: "all 0.15s ease" },
  quickRejectBtn: { background: "#c0392b", color: "white", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 13, fontWeight: "bold", transition: "all 0.15s ease" },
  addEmpBtn: { background: "#8B0000", color: "white", border: "none", borderRadius: 6, padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: "700", transition: "all 0.2s ease" },
  qrBtn: { background: "#1976d2", color: "white", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12.5, fontWeight: "600", transition: "all 0.15s ease" },
  deleteBtn: { background: "#c0392b", color: "white", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 13, fontWeight: "bold", transition: "all 0.15s ease" },
  tableContainer: { background: "white", borderRadius: 12, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid #eef0f2" },
  tableHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  attendanceFilterHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  filterBar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  filterInput: { padding: "8px 14px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13.5, outline: "none", minWidth: 150 },
  clearBtn: { background: "#64748b", color: "white", border: "none", borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: "600" },
  tableTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", margin: 0 },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
  thead: { background: "#8B0000" },
  th: { color: "white", padding: "12px 14px", textAlign: "center", fontWeight: 600, whiteSpace: "nowrap", letterSpacing: "0.3px" },
  td: { padding: "12px 14px", textAlign: "center", color: "#334155", borderBottom: "1px solid #f1f5f9" },
  trEven: { background: "white", transition: "background-color 0.15s ease" },
  trOdd: { background: "#f8fafc", transition: "background-color 0.15s ease" },
  trHover: { background: "#f1f5f9" },
  noData: { textAlign: "center", color: "#64748b", padding: "48px", fontSize: 15 },
  statusBadge: { color: "white", padding: "4px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: "bold", display: "inline-block", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  viewBtn: { background: "#475569", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12.5, fontWeight: "600", transition: "all 0.15s ease" },
  viewBtnHover: { background: "#334155", transform: "scale(1.04)" },
  reviewBtn: { background: "#8B0000", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12.5, fontWeight: "600", transition: "all 0.15s ease" },
  reviewBtnHover: { background: "#6b0000", transform: "scale(1.04)" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, overflowY: "auto", padding: "20px 0" },
  modal: { background: "white", borderRadius: 16, padding: 32, width: 520, maxWidth: "92%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)" },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#8B0000", margin: "0 0 20px 0", textAlign: "center" },
  modalInfoContainer: { background: "#f8fafc", padding: "16px", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 16 },
  modalRow: { display: "flex", gap: 12, marginBottom: 12, fontSize: 14, color: "#334155" },
  modalLabel: { fontWeight: "700", color: "#475569", minWidth: 110 },
  textarea: { width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, marginTop: 8, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" },
  modalBtns: { display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" },
  printBtn: { flex: "1 1 auto", background: "#64748b", color: "white", border: "none", borderRadius: 6, padding: "10px 16px", cursor: "pointer", fontWeight: "bold", fontSize: 13, transition: "all 0.15s ease" },
  printBtnHover: { background: "#475569", transform: "translateY(-1px)" },
  approveBtn: { flex: "1 1 auto", background: "#2e7d32", color: "white", border: "none", borderRadius: 6, padding: "10px 16px", cursor: "pointer", fontWeight: "bold", fontSize: 13, transition: "all 0.15s ease" },
  approveBtnHover: { background: "#1b5e20", transform: "translateY(-1px)" },
  rejectBtn: { flex: "1 1 auto", background: "#c0392b", color: "white", border: "none", borderRadius: 6, padding: "10px 16px", cursor: "pointer", fontWeight: "bold", fontSize: 13, transition: "all 0.15s ease" },
  rejectBtnHover: { background: "#962d22", transform: "translateY(-1px)" },
  cancelBtn: { flex: "1 1 auto", background: "#94a3b8", color: "white", border: "none", borderRadius: 6, padding: "10px 16px", cursor: "pointer", fontWeight: "bold", fontSize: 13, transition: "all 0.15s ease" },
  cancelBtnHover: { background: "#64748b", transform: "translateY(-1px)" },
  reportTh: { color: "white", padding: "10px 12px", textAlign: "center", fontWeight: 600, fontSize: 12 },
  reportTd: { padding: "10px 12px", textAlign: "center", color: "#334155", borderBottom: "1px solid #f1f5f9", fontSize: 13 },
};