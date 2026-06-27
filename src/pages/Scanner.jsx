import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from "../supabase/supabaseClient";

const Scanner = () => {
  const [statusMessage, setStatusMessage] = useState("Ready to scan...");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Refs para maiwasan ang paulit-ulit na scan ng iisang tao sa loob ng maikling oras
  const lastScannedId = useRef(null);
  const lastScannedTime = useRef(0);

  useEffect(() => {
    // I-initialize ang camera scanner UI
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    }, false);

    async function onScanSuccess(decodedText) {
      const currentTime = Date.now();
      
      // Anti-flood lock: Huwag tanggapin ang iisang ID kung na-scan na ito sa nakalipas na 5 segundo
      if (decodedText === lastScannedId.current && (currentTime - lastScannedTime.current < 5000)) {
        return; 
      }

      lastScannedId.current = decodedText;
      lastScannedTime.current = currentTime;

      setIsProcessing(true);
      setStatusMessage(`Checking ID: ${decodedText}...`);

      try {
        // 1. I-verify sa 'employees' table kung rehistrado ang na-scan na employee_id
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .select('full_name')
          .eq('employee_id', decodedText)
          .single();

        if (empError || !employee) {
          setStatusMessage(`❌ Error: Invalid QR Code (ID ${decodedText} not found)`);
          setIsProcessing(false);
          return;
        }

        // 2. I-format ang local date (YYYY-MM-DD) at local time (HH:MM:SS) para sa database
        const localDate = new Date().toLocaleDateString('en-CA'); // Halimbawa: "2026-06-27"
        const localTime = new Date().toTimeString().split(' ')[0]; // Halimbawa: "21:45:00"

        // 3. I-insert ang data sa 'attendance' table gamit ang iyong mga columns
        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert([
            { 
              employee_id: decodedText, 
              date: localDate,
              time_in: localTime,
              day_type: 'Regular',  
              shift: 'Day Shift'    
            }
          ]);

        if (attendanceError) {
          setStatusMessage(`❌ Failed to record: ${attendanceError.message}`);
          console.error("Supabase Insertion Error:", attendanceError);
        } else {
          setStatusMessage(`✅ Attendance Recorded: ${employee.full_name}`);
        }

      } catch (err) {
        setStatusMessage("❌ System or connection error occurred.");
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }

    scanner.render(onScanSuccess, (error) => {
      // Normal camera noise during capture stream, safe i-ignore
    });

    // Cleanup function para patayin ang camera instance kapag umalis sa page
    return () => {
      scanner.clear().catch(err => console.error("Failed to clear scanner camera:", err));
    };
  }, []);

  return (
    <div style={{ 
      padding: '40px 20px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      backgroundColor: '#1a1a1a',
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      <h2 style={{ marginBottom: '10px', color: '#ff4d4d' }}>PHO Attendance Kiosk</h2>
      <p style={{ color: '#aaa', marginBottom: '30px' }}>Place your employee QR code in front of the camera</p>
      
      {/* Dynamic Status Box Feedback Container */}
      <div style={{
        padding: '15px 25px',
        marginBottom: '25px',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '450px',
        textAlign: 'center',
        fontWeight: '600',
        fontSize: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        backgroundColor: isProcessing ? '#333333' : statusMessage.startsWith('✅') ? '#d4edda' : statusMessage.startsWith('❌') ? '#f8d7da' : '#2a2a2a',
        color: isProcessing ? '#ffffff' : statusMessage.startsWith('✅') ? '#155724' : statusMessage.startsWith('❌') ? '#721c24' : '#ffffff',
        border: statusMessage.startsWith('✅') ? '1px solid #c3e6cb' : statusMessage.startsWith('❌') ? '1px solid #f5c6cb' : '1px solid #444'
      }}>
        {statusMessage}
      </div>

      {/* Target element kung saan i-re-render ng library ang Video Canvas Stream */}
      <div id="reader" style={{ 
        width: '100%', 
        maxWidth: '450px', 
        borderRadius: '12px', 
        overflow: 'hidden',
        border: 'none',
        backgroundColor: '#2a2a2a',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
      }}></div>
    </div>
  );
};

export default Scanner;