import React, { useState, useEffect } from 'react';
import { useAuth } from "./AuthContext";
import { supabase } from '../supabase/supabaseClient';

const LeaveApplication = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    department: '',
    date_of_filing: new Date().toISOString().split('T')[0],
    last_name: '',
    first_name: '',
    mi: '',
    position: '',
    salary: '',
    leave_type: '',
    leave_details_specify: '',
    working_days_applied: 1,
    inclusive_dates: '',
    commutation: 'Not Requested'
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        user_id: user.id,
        last_name: user.last_name || '',
        first_name: user.first_name || '',
        mi: user.middle_initial || '',
        position: user.position || '',
        salary: user.monthly_salary || '',
        department: user.department || '',
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('leave_applications')
        .insert([{
          employee_id: user?.employee_id,
          office_department: formData.department,
          date_of_filing: formData.date_of_filing,
          last_name: formData.last_name,
          first_name: formData.first_name,
          middle_initial: formData.mi,
          position: formData.position,
          monthly_salary: formData.salary,
          leave_type: formData.leave_type,
          leave_details: formData.leave_details_specify,
          working_days_applied: formData.working_days_applied,
          inclusive_dates: formData.inclusive_dates,
          commutation: formData.commutation,
          status: 'Pending'
        }]);

      if (error) throw error;

      alert('Application Form submitted successfully!');
      setFormData(prev => ({
        ...prev,
        leave_type: '',
        leave_details_specify: '',
        working_days_applied: 1,
        inclusive_dates: '',
        commutation: 'Not Requested'
      }));
    } catch (error) {
      console.error('Error submitting leave:', error.message);
      alert('Error submitting application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.body}>

      {/* Header outside the card, like the HTML version */}
      <div style={styles.headerSection}>
        <img src="/pho-seal.png" alt="Laguna Seal" style={styles.sealImg} />
        <div style={styles.headerTextContainer}>
          <div style={{ fontSize: 16 }}>Republic of the Philippines</div>
          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#990000' }}>PROVINCIAL GOVERNMENT OF LAGUNA</div>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>PROVINCIAL HEALTH OFFICE</div>
          <h2 style={styles.h2}>APPLICATION FOR LEAVE</h2>
        </div>
        <img src="/pho-seal.png" alt="PHO Seal" style={styles.sealImg} />
      </div>

      <div style={styles.sectionContainer}>
        <h3 style={styles.h3}>Civil Service Form No. 6 (Revised 2020)</h3>

        <form onSubmit={handleSubmit}>

          {/* Row 1 */}
          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 2 }}>
              <label style={styles.label}>1. OFFICE/DEPARTMENT:</label>
              <input type="text" name="department" value={formData.department} onChange={handleChange} placeholder="Enter Office/Department" style={styles.input} required />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>3. DATE OF FILING:</label>
              <input type="date" name="date_of_filing" value={formData.date_of_filing} onChange={handleChange} style={styles.input} required />
            </div>
          </div>

          {/* Row 2 */}
          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>2. NAME: (Last Name)</label>
              <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Last Name" style={styles.input} required />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>(First Name)</label>
              <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} placeholder="First Name" style={styles.input} required />
            </div>
            <div style={{ ...styles.formGroup, flex: 0.3 }}>
              <label style={styles.label}>(M.I.)</label>
              <input type="text" name="mi" value={formData.mi} onChange={handleChange} placeholder="M.I." style={styles.input} />
            </div>
          </div>

          {/* Row 3 */}
          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>4. POSITION:</label>
              <input type="text" name="position" value={formData.position} onChange={handleChange} placeholder="Enter Position" style={styles.input} required />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>5. SALARY (Monthly):</label>
              <input type="text" name="salary" value={formData.salary} onChange={handleChange} placeholder="e.g. ₱ 30,024.00" style={styles.input} />
            </div>
          </div>

          {/* Section 6 */}
          <div style={styles.sectionTitle}>6. DETAILS OF APPLICATION</div>

          <div style={styles.formGroup}>
            <label style={styles.label}>6.A Type of Leave to Be Availed Of:</label>
            <select name="leave_type" value={formData.leave_type} onChange={handleChange} style={styles.input} required>
              <option value="">-- Select Type of Leave --</option>
              <option value="Vacation Leave">Vacation Leave (Sec. 51, Rule XVI...)</option>
              <option value="Mandatory/Forced Leave">Mandatory/Forced Leave (Sec. 25, Rule XVI...)</option>
              <option value="Sick Leave">Sick Leave (Sec. 43, Rule XVI...)</option>
              <option value="Maternity Leave">Maternity Leave (R.A No. 11210...)</option>
              <option value="Paternity Leave">Paternity Leave (R.A No. 8187...)</option>
              <option value="Special Privilege Leave">Special Privilege Leave (Sec. 21, Rule XVI...)</option>
              <option value="Solo Parent Leave">Solo Parent Leave (R.A No. 8972...)</option>
              <option value="Study Leave">Study Leave (Sec. 68, Rule XVI...)</option>
              <option value="10-Day VAWC Leave">10-Day VAWC Leave (R.A No. 9262...)</option>
              <option value="Rehabilitation Privilege">Rehabilitation Privilege (Sec. 55, Rule XVI...)</option>
              <option value="Special Leave Benefits for Women">Special Leave Benefits for Women (RA No. 9710...)</option>
              <option value="Special Emergency (Calamity) Leave">Special Emergency (Calamity) Leave (CSC Mc No.2...)</option>
              <option value="Adoption Leave">Adoption Leave (R.A No. 8552)</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>6.B Details (Specify):</label>
            <input type="text" name="leave_details_specify" value={formData.leave_details_specify} onChange={handleChange} placeholder="Please specify details..." style={styles.input} />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>6.C Number of Working Days Applied For:</label>
              <input type="number" name="working_days_applied" value={formData.working_days_applied} onChange={handleChange} min="1" style={styles.input} required />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Inclusive Dates:</label>
              <input type="text" name="inclusive_dates" value={formData.inclusive_dates} onChange={handleChange} placeholder="e.g. June 25-27, 2026" style={styles.input} required />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>6.D Commutation:</label>
            <div style={{ display: 'flex', gap: 15, alignItems: 'center', marginTop: 6 }}>
              <label style={{ fontWeight: 'normal', fontSize: 16 }}>
                <input type="radio" name="commutation" value="Not Requested" checked={formData.commutation === 'Not Requested'} onChange={handleChange} style={{ marginRight: 8 }} />
                Not Requested
              </label>
              <label style={{ fontWeight: 'normal', fontSize: 16 }}>
                <input type="radio" name="commutation" value="Requested" checked={formData.commutation === 'Requested'} onChange={handleChange} style={{ marginRight: 8 }} />
                Requested
              </label>
            </div>
          </div>

          <button type="submit" style={{ ...styles.btnSubmit, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
          </button>

        </form>
      </div>
    </div>
  );
};

