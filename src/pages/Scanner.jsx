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
      
      if (decodedText === lastScannedId.current && (currentTime - lastScannedTime.current < 5000)) {
        return; 
      }

      lastScannedId.current = decodedText;
      lastScannedTime.current = currentTime;

      setIsProcessing(true);
      setStatusMessage(`Checking ID: ${decodedText}...`);

      try {
        // 1. I-verify kung rehistrado ang employee
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

        const localDate = new Date().toLocaleDateString('en-CA');
        const localTime = new Date().toTimeString().split(' ')[0];

        // 2. I-check kung may existing record na para sa araw na ito
        const { data: existingRecord, error: fetchError } = await supabase
          .from('attendance')
          .select('id, time_in, time_out')
          .eq('employee_id', decodedText)
          .eq('date', localDate)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingRecord) {
          // Kung meron na, i-update ang time_out
          const { error: updateError } = await supabase
            .from('attendance')
            .update({ time_out: localTime })
            .eq('id', existingRecord.id);

          if (updateError) throw updateError;
          setStatusMessage(`✅ Time-Out Recorded: ${employee.full_name}`);
        } else {
          // Kung wala pa, mag-insert ng time_in
          const { error: insertError } = await supabase
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

          if (insertError) throw insertError;
          setStatusMessage(`✅ Time-In Recorded: ${employee.full_name}`);
        }

      } catch (err) {
        setStatusMessage("❌ Error: " + err.message);
        console.error("Scanner Error:", err);
      } finally {
        setIsProcessing(false);
      }
    }

    scanner.render(onScanSuccess, (error) => {});

    return () => {
      scanner.clear().catch(err => console.error("Failed to clear scanner:", err));
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