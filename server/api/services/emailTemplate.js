import dotenv from "dotenv";
dotenv.config();

export const TICKET_STATUS_UPDATE_TEMPLATE = (
  ticketId,
  status,
  remark,
  timestamp
) => {
  // Status color logic for visual cues
  const getStatusColor = (s) => {
    const lower = s.toLowerCase();
    if (lower === "closed" || lower === "resolved") return "#10B981"; // Green
    if (lower === "in progress") return "#F59E0B"; // Orange
    if (lower === "rejected") return "#EF4444"; // Red
    return "#3B82F6"; // Blue (default/open)
  };

  const statusColor = getStatusColor(status);
  const appUrl = process.env.CORS_ORIGIN || "http://localhost:3000";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Status Update</title>
  <style>
    /* Reset styles for email client compatibility */
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  </style>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; color: #51545E;">
  
  <!-- Main Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f4f4f7; padding: 40px 0;">
    <tr>
      <td align="center">
        
        <!-- Email Card -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
          
          <!-- Header Color Strip -->
          <tr>
            <td style="height: 6px; background-color: #3B82F6;"></td>
          </tr>

          <!-- Content Padding -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              
              <!-- Logo / Brand Name -->
              <div style="margin-bottom: 24px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: bold; color: #333333;">POWERGRID Ticketing</h2>
              </div>

              <!-- Headline -->
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #111827;">
                Ticket Status Updated
              </h1>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                Hello, your ticket <strong>#${ticketId}</strong> has been updated by the support team.
              </p>

              <!-- Status Badge Area -->
              <table width="100%" style="background-color: #f9fafb; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td width="50%" style="font-size: 14px; color: #6B7280;">New Status</td>
                  <td width="50%" align="right" style="font-size: 14px; font-weight: bold; color: ${statusColor}; text-transform: uppercase;">
                    ${status}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 8px; font-size: 14px; color: #6B7280;">Updated At</td>
                  <td align="right" style="padding-top: 8px; font-size: 14px; color: #111827;">
                    ${new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}
                  </td>
                </tr>
                ${remark
      ? `
                <tr>
                  <td colspan="2" style="padding-top: 12px; border-top: 1px solid #e5e7eb; margin-top: 12px;">
                    <p style="margin: 0; font-size: 14px; color: #6B7280;">Remark:</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #111827; font-style: italic;">"${remark}"</p>
                  </td>
                </tr>
                `
      : ""
    }
              </table>

              <!-- CTA Button -->
              <table width="100%" role="presentation">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="${appUrl}/ticket/${ticketId}" style="display: inline-block; background-color: #3B82F6; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; padding: 12px 24px; border-radius: 6px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                      View Ticket Details
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #6B7280;">
                If you did not request this ticket, please ignore this email or contact support.
              </p>

            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                &copy; ${new Date().getFullYear()} POWERGRID IT Support. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #9CA3AF;">
                This is an automated message. Please do not reply directly.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;
};

export const TICKET_ESCALATION_TEMPLATE = (
  ticketId,
  displayId,
  title,
  department,
  priority,
  createdAt,
  hoursOpen
) => {
  const appUrl = process.env.CORS_ORIGIN || "http://localhost:3000";
  const priorityColors = {
    urgent: "#EF4444",
    high: "#F97316",
    medium: "#F59E0B",
    low: "#10B981"
  };
  const priorityColor = priorityColors[priority?.toLowerCase()] || "#3B82F6";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Urgent: Ticket Escalation</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; color: #51545E;">
  
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f4f4f7; padding: 40px 0;">
    <tr>
      <td align="center">
        
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
          
          <!-- Header Color Strip - Red for urgency -->
          <tr>
            <td style="height: 6px; background-color: #EF4444;"></td>
          </tr>

          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              
              <div style="margin-bottom: 24px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: bold; color: #333333;">POWERGRID Ticketing</h2>
              </div>

              <!-- Alert Banner -->
              <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #DC2626;">
                  ⚠️ Urgent: Ticket Requires Immediate Attention
                </h1>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #991B1B;">
                  This ticket has been open for <strong>${hoursOpen} hours</strong> without being assigned.
                </p>
              </div>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                Dear Team Lead, a ticket in your department requires urgent assignment.
              </p>

              <!-- Ticket Details -->
              <table width="100%" style="background-color: #f9fafb; border-radius: 6px; padding: 16px; margin-bottom: 24px; border-collapse: separate;">
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Ticket ID</td>
                  <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: bold; color: #111827;">${displayId || ticketId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Title</td>
                  <td align="right" style="padding: 8px 0; font-size: 14px; color: #111827;">${title || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Department</td>
                  <td align="right" style="padding: 8px 0; font-size: 14px; color: #111827;">${department}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Priority</td>
                  <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: bold; color: ${priorityColor}; text-transform: uppercase;">${priority}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Created At</td>
                  <td align="right" style="padding: 8px 0; font-size: 14px; color: #111827;">
                    ${new Date(createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" role="presentation">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="${appUrl}/ticket/${ticketId}" style="display: inline-block; background-color: #DC2626; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; padding: 12px 24px; border-radius: 6px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);">
                      Assign This Ticket Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #6B7280;">
                Please assign this ticket to an available team member on an urgent basis to ensure timely resolution.
              </p>

            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                &copy; ${new Date().getFullYear()} POWERGRID IT Support. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #9CA3AF;">
                This is an automated escalation alert.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;
};