const styles = {
  body: {
    fontFamily: "'Segoe UI', Arial, sans-serif",
    backgroundColor: '#fcf8f8',
    padding: '30px 20px',
    color: '#2c1a1a',
    lineHeight: 1.6,
    minHeight: '100vh',
  },
  headerSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 950,
    margin: '0 auto 0 auto',
    padding: '0 0 25px 0',
    borderBottom: '2px solid #990000',
    marginBottom: 0,
  },
  sealImg: { width: 150, height: 150, objectFit: 'contain' },
  headerTextContainer: { textAlign: 'center', flexGrow: 1, padding: '0 20px' },
  h2: { textAlign: 'center', margin: '10px 0 0 0', color: '#990000', fontSize: 26, letterSpacing: 1 },
  sectionContainer: {
    maxWidth: 950,
    background: 'white',
    padding: '30px',
    margin: '0 auto',
    border: '1px solid #d9b3b3',
    borderRadius: '0 0 8px 8px',
    boxShadow: '0 4px 15px rgba(153,0,0,0.05)',
  },
  h3: { textAlign: 'center', fontSize: 13, color: '#777', marginBottom: 30, fontWeight: 'normal' },
  sectionTitle: {
    background: '#fff2f2', color: '#990000', padding: '8px 12px',
    fontWeight: 'bold', marginTop: 25, borderLeft: '4px solid #990000',
    textTransform: 'uppercase', fontSize: 13, letterSpacing: 0.5, marginBottom: 15,
  },
  formGroup: { margin: '15px 0' },
  label: { display: 'block', fontWeight: 800, marginBottom: 8, fontSize: 16, color: '#333', textTransform: 'uppercase' },
  input: {
    width: '100%', padding: 10, boxSizing: 'border-box',
    border: '2px solid #ccc', fontSize: 16, borderRadius: 4,
    color: '#2c1a1a', backgroundColor: '#fff',
  },
  row: { display: 'flex', gap: 20, marginBottom: 10 },
  btnSubmit: {
    background: '#990000', color: 'white', padding: 14, width: '100%',
    border: 'none', fontSize: 15, cursor: 'pointer', fontWeight: 'bold',
    borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 25,
  },
};

export default LeaveApplication;