import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from "../supabase/supabaseClient";

const Scanner = () => {
  const [statusMessage, setStatusMessage] = useState("Ready to scan...");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const lastScannedId = useRef(null);
  const lastScannedTime = useRef(0);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    }, false);

    async function onScanSuccess(decodedText) {
      const currentTime = Date.now();
      
      // Anti-flood lock
      if (decodedText === lastScannedId.current && (currentTime - lastScannedTime.current < 5000)) {
        return; 
      }

      lastScannedId.current = decodedText;
      lastScannedTime.current = currentTime;

      setIsProcessing(true);
      setStatusMessage(`Processing ID: ${decodedText}...`);

      try {
        const now = new Date();
        const options = { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const formatter = new Intl.DateTimeFormat('en-GB', options);
        const parts = formatter.formatToParts(now);
        
        const h = parseInt(parts.find(p => p.type === 'hour').value);
        const m = parseInt(parts.find(p => p.type === 'minute').value);
        const s = parseInt(parts.find(p => p.type === 'second').value);
        const timeStr = `${h}:${m}:${s}`;
        const localDate = now.toLocaleDateString('en-CA');

        // 2. Verify Employee
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .select('full_name')
          .eq('employee_id', decodedText)
          .single();

        if (empError || !employee) {
          setStatusMessage(`❌ ID ${decodedText} not found.`);
          setIsProcessing(false);
          return;
        }

        // 3. Check for existing record
        const { data: existingRecord } = await supabase
          .from('attendance')
          .select('id')
          .eq('employee_id', decodedText)
          .eq('date', localDate)
          .maybeSingle();

        if (existingRecord) {
          await supabase.from('attendance').update({ time_out: timeStr }).eq('id', existingRecord.id);
          setStatusMessage(`✅ Time-Out recorded for ${employee.full_name}.`);
        } else {
          await supabase.from('attendance').insert([{ 
            employee_id: decodedText, 
            date: localDate, 
            time_in: timeStr, 
            day_type: 'Regular', 
            shift: 'Shifting' 
          }]);
          setStatusMessage(`✅ Time-In recorded for ${employee.full_name}.`);
        }
      } catch (err) {
        setStatusMessage("❌ Error: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    }

    scanner.render(onScanSuccess, () => {});
    return () => { scanner.clear().catch(console.error); };
  }, []);

  return (
    <div style={{ 
      padding: '40px 20px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      backgroundColor: '#8B0000', // PHO Deep Red
      minHeight: '100vh', 
      color: '#ffffff', 
      fontFamily: 'sans-serif' 
    }}>
      <h2 style={{ color: '#ffffff', textTransform: 'uppercase', marginBottom: '20px' }}>PHO Attendance Kiosk</h2>
      
      <div style={{ 
        padding: '20px', 
        marginBottom: '20px', 
        borderRadius: '12px', 
        backgroundColor: '#ffffff', 
        color: '#8B0000', 
        textAlign: 'center', 
        width: '100%', 
        maxWidth: '450px',
        fontWeight: 'bold',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
      }}>
        {statusMessage}
      </div>
      
      <div id="reader" style={{ 
        width: '100%', 
        maxWidth: '450px', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        border: '5px solid #ffffff' 
      }}></div>
    </div>
  );
};

export default Scanner;