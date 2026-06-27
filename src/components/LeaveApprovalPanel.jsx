import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { supabase } from "../supabase/supabaseClient";

export default function LeaveApprovalPanel({ leave, onClose, onRefresh }) {
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Leave_Application_${leave?.last_name || leave?.employee_id || "Form"}`,
  });

  const handleUpdateLeave = async (status) => {
    const { error } = await supabase
      .from("leave_applications")
      .update({ status, reviewed_at: new Date() })
      .eq("id", leave.id);

    if (!error) {
      alert(`Leave application ${status} successfully!`);
      if (onRefresh) onRefresh();
      if (onClose) onClose();
    }
  };

  if (!leave) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>

        {/* ACTION BUTTONS - Stuck at top */}
        <div style={styles.actionBar}>
          <button onClick={() => handlePrint()} style={styles.btnPrint}>🖨️ PRINT APPLICATION</button>
          <button onClick={() => handleUpdateLeave("Approved")} style={styles.btnApprove}>✅ Approve</button>
          <button onClick={() => handleUpdateLeave("Rejected")} style={styles.btnReject}>❌ Reject</button>
          <button onClick={onClose} style={styles.btnBack}>← Back</button>
        </div>

        {/* SCROLLABLE INTERIOR PREVIEW */}
        <div style={styles.scrollBody}>
          <div ref={printRef} style={styles.printArea}>

            {/* HEADER */}
            <div style={styles.sealContainer}>
              <img src="/pho-seal.png" alt="Laguna Seal" style={styles.sealImg} />
              <div style={styles.headerText}>
                <div style={{ fontSize: "11pt" }}>Republic of the Philippines</div>
                <div style={{ fontSize: "13pt", fontWeight: "bold" }}>PROVINCIAL GOVERNMENT OF LAGUNA</div>
                <div style={{ fontSize: "11pt" }}>Provincial Health Office</div>
              </div>
              <img src="/pho-seal.png" alt="PHO Seal" style={styles.sealImg} />
            </div>

            {/* MAIN DOCUMENT TABLE */}
            <table style={styles.mainTable}>
              <tbody>
                <tr>
                  <td colSpan={2} style={{ ...styles.td, textAlign: "center", fontWeight: "bold", fontSize: "13pt", padding: "12px 8px" }}>
                    APPLICATION FOR LEAVE
                  </td>
                </tr>

                {/* Employee Details */}
                <tr>
                  <td colSpan={2} style={styles.td}>
                    <strong>OFFICE/DEPARTMENT:</strong> {leave.office_department || "PROVINCIAL HEALTH OFFICE"}<br />
                    <strong>NAME:</strong> {leave.last_name}, {leave.first_name} {leave.middle_initial || ""}<br />
                    <strong>POSITION:</strong> {leave.position || "N/A"}<br />
                    <strong>MONTHLY SALARY:</strong> ₱{leave.monthly_salary || "0.00"}<br />
                    <strong>TYPE OF LEAVE:</strong> {leave.leave_type?.toUpperCase()}<br />
                    <strong>DETAILS:</strong> {leave.leave_details || "—"}<br />
                    <strong>INCLUSIVE DATES:</strong> {leave.inclusive_dates} ({leave.working_days_applied} day/s)<br />
                    <strong>COMMUTATION:</strong> {leave.commutation || "—"}
                  </td>
                </tr>

                {/* Section 7 Header */}
                <tr>
                  <td colSpan={2} style={{ ...styles.td, background: "#eee", fontWeight: "bold" }}>
                    7. DETAILS OF ACTION ON APPLICATION
                  </td>
                </tr>

                {/* 7A and 7B */}
                <tr>
                  <td style={{ ...styles.td, width: "50%" }}>
                    <strong>7.A CERTIFICATION OF LEAVE CREDITS</strong><br />
                    As of: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    <table style={styles.creditsTable}>
                      <thead>
                        <tr>
                          <th style={styles.creditsTh}></th>
                          <th style={styles.creditsTh}>Vacation</th>
                          <th style={styles.creditsTh}>Sick</th>
                          <th style={styles.creditsTh}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={styles.creditsTd}>Total Earned</td>
                          <td style={styles.creditsTd}>&nbsp;</td>
                          <td style={styles.creditsTd}>&nbsp;</td>
                          <td style={styles.creditsTd}>&nbsp;</td>
                        </tr>
                        <tr>
                          <td style={styles.creditsTd}>Less Leave</td>
                          <td style={styles.creditsTd}>&nbsp;</td>
                          <td style={styles.creditsTd}>&nbsp;</td>
                          <td style={styles.creditsTd}>&nbsp;</td>
                        </tr>
                        <tr>
                          <td style={styles.creditsTd}>Balance</td>
                          <td style={styles.creditsTd}>&nbsp;</td>
                          <td style={styles.creditsTd}>&nbsp;</td>
                          <td style={styles.creditsTd}>&nbsp;</td>
                        </tr>
                      </tbody>
                    </table>
                    <br />
                    <div style={{ textAlign: "center", marginTop: "10px" }}>
                      <strong>ODESSA S. DE LEON, MPA</strong><br />
                      Administrative Officer V
                    </div>
                  </td>
                  <td style={{ ...styles.td, width: "50%" }}>
                    <strong>7.B RECOMMENDATION</strong>
                    <div style={{ marginTop: 10 }}>
                      <span style={styles.checkbox}></span> For Approval
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <span style={styles.checkbox}></span> For Disapproval due to:
                    </div>
                    <div style={styles.signatureLine}></div>
                    <div style={{ ...styles.signatureLine, marginTop: 5 }}></div>
                    <div style={{ textAlign: "center", marginTop: "25px" }}>
                      <strong>JOSE ODILON R. INONCILLO, MD, RN, MAN</strong><br />
                      Provincial Health Officer II
                    </div>
                  </td>
                </tr>

                {/* 7C and 7D */}
                <tr>
                  <td style={styles.td}>
                    <strong>7.C APPROVED FOR:</strong><br />
                    __________ days with pay<br />
                    __________ days without pay<br />
                    __________ others (Specify)
                  </td>
                  <td style={styles.td}>
                    <strong>7.D DISAPPROVED DUE TO:</strong><br />
                    <div style={{ height: 30, borderBottom: "1px solid #000" }}></div>
                    <div style={{ height: 20, borderBottom: "1px solid #000", marginTop: 5 }}></div>
                  </td>
                </tr>

                {/* Attested By */}
                <tr>
                  <td colSpan={2} style={styles.td}>
                    <strong>ATTESTED BY:</strong><br /><br />
                    <strong>MS. LEAH TERESA R. JAVIER</strong><br />
                    PROV'L GOVT. DEPT. HEAD PHRMO
                  </td>
                </tr>

                {/* Governor */}
                <tr>
                  <td colSpan={2} style={{ ...styles.td, textAlign: "center", padding: "20px 8px" }}>
                    <strong>HON. MARISOL ARAGONES SAMPELO</strong><br />
                    Governor
                  </td>
                </tr>
              </tbody>
            </table>

          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: "20px",
  },
  container: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: "850px",
    borderRadius: "8px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    maxHeight: "90vh",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
  },
  actionBar: {
    backgroundColor: "#1a1a1a",
    padding: "12px 20px",
    display: "flex",
    gap: "10px",
    flexShrink: 0,
    borderBottom: "1px solid #333",
  },
  scrollBody: {
    overflowY: "auto",
    flexGrow: 1,
    backgroundColor: "#525659",
    display: "flex",
    justifyContent: "center",
    padding: "20px",
  },
  printArea: {
    padding: "15mm",
    fontFamily: "Arial, sans-serif",
    color: "#000",
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: "210mm", 
    boxSizing: "border-box",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  },
  btnPrint: { backgroundColor: "#4a4a4a", color: "white", border: "none", borderRadius: 6, padding: "10px 16px", cursor: "pointer", fontWeight: "bold", fontSize: 13 },
  btnApprove: { backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 6, padding: "10px 16px", cursor: "pointer", fontWeight: "bold", fontSize: 13 },
  btnReject: { backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: 6, padding: "10px 16px", cursor: "pointer", fontWeight: "bold", fontSize: 13 },
  btnBack: { backgroundColor: "#9B111E", color: "white", border: "none", borderRadius: 6, padding: "10px 16px", cursor: "pointer", fontWeight: "bold", fontSize: 13 },
  sealContainer: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #000", paddingBottom: 8, marginBottom: 12 },
  sealImg: { width: 65, height: 65, objectFit: "contain" },
  headerText: { textAlign: "center", flexGrow: 1, color: "#000" },
  mainTable: { width: "100%", borderCollapse: "collapse", border: "2px solid #000" },
  td: { border: "1px solid #000", padding: "6px 8px", verticalAlign: "top", fontSize: "10pt", color: "#000", lineHeight: "1.5" },
  creditsTable: { width: "100%", borderCollapse: "collapse", marginTop: 6 },
  creditsTh: { border: "1px solid #000", padding: 4, textAlign: "center", backgroundColor: "#f5f5f5", fontWeight: "bold", fontSize: "9pt" },
  creditsTd: { border: "1px solid #000", padding: 4, textAlign: "center", fontSize: "9pt" },
  checkbox: { display: "inline-block", width: 13, height: 13, border: "1px solid #000", marginRight: 5, verticalAlign: "middle" },
  signatureLine: { borderBottom: "1px solid #000", height: 16 },
};