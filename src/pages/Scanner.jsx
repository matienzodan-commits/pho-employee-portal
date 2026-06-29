import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from "../supabase/supabaseClient";

const Scanner = () => {
  const [statusMessage, setStatusMessage] = useState("Ready to scan ID...");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const lastScannedId = useRef(null);
  const lastScannedTime = useRef(0);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    }, false);

    async function onScanSuccess(decodedText) {
      const currentTime = Date.now();
      if (decodedText === lastScannedId.current && (currentTime - lastScannedTime.current < 5000)) return; 

      lastScannedId.current = decodedText;
      lastScannedTime.current = currentTime;
      setIsProcessing(true);
      setStatusMessage(`Processing ID: ${decodedText}...`);

      try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
        const localDate = now.toLocaleDateString('en-CA');

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

        const { data: existingRecord } = await supabase
          .from('attendance')
          .select('id')
          .eq('employee_id', decodedText)
          .eq('date', localDate)
          .maybeSingle();

        if (existingRecord) {
          await supabase.from('attendance').update({ time_out: timeStr }).eq('id', existingRecord.id);
          setStatusMessage(`✅ Time-Out: ${employee.full_name}`);
        } else {
          await supabase.from('attendance').insert([{ 
            employee_id: decodedText, 
            date: localDate, 
            time_in: timeStr, 
            day_type: 'Regular', 
            shift: 'Shifting' 
          }]);
          setStatusMessage(`✅ Time-In: ${employee.full_name}`);
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
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>PHO ATTENDANCE KIOSK</h1>
        <p style={styles.subtitle}>Please scan your official ID QR Code</p>
      </div>
      
      <div style={styles.statusBox}>
        {statusMessage}
      </div>
      
      <div id="reader" style={styles.scannerBox}></div>
      
      <div style={styles.footer}>
        © 2026 PHO Employee Management System
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #8B0000 0%, #4a0000 100%)',
    minHeight: '100vh',
    color: '#ffffff',
    fontFamily: "'Inter', sans-serif",
  },
  header: { marginBottom: '30px', textAlign: 'center' },
  title: { margin: 0, fontSize: '2rem', letterSpacing: '2px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' },
  subtitle: { margin: '5px 0 0', opacity: '0.8', fontWeight: '300' },
  statusBox: {
    padding: '20px 30px',
    marginBottom: '30px',
    borderRadius: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    color: '#8B0000',
    textAlign: 'center',
    width: '100%',
    maxWidth: '500px',
    fontWeight: '700',
    fontSize: '1.2rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(10px)',
  },
  scannerBox: {
    width: '100%',
    maxWidth: '400px',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '8px solid rgba(255,255,255,0.2)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
  },
  footer: { marginTop: 'auto', paddingTop: '40px', opacity: '0.6', fontSize: '0.9rem' }
};

export default Scanner;