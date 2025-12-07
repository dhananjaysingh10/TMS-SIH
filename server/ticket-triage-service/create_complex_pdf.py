#!/usr/bin/env python3
"""Generate a complex PowerGrid SCADA troubleshooting PDF"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER

def create_complex_scada_pdf():
    """Create a complex PowerGrid SCADA troubleshooting guide PDF"""
    
    filename = "powergrid_scada_troubleshooting.pdf"
    doc = SimpleDocTemplate(filename, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor='darkblue',
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    story.append(Paragraph("PowerGrid SCADA Network Troubleshooting Guide", title_style))
    story.append(Paragraph("Document ID: PGCIL-IT-TRB-2024-003 | RESTRICTED - Internal Use Only", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Section 1: SCADA Communication Failure
    story.append(Paragraph("1. SCADA RTU Communication Failure Resolution", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    content1 = """
    <b>1.1 Symptom Identification:</b><br/>
    When Regional Load Dispatch Centre (RLDC) operators report "RTU not responding" or "Communication timeout" errors, 
    follow this diagnostic protocol:<br/><br/>
    
    <b>Common Error Codes:</b><br/>
    • ERR-RTU-001: RTU communication timeout (greater than 5 seconds)<br/>
    • ERR-RTU-002: Cyclic redundancy check (CRC) failure in data packets<br/>
    • ERR-RTU-003: IEC 60870-5-104 protocol violation detected<br/>
    • ERR-NET-101: Subnet mask mismatch in 172.16.x.x network range<br/>
    • ERR-NET-102: VLAN tagging error (VLAN 100-SCADA, VLAN 200-MIS)<br/><br/>
    
    <b>1.2 Layer-by-Layer Diagnostic Procedure:</b><br/><br/>
    
    <b>Step 1: Physical Layer Verification</b><br/>
    Required Tools: Fluke DTX-1800 Cable Analyzer, OTDR (Optical Time-Domain Reflectometer)<br/><br/>
    
    Procedure:<br/>
    1. Access the substation RTU cabinet (requires Dual-Lock authentication)<br/>
    2. Verify fiber optic cable continuity - Acceptable loss: less than 0.3 dB/km for single-mode fiber<br/>
    3. Check SC/APC or LC/UPC type connectors for damage or contamination<br/>
    4. Use OTDR to locate fiber breaks (typical detection range: 0-80km)<br/>
    5. For copper Ethernet (RS-485 legacy systems), verify termination resistor: 120Ω ±5% at both ends<br/>
    6. Check for ground loops using digital multimeter (maximum distance: 1200m as per IEC standard)<br/><br/>
    
    <b>Step 2: Network Layer Troubleshooting</b><br/>
    PowerGrid SCADA Network Architecture:<br/>
    • Primary Network: 172.16.10.0/24 (MPLS-VPN backbone)<br/>
    • Backup Network: 172.16.20.0/24 (Leased line ISDN)<br/>
    • Management Network: 10.220.x.x/16 (Out-of-band SSH access)<br/><br/>
    
    Commands to execute from SCADA Master Station:<br/>
    1. ping -c 10 -s 1472 172.16.10.{RTU_IP}  # Test MTU size (1500 bytes)<br/>
    2. traceroute -n 172.16.10.{RTU_IP}       # Perform hop-by-hop latency analysis<br/>
    3. sudo tcpdump -i eth1 port 2404 -vv     # Capture IEC 60870-5-104 protocol packets<br/><br/>
    
    Expected Network Response Times:<br/>
    • Intra-region RTUs: less than 20ms latency<br/>
    • Inter-region RTUs: less than 50ms latency<br/>
    • Satellite backup link: less than 300ms (acceptable degradation mode)<br/><br/>
    
    <b>Step 3: IEC 60870-5-104 Protocol Analysis</b><br/>
    Using Wireshark with PowerGrid custom protocol dissector:<br/><br/>
    
    Filter: tcp.port == 2404 && iec104<br/><br/>
    
    Key Protocol Frames to Monitor:<br/>
    1. STARTDT (Start Data Transfer) - Should receive STARTDT_CON confirmation within 2 seconds<br/>
    2. TESTFR (Test Frame) - Heartbeat packet sent every 20 seconds for keepalive<br/>
    3. ASDU (Application Service Data Unit) - Type ID 1-36 as per Indian Grid Code specification<br/><br/>
    
    Common Protocol Issues:<br/>
    • COT (Cause of Transmission) = 0x03 (Spontaneous) missing indicates RTU not sending status change events<br/>
    • IOA (Information Object Address) mismatch - Check RTU address mapping in /opt/scada/config/rtu_map.xml<br/>
    • Timestamp synchronization error - Verify NTP server 10.220.1.100 is reachable from RTU<br/>
    """
    story.append(Paragraph(content1, styles['Normal']))
    story.append(PageBreak())
    
    # Section 2: Database Sync Issues
    story.append(Paragraph("2. Oracle RAC Database Synchronization Failure", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    content2 = """
    <b>2.1 Problem Statement:</b><br/>
    When the hourly cron job (/usr/local/bin/sync_scada_db.sh) fails with exit code 1, and logs show Oracle errors:<br/><br/>
    
    • ORA-01017: invalid username/password; logon denied<br/>
    • ORA-12514: TNS listener does not currently know of service requested in connect descriptor<br/>
    • ORA-03135: connection lost contact with database server<br/><br/>
    
    <b>2.2 Resolution Steps:</b><br/><br/>
    
    <b>Step 1: Oracle RAC Cluster Health Check</b><br/>
    Connect to Oracle primary node via secure SSH:<br/>
    ssh -i /home/scada/.ssh/oracle_key oracleadm@10.220.5.10<br/><br/>
    
    Check cluster resource status:<br/>
    srvctl status database -d SCADA_PROD<br/><br/>
    
    Expected output:<br/>
    Instance SCADA01 is running on node oranode1<br/>
    Instance SCADA02 is running on node oranode2<br/><br/>
    
    If instances are down, execute:<br/>
    srvctl start database -d SCADA_PROD<br/><br/>
    
    <b>Step 2: TNS Configuration Validation</b><br/>
    Verify tnsnames.ora file on SCADA master server:<br/>
    cat /opt/oracle/network/admin/tnsnames.ora<br/><br/>
    
    Correct TNS entry format:<br/>
    SCADA_PROD =<br/>
      (DESCRIPTION =<br/>
        (ADDRESS_LIST =<br/>
          (ADDRESS = (PROTOCOL = TCP)(HOST = oravip1.powergrid.local)(PORT = 1521))<br/>
          (ADDRESS = (PROTOCOL = TCP)(HOST = oravip2.powergrid.local)(PORT = 1521))<br/>
        )<br/>
        (LOAD_BALANCE = yes)<br/>
        (CONNECT_DATA =<br/>
          (SERVER = DEDICATED)<br/>
          (SERVICE_NAME = SCADA_PROD.powergrid.local)<br/>
        )<br/>
      )<br/><br/>
    
    Test TNS connectivity:<br/>
    tnsping SCADA_PROD<br/>
    sqlplus scada_sync/ENCRYPTED_PASSWORD@SCADA_PROD<br/><br/>
    
    <b>Step 3: Oracle Wallet Password Management</b><br/>
    PowerGrid uses Oracle Wallet for secure credential storage.<br/>
    Location: /opt/oracle/admin/SCADA_PROD/wallet<br/><br/>
    
    Verify wallet status:<br/>
    mkstore -wrl /opt/oracle/admin/SCADA_PROD/wallet -list<br/><br/>
    
    Update credentials (requires DBA approval):<br/>
    mkstore -wrl /opt/oracle/admin/SCADA_PROD/wallet -modifyCredential SCADA_PROD scada_sync NEW_PASSWORD<br/><br/>
    
    Test synchronization script manually:<br/>
    sudo -u oracle /usr/local/bin/sync_scada_db.sh --dry-run<br/>
    """
    story.append(Paragraph(content2, styles['Normal']))
    story.append(PageBreak())
    
    # Section 3: Password Reset Procedure
    story.append(Paragraph("3. SCADA Password Reset Procedure", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    content3 = """
    <b>3.1 Standard Password Reset Workflow:</b><br/><br/>
    
    <b>Prerequisites:</b><br/>
    • Employee badge number in PGCIL-{ZONE}-YYYY-XXXXX format (e.g., PGCIL-NR-2024-12345)<br/>
    • Zone allocation: NR (North Region), SR (South), ER (East), WR (West), or NER (North-East)<br/>
    • Registered mobile number for OTP delivery via PowerGrid SecureAuth app<br/>
    • Confirmation of access to SAP HR portal (transaction code: ZPGHR001)<br/><br/>
    
    <b>Step-by-Step Password Reset Process:</b><br/><br/>
    
    <b>Step 1: Identity Verification</b><br/>
    IT Support team will verify the following in HRMS database:<br/>
    • Employee badge number matches format PGCIL-{ZONE}-YYYY-XXXXX<br/>
    • Zone allocation corresponds to employee's current posting location<br/>
    • Registered mobile number matches HRMS records<br/>
    • Employee has active status (not on long leave or deputation)<br/><br/>
    
    <b>Step 2: OTP Generation and Delivery</b><br/>
    1. IT Support generates 8-digit alphanumeric OTP using PowerGrid SecureAuth application<br/>
    2. OTP is sent to registered mobile number via SMS (OTP validity: 180 seconds or 3 minutes)<br/>
    3. Employee must provide OTP within validity period to proceed<br/><br/>
    
    <b>Step 3: Password Reset in SAP HR Module</b><br/>
    Using SAP transaction ZPGHR001:<br/>
    1. IT Support accesses the SAP HR password management module<br/>
    2. Enters employee badge number and validates against HRMS database<br/>
    3. Generates new temporary password conforming to PowerGrid security policy<br/><br/>
    
    <b>Password Policy Requirements:</b><br/>
    • Minimum length: 12 characters<br/>
    • Must include: Uppercase letters, lowercase letters, numbers, and special characters (@#$%)<br/>
    • Cannot contain: Employee ID, name, or common dictionary words<br/>
    • Cannot reuse last 5 passwords<br/>
    • Must be changed on first login within 24 hours<br/><br/>
    
    <b>Step 4: SCADA Oracle Database Synchronization</b><br/>
    Execute internal synchronization script to update SCADA credentials:<br/>
    /usr/local/bin/sync_password.sh --employee-id {BADGE_NUMBER} --new-password {ENCRYPTED}<br/><br/>
    
    This script performs:<br/>
    • Updates user credentials in SCADA_PROD Oracle database<br/>
    • Synchronizes with PowerMIMIC HMI authentication system<br/>
    • Updates LDAP directory for unified authentication<br/>
    • Logs password change event to audit trail<br/><br/>
    
    <b>Step 5: Incident Logging and Approval</b><br/>
    1. Create ServiceNow incident ticket under category: ACCESS-PWD-RESET<br/>
    2. Attach employee badge verification screenshot and OTP confirmation<br/>
    3. Obtain digital approval from Zonal IT Head (auto-approved for standard resets)<br/>
    4. Send password reset confirmation email to employee's registered email address<br/><br/>
    
    <b>Typical Completion Time:</b><br/>
    • Normal business hours: 15-20 minutes after receiving all required information<br/>
    • After business hours: 30-45 minutes (on-call support engineer)<br/>
    • Emergency cases affecting grid operations: Immediate priority (within 10 minutes)<br/>
    """
    story.append(Paragraph(content3, styles['Normal']))
    story.append(PageBreak())
    
    # Section 4: Contact Information
    story.append(Paragraph("4. Escalation Matrix and Support Contacts", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    content4 = """
    <b>L1 Support - 24x7 IT Helpdesk:</b><br/>
    • Toll-Free Phone: 18001234321<br/>
    • WhatsApp Support: +91-98765-43210 (Duty Engineer)<br/>
    • Email: scada-support@powergrid.in<br/>
    • Response Time SLA: 15 minutes for acknowledgment, 2 hours for resolution<br/><br/>
    
    <b>L2 Support - SCADA Subject Matter Experts:</b><br/>
    • Contact when L1 cannot resolve within 2 hours<br/>
    • Email: scada-sme@powergrid.in<br/>
    • Escalation trigger: Critical grid operations impact or national emergency<br/>
    • Available: Monday-Friday 9 AM - 5 PM (extended hours for critical issues)<br/><br/>
    
    <b>Emergency Escalation Chain:</b><br/>
    1. Chief Manager (IT-SCADA): +91-98765-00001 - For zonal-level SCADA failures<br/>
    2. General Manager (IT): +91-98765-00002 - For multi-zonal coordination required<br/>
    3. Director (IT): +91-98765-00003 - Only for Grid Security incidents or National Emergency<br/><br/>
    
    <b>Specialized Support Teams:</b><br/>
    • Cybersecurity Incidents: cert-pg@powergrid.in (CC: cert-in@cert-in.org.in)<br/>
    • Database Issues: dba-team@powergrid.in<br/>
    • Network Problems: network-ops@powergrid.in<br/>
    • SAP Module Issues: sap-support@powergrid.in<br/><br/>
    
    <b>Document Information:</b><br/>
    Classification: RESTRICTED - For PowerGrid IT Personnel Only<br/>
    Version: 1.2 (Updated May 2024)<br/>
    Next Review Date: November 2024<br/>
    Owner: IT-SCADA Operations Team, PowerGrid Corporation of India Ltd.<br/>
    """
    story.append(Paragraph(content4, styles['Normal']))
    
    # Build PDF
    doc.build(story)
    print(f"✅ Successfully created complex PDF: {filename}")
    print(f"📄 This PDF contains detailed PowerGrid SCADA troubleshooting procedures")
    return filename

if __name__ == "__main__":
    create_complex_scada_pdf()
