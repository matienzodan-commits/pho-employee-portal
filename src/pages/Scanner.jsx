import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from "../supabase/supabaseClient";

const Scanner = () => {
  const [statusMessage, setStatusMessage] = useState("Scan your ID to Time-In/Out");
  const [statusType, setStatusType] = useState("neutral"); // 'neutral', 'success', 'error', 'processing'
  const [currentTime, setCurrentTime] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const lastScannedId = useRef(null);
  const lastScannedTime = useRef(0);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 200, height: 200 },
      aspectRatio: 1.0,
    }, false);

    async function onScanSuccess(decodedText) {
      if (decodedText === lastScannedId.current && (Date.now() - lastScannedTime.current < 5000)) return; 

      lastScannedId.current = decodedText;
      lastScannedTime.current = Date.now();
      
      setIsProcessing(true);
      setStatusType("processing");
      setStatusMessage("Verifying...");

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
          setStatusType("error");
          setStatusMessage("❌ ID Not Found");
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
          setStatusType("success");
          setStatusMessage(`✅ Time-Out: ${employee.full_name.split(' ')[0]}`);
        } else {
          await supabase.from('attendance').insert([{ 
            employee_id: decodedText, date: localDate, time_in: timeStr, day_type: 'Regular', shift: 'Shifting' 
          }]);
          setStatusType("success");
          setStatusMessage(`✅ Time-In: ${employee.full_name.split(' ')[0]}`);
        }
      } catch (err) {
        setStatusType("error");
        setStatusMessage("❌ System Error");
      } finally {
        setIsProcessing(false);
      }
    }

    scanner.render(onScanSuccess, () => {});
    return () => { scanner.clear().catch(console.error); };
  }, []);

  const getStatusColor = () => {
    switch(statusType) {
      case 'success': return '#2e7d32';
      case 'error': return '#c62828';
      case 'processing': return '#1565c0';
      default: return '#555';
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.brand}>PHO Kiosk</div>
        <div style={styles.clock}>{currentTime}</div>
      </header>

      <div style={{...styles.statusCard, borderColor: getStatusColor()}}>
        <div style={{...styles.statusText, color: getStatusColor()}}>{statusMessage}</div>
      </div>

      <div id="reader" style={styles.scannerBox}></div>

      <div style={styles.footer}>
        Align QR code inside the frame
      </div>
    </div>
  );
};

const styles = {
  container: { 
    display: 'flex', flexDirection: 'column', alignItems: 'center', 
    minHeight: '100vh', backgroundColor: '#f4f6f9', padding: '15px' 
  },
  header: { 
    width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'space-between', 
    alignItems: 'center', marginBottom: '20px', padding: '10px 0' 
  },
  brand: { fontSize: '1.5rem', fontWeight: 'bold', color: '#8B0000' },
  clock: { fontSize: '1.2rem', fontWeight: '600', color: '#333' },
  statusCard: { 
    width: '100%', maxWidth: '400px', padding: '20px', borderRadius: '15px', 
    backgroundColor: '#fff', borderLeft: '8px solid', textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '20px'
  },
  statusText: { fontSize: '1.2rem', fontWeight: 'bold' },
  scannerBox: { 
    width: '100%', maxWidth: '400px', borderRadius: '20px', 
    overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' 
  },
  footer: { marginTop: '20px', color: '#666', fontSize: '0.9rem' }
};

export default Scanner;