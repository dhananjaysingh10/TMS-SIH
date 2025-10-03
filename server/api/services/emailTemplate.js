import dotenv from 'dotenv';
dotenv.config();

export const TICKET_STATUS_UPDATE_TEMPLATE = (ticketId, status, remark, timestamp) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Status Update</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Ticket Status Update</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>Your ticket with ID: <strong>${ticketId}</strong> has been updated:</p>
    <p><strong>Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}</p>
    <p><strong>Update Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
    ${remark ? `<p><strong>Remark:</strong> ${remark}</p>` : ''}
    <p>You can view the ticket details in your account dashboard.</p>
    <p>If you have any questions, please contact our support team.</p>
    <p>Best regards,<br>Ticket Management Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;