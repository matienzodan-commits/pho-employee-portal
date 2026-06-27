import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from "../supabase/supabaseClient";

const Scanner = () => {
  const [statusMessage, setStatusMessage] = useState("Ready to scan...");
  const [isProcessing, setIsProcessing] = useState(false);
  const lastScannedId = useRef(null);
  const lastScannedTime = useRef(0);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);

    async function onScanSuccess(decodedText) {
      const now = new Date();
      const currentTime = now.getTime();
      
      if (decodedText === lastScannedId.current && (currentTime - lastScannedTime.current < 5000)) return;

      lastScannedId.current = decodedText;
      lastScannedTime.current = currentTime;

      setIsProcessing(true);
      try {
        const { data: employee } = await supabase.from('employees').select('full_name').eq('employee_id', decodedText).single();
        if (!employee) { setStatusMessage("❌ ID not found"); setIsProcessing(false); return; }

        const localDate = now.toLocaleDateString('en-CA');
        const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
        const [hours, minutes] = timeStr.split(':').map(Number);
        const currentMinutes = hours * 60 + minutes;

        const { data: existingRecord } = await supabase.from('attendance')
          .select('id, time_in').eq('employee_id', decodedText).eq('date', localDate).maybeSingle();

        if (existingRecord) {
          // TIME OUT LOGIC (Target 17:00 = 1020 minutes)
          let undertime = Math.max(0, 1020 - currentMinutes);
          await supabase.from('attendance').update({ time_out: timeStr, undertime_minutes: undertime }).eq('id', existingRecord.id);
          setStatusMessage(`✅ Time-Out recorded for ${employee.full_name} (${undertime > 0 ? undertime + ' min undertime' : 'No undertime'})`);
        } else {
          // TIME IN LOGIC (Target 08:00 = 480 minutes)
          let late = Math.max(0, currentMinutes - 480);
          await supabase.from('attendance').insert([{ employee_id: decodedText, date: localDate, time_in: timeStr, late_minutes: late, day_type: 'Regular', shift: 'Day Shift' }]);
          setStatusMessage(`✅ Time-In recorded for ${employee.full_name} (${late > 0 ? late + ' min late' : 'On time'})`);
        }
      } catch (err) { setStatusMessage("❌ Error: " + err.message); }
      finally { setIsProcessing(false); }
    }

    scanner.render(onScanSuccess, () => {});
    return () => scanner.clear();
  }, []);

  return (
    <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#1a1a1a', minHeight: '100vh', color: '#ffffff' }}>
      <h2 style={{ color: '#ff4d4d' }}>PHO Attendance Kiosk</h2>
      <div style={{ padding: '20px', margin: '20px', borderRadius: '8px', backgroundColor: '#333', textAlign: 'center' }}>{statusMessage}</div>
      <div id="reader" style={{ width: '100%', maxWidth: '450px' }}></div>
    </div>
  );
};
export default Scanner;