// Submit Fund Request Endpoint
app.post("/api/requests", authenticateJWT, async (req, res) => {
  console.log("Request Body:", req.body);
  console.log("Request Type:", req.body.requestType);
  console.log("Attachments Received:", req.body.attachments?.length || 0);
  const {
    requestType,
    category,
    subCategory,
    expenseItems,
    transactionCost,
    currencyCode,
  } = req.body;
  const userId = req.user.Id;

  let connection;
  try {
    const approvalToken = generateToken();
    if (!req.body.requestType || !req.body.category) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [[userData]] = await connection.query(
      "SELECT country FROM users WHERE Id = ?",
      [userId]
    );

    const currency = currencyCode || getCurrencyFromCountry(userData.country);

    // Insert request type
    const [requestRes] = await connection.query(
      `INSERT INTO request_type 
          (users_id, REQUEST_TYPE, email_status, country)
         VALUES (?, ?, 'colleague_pending', ?)`,
      [userId, requestType, userData.country]
    );
    const requestId = requestRes.insertId;
    if (req.body.attachments && req.body.attachments.length > 0) {
      for (const attachment of req.body.attachments) {
        await connection.query(
          `INSERT INTO attachments 
            (request_id, file_type, drive_link, file_name)
           VALUES (?, ?, ?, ?)`,
          [requestId, attachment.type, attachment.content, attachment.fileName]
        );
      }
    }
    console.log("Inserted request_type with Id:", requestId);
    // Insert category
    const [categoryRes] = await connection.query(
      `INSERT INTO categories (request_type_id, NAME)
         VALUES (?, ?)`,
      [requestId, category]
    );
    console.log("Inserted category Id:", categoryRes.insertId);
    // Insert subcategory
    const [subCategoryRes] = await connection.query(
      `INSERT INTO Subcategories (Categories_id, NAME)
         VALUES (?, ?)`,
      [categoryRes.insertId, subCategory]
    );
    // Process expense items
    let totalAmount = 0;
    for (const item of expenseItems) {
      const [expenseRes] = await connection.query(
        `INSERT INTO expense_item (Subcategories_id, description, Amount, Quantity)
      VALUES (?, ?, ?, ?)`,
        [subCategoryRes.insertId, item.description, item.amount, item.quantity]
      );
      totalAmount += item.amount * item.quantity;
    }
    console.log("Inserted subCategory Id:", subCategoryRes.insertId);
    const clearanceStatus =
      requestType === "Reimbursement" ? "cleared" : "uncleared";
    const receiptStatus =
      requestType === "Reimbursement" ? "uploaded" : "pending";
    console.log("Request type:", requestType);
    console.log("Clearance status:", clearanceStatus);
    console.log("Receipt status:", receiptStatus);
    // Calculate total request
    const totalRequest = totalAmount + (transactionCost || 0);
    await connection.query(
      `INSERT INTO total_request (
        Total_Amount, 
        Total_Request, 
        Transaction_Amount, 
        request_type_id, 
        Balance_amount, 
        clearance_status, 
        receipt_amount,
        currency_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        totalAmount,
        totalRequest,
        transactionCost,
        requestId,
        totalAmount,
        clearanceStatus,
        0,
        currency,
      ]
    );

    if (requestType === "Reimbursement") {
      await connection.query(
        `
        UPDATE total_request 
        SET clearance_status = ?, Balance_amount = 0 
        WHERE request_type_id = ?`,
        [clearanceStatus, requestId]
      );
    }
    await connection.query(
      `INSERT INTO receipts_table (request_type_id, receipt_status) VALUES (?, ?)`,
      [requestId, receiptStatus]
    );
    console.log("Inserted into receipts_table with status:", receiptStatus);
    console.log(
      "Inserted into receipts_table with request_type_id:",
      requestId
    );
    //Get user details
    const [[user]] = await connection.query(
      "SELECT name, email, country FROM users WHERE Id = ?",
      [userId]
    );
    // Find colleagues in same country (excluding requester)
    const [colleagues] = await connection.query(
      `SELECT * FROM users 
       WHERE country = ? 
         AND Id != ?`,
      [user.country, userId]
    );

    // Send approval requests to colleagues
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    for (const colleague of colleagues) {
      const colleagueToken = generateToken();
      console.log("Storing token:", colleagueToken);

      await connection.query(
        `INSERT INTO colleague_approvals 
          (request_id, colleague_id, token)
         VALUES (?, ?, ?)`,
        [requestId, colleague.Id, colleagueToken]
      );
      const [attachments] = await connection.query(
        "SELECT file_name, drive_link FROM attachments WHERE request_id = ?",
        [requestId]
      );

      const itemsHtml = expenseItems
        .map(
          (item, index) => `
        <div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #4a5568;">
          <p><strong>Item ${index + 1}:</strong></p>
          <p>Description: ${item.description}</p>
          <p>Amount: ${item.amount} x Quantity: ${item.quantity}</p>
          <p>Subtotal: ${item.amount * item.quantity}</p>
        </div>
      `
        )
        .join("");

      const baseEmailTemplate = (content, attachments = []) => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; color: #333;">
  <header style="padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
    <img src="https://fh260.org/logo.png" alt="FH260 Logo" style="max-width: 200px; height: auto;">
  </header>

  <main style="padding: 25px 15px;">
    ${content}
  </main>

  <footer style="margin-top: 30px; padding: 20px; background: #f8f9fa; font-size: 0.9em; color: #666;">
    <p>© 2023 FH260 Financial System. All rights reserved.</p>
    <p>FH260 Headquarters | Nairobi, Kenya | Email: support@fh260.org</p>
    <p style="color: #999; margin-top: 15px;">
      This is an automated message. Please do not reply to this email.
    </p>
  </footer>
</div>
`;
      await transporter.sendMail({
        from: `"FH260 System" <${process.env.EMAIL_USER}>`,
        to: colleague.email,
        subject: `Approval Required for Request #${requestId}`,
        html: baseEmailTemplate(
          `
    <p>Dear ${colleague.name},</p>
    <p>${user.name} from FH-${
            user.country
          } has submitted a fund request requiring your approval:</p>
    
    <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #2c5282;">Request Summary</h3>
      <p><strong>Request ID:</strong> #${requestId}</p>
      <p><strong>Type:</strong> ${requestType}</p>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Sub-category:</strong> ${subCategory}</p>
      
      <h4 style="margin: 15px 0 10px 0; color: #2c5282;">Expense Breakdown</h4>
      ${itemsHtml}
      
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
        <p><strong>Transaction Cost:</strong> ${transactionCost || 0}</p>
        <p><strong>Total Request:</strong> ${totalRequest}</p>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <p style="margin-bottom: 20px; color: #4a5568;">Please review and take action:</p>
      <div style="display: inline-block; margin: 0 10px;">
        <a href="${
          process.env.BASE_URL
        }/api/requests/${requestId}/colleague-approve?token=${colleagueToken}"
           style="background: #48bb78; color: white; padding: 12px 25px; border-radius: 5px; text-decoration: none;">
           Approve Request
        </a>
      </div>
      <div style="display: inline-block; margin: 0 10px;">
        <a href="${
          process.env.BASE_URL
        }/api/requests/${requestId}/colleague-reject?token=${colleagueToken}"
           style="background: #f56565; color: white; padding: 12px 25px; border-radius: 5px; text-decoration: none;">
           Reject Request
        </a>
      </div>
    </div>

    ${
      attachments.length > 0
        ? `
    <div style="margin-top: 25px; padding: 15px; background: #fff7ed;">
      <h4 style="margin: 0 0 10px 0; color: #c05621;">Attachments (${
        attachments.length
      })</h4>
      <ul style="padding-left: 20px;">
        ${attachments
          .map(
            (a) => `
          <li>
            <a href="https://drive.google.com/uc?export=download&id=${
              a.drive_link.split("id=")[1]
            }"
               style="color: #2b6cb0; text-decoration: underline;">
               ${a.fileName}
            </a>
          </li>
        `
          )
          .join("")}
      </ul>
    </div>`
        : ""
    }
  `,
          attachments
        ),
      });
    }
    await connection.commit();
    res
      .status(201)
      .json({ message: "Request submitted for colleague approval" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Full Error Stack:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});
// Colleague Approval
app.get("/api/requests/:id/colleague-approve", async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { token } = req.query;
    const decodedToken = decodeURIComponent(token);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const bossToken = generateToken();
    await connection.query(
      `INSERT INTO boss_approvals (request_id, token)
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE token = VALUES(token)`,
      [id, bossToken]
    );

    // Validate approval
    const [approval] = await connection.query(
      `SELECT * FROM colleague_approvals 
       WHERE request_id = ? AND token = ?`,
      [id, decodedToken]
    );

    if (!approval.length) {
      await connection.rollback();
      console.error("Invalid token:", decodedToken);
      return res.status(400).send("Invalid approval link");
    }
    await connection.query(
      `DELETE FROM colleague_approvals 
         WHERE request_id = ? AND token = ?`,
      [id, decodedToken]
    );

    // Update request status and store colleague ID
    await connection.query(
      `UPDATE request_type 
       SET email_status = 'boss_pending', 
           colleague_approver_id = ?
       WHERE Id = ?`,
      [approval[0].colleague_id, id]
    );

    // Get requester and colleague details
    const [[request]] = await connection.query(
      `SELECT u.* FROM request_type rt
       JOIN users u ON rt.users_id = u.Id
       WHERE rt.Id = ?`,
      [id]
    );

    const [[colleague]] = await connection.query(
      `SELECT * FROM users WHERE Id = ?`,
      [approval[0].colleague_id]
    );

    // Send notification to requester
    const userTransporter = nodemailer.createTransport({
      host: "mail.fh260.org",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    await userTransporter.sendMail({
      from: `"<no-reply>" <${process.env.EMAIL_USER}>`,
      to: request.email,
      subject: "Request Forwarded to Senior",
      html: `
        <p>Dear ${request.name},</p>
        <p>Your request #${id} has been approved by ${colleague.name} and forwarded to the  senior approval.</p>
        <p>Best regards,<br>FH260 Admin Team</p>
      `,
    });

    // Send to boss
    const bossTransporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    // Get full request details with all expense items
    const [requestDetails] = await connection.query(
      `
  SELECT 
    rt.REQUEST_TYPE,
    c.NAME AS category,
    sc.NAME AS subCategory,
    ei.description,
    ei.Amount AS amount,
    ei.Quantity AS quantity,
    tr.Total_Amount,
    tr.Total_Request,
    tr.Transaction_Amount
  FROM request_type rt
  JOIN categories c ON rt.Id = c.request_type_id
  JOIN Subcategories sc ON c.Id = sc.Categories_id
  JOIN expense_item ei ON sc.Id = ei.Subcategories_id
  JOIN total_request tr ON rt.Id = tr.request_type_id
  WHERE rt.Id = ?
`,
      [id]
    );
    const [attachments] = await connection.query(
      "SELECT file_name, drive_link FROM attachments WHERE request_id = ?",
      [id]
    );
    // Build items list HTML
    const itemsHtml = requestDetails
      .map(
        (item, index) => `
  <div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #4a5568;">
    <p><strong>Item ${index + 1}:</strong></p>
    <p>Description: ${item.description}</p>
    <p>Amount: ${item.amount} x Quantity: ${item.quantity}</p>
    <p>Subtotal: ${item.amount * item.quantity}</p>
  </div>
`
      )
      .join("");

    await bossTransporter.sendMail({
      from: `"<no-reply>" <${process.env.EMAIL_USER}>`,
      to: process.env.BOSS_EMAIL,
      subject: `Fund Request #${id} from ${request.name} (Approved by ${colleague.name})`,
      html: `
    <p>Hello ${process.env.BOSS_NAME},</p>
    <p>${request.name} from FH-${request.country} has requested funds:</p>
    
    <div style="margin: 20px 0; padding: 20px; background: #f8f9fa;">
      <h3 style="margin-top: 0;">Request Details</h3>
      <p><strong>Type:</strong> ${requestDetails[0].REQUEST_TYPE}</p>
      <p><strong>Category:</strong> ${requestDetails[0].category}</p>
      <p><strong>Sub-category:</strong> ${requestDetails[0].subCategory}</p>
      
      <h4 style="margin: 15px 0 10px 0;">Expense Items:</h4>
      ${itemsHtml}
      
      <p style="margin-top: 20px;">
        <strong>Total Items:</strong> ${requestDetails[0].Total_Amount}<br>
        <strong>Transaction Cost:</strong> ${
          requestDetails[0].Transaction_Amount
        }<br>
        <strong>Total Request:</strong> ${requestDetails[0].Total_Request}
      </p>
    </div>

    <div style="margin-top: 20px; text-align: center;">
      <p style="margin-bottom: 15px; color: #4a5568;">Kindly Approve or Reject this Request:</p>
      <a href="${
        process.env.BASE_URL
      }/api/requests/${id}/boss-approve?token=${bossToken}"
         style="background: #4CAF50; color: white; padding: 10px 20px;">
         Approve
      </a>
          <a href="${
            process.env.BASE_URL
          }/api/requests/${id}/boss-reject?token=${bossToken}"
         style="background: #f44336; color: white; padding: 10px 20px;">
         Reject
      </a>
    </div>
    
    <p style="margin-top: 30px; color: #718096; font-size: 0.9em;">
      Request ID: ${id}<br>
      Submitted at: ${new Date().toLocaleString()}
    </p>
   ...
  <p>Attachments:</p>
  <ul>
    ${attachments
      .map(
        (a) => `
      <li>
        <a href="https://drive.google.com/uc?export=download&id=${
          a.drive_link.split("id=")[1]
        }" 
           download="${a.file_name}">
          ${a.file_name} (Click to Download)
        </a>
      </li>
    `
      )
      .join("")}
  </ul>
  ...
  `,
    });
    await connection.commit();
    res.send("Request forwarded to boss for approval");
  } catch (error) {
    await connection.rollback();
    console.error("Approval Error:", error);
    res.status(500).send("Error processing approval");
  } finally {
    if (connection) connection.release();
  }
});

// Colleague Rejection
app.get("/api/requests/:id/colleague-reject", async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { token } = req.query;
    const decodedToken = decodeURIComponent(token);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate rejection
    const [approval] = await connection.query(
      `SELECT * FROM colleague_approvals 
       WHERE request_id = ? AND token = ?`,
      [id, decodedToken]
    );

    if (!approval.length) {
      await connection.rollback();
      console.error("Invalid token:", decodedToken);
      return res.status(400).send("Invalid rejection link");
    }

    // Delete token immediately after validation
    await connection.query(
      `DELETE FROM colleague_approvals 
         WHERE request_id = ? AND token = ?`,
      [id, decodedToken]
    );

    // Update request status
    await connection.query(
      `UPDATE request_type 
       SET email_status = 'rejected', 
           colleague_approver_id = ?
       WHERE Id = ?`,
      [approval[0].colleague_id, id]
    );

    // Get requester and colleague details
    const [[request]] = await connection.query(
      `SELECT u.* FROM request_type rt
       JOIN users u ON rt.users_id = u.Id
       WHERE rt.Id = ?`,
      [id]
    );

    const [[colleague]] = await connection.query(
      `SELECT * FROM users WHERE Id = ?`,
      [approval[0].colleague_id]
    );

    // Send rejection email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    await transporter.sendMail({
      from: `"<no-reply>" <${process.env.EMAIL_USER}>`,
      to: request.email,
      subject: "Request Rejected by Colleague",
      html: `
        <p>Dear ${request.name},</p>
        <p>Your request #${id} has been rejected by ${colleague.name}.</p>
        <p>Please contact ${colleague.name} at ${colleague.email} for more information.</p>
        <p>Best regards,<br>FH260 Admin Team</p>
      `,
    });

    await connection.commit();
    res.send("Request rejected successfully");
  } catch (error) {
    await connection.rollback();
    console.error("Approval Error:", error);
    res.status(500).send("Error processing rejection");
  } finally {
    if (connection) connection.release();
  }
});
// Boss Approval
app.get("/api/requests/:id/boss-approve", async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { token } = req.query;
    const decodedToken = decodeURIComponent(token);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate boss token
    const [approval] = await connection.query(
      `SELECT * FROM boss_approvals 
       WHERE request_id = ? AND token = ?`,
      [id, decodedToken]
    );

    if (!approval.length) {
      await connection.rollback();
      return res.status(400).send("Invalid approval link");
    }

    // Update request status
    await connection.query(
      `UPDATE request_type 
       SET email_status = 'approved'
       WHERE Id = ?`,
      [id]
    );

    // Delete used token
    await connection.query(`DELETE FROM boss_approvals WHERE request_id = ?`, [
      id,
    ]);

    // Get requester details
    const [[user]] = await connection.query(
      `SELECT u.* FROM request_type rt
       JOIN users u ON rt.users_id = u.Id
       WHERE rt.Id = ?`,
      [id]
    );

    // Send final approval email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    await transporter.sendMail({
      from: `"<no-reply>" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Fund Request Approved",
      html: `
        <p>Dear ${user.name},</p>
        <p>We are pleased to inform you that your request #${id} for 
        funds has been fully approved and will be processed.</p>
        <p>Best regards,<br>FH260 Admin Team</p>
      `,
    });

    await connection.commit();
    res.send("Request fully approved");
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send("Error processing approval");
  } finally {
    if (connection) connection.release();
  }
});

// Boss Rejection
app.get("/api/requests/:id/boss-reject", async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { token } = req.query;
    const decodedToken = decodeURIComponent(token);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate boss token
    const [approval] = await connection.query(
      `SELECT * FROM boss_approvals 
       WHERE request_id = ? AND token = ?`,
      [id, decodedToken]
    );

    if (!approval.length) {
      await connection.rollback();
      return res.status(400).send("Invalid rejection  link");
    }

    // Update request status
    await connection.query(
      `UPDATE request_type 
       SET email_status = 'rejected'
       WHERE Id = ?`,
      [id]
    );

    // Delete used token
    await connection.query(`DELETE FROM boss_approvals WHERE request_id = ?`, [
      id,
    ]);

    // Get requester details
    const [[user]] = await connection.query(
      `SELECT u.* FROM request_type rt
       JOIN users u ON rt.users_id = u.Id
       WHERE rt.Id = ?`,
      [id]
    );

    // Send final approval email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    await transporter.sendMail({
      from: `"<no-reply>" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Fund Request Rejected",
      html: `
        <p>Dear ${user.name},</p>
        <p>We regret to inform you that your request #${id} for 
        funds has been rejected.Kindly contact Mrs.${process.env.BOSS_NAME} for further details</p>
        <p>Best regards,<br>FH260 Admin Team</p>
      `,
    });

    await connection.commit();
    res.send("Request rejected");
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send("Error processing rejection");
  } finally {
    if (connection) connection.release();
  }
});
// Get pending receipts for a user
app.get("/api/receipts/pending", authenticateJWT, async (req, res) => {
  try {
    // Get userId from query, default to logged-in user if not provided
    const userId = req.query.userId || req.user.Id;

    const [results] = await pool.query(
      `
      SELECT rt.Id AS reference, tr.Total_Amount AS amount, tr.Balance_amount AS balance, 
             tr.currency_code, rt.submission_time
      FROM request_type rt
      JOIN total_request tr ON rt.Id = tr.request_type_id
      WHERE rt.users_id = ? AND rt.email_status = 'approved' AND tr.clearance_status = 'uncleared'

    `,
      [userId]
    );

    res.json(results);
  } catch (error) {
    console.error("Fetch receipts error:", error);
    res.status(500).json({ error: "Error fetching receipts" });
  }
});

// Clear receipt and update status
app.post("/api/receipts/clear", authenticateJWT, async (req, res) => {
  const { reference, amount, driveLink, fileType, fileName } = req.body;

  try {
    const [requestResult] = await pool.query(
      "SELECT Total_Amount, Balance_amount, receipt_amount, currency_code FROM total_request WHERE request_type_id = ?",
      [reference]
    );

    if (requestResult.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    const total = parseFloat(requestResult[0].Total_Amount);
    const currentBalance = parseFloat(requestResult[0].Balance_amount);
    const currentReceiptAmount = parseFloat(requestResult[0].receipt_amount);
    const currencyCode = requestResult[0].currency_code;

    // If this is the first clearance, assume full amount is remaining
    const balanceToUse = currentBalance === 0 ? total : currentBalance;

    const newBalance = Math.max(0, balanceToUse - amount);
    const newReceiptAmount = currentReceiptAmount + amount;
    const clearanceStatus = newBalance === 0 ? "cleared" : "uncleared";

    // Update total_request table
    await pool.query(
      "UPDATE total_request SET Balance_amount = ?, clearance_status = ?, receipt_amount = ? WHERE request_type_id = ?",
      [newBalance, clearanceStatus, newReceiptAmount, reference]
    );

    // Update receipts_table status
    await pool.query(
      "UPDATE receipts_table SET receipt_status = 'uploaded' WHERE request_type_id = ?",
      [reference]
    );

    // Insert attachment record
    await pool.query(
      "INSERT INTO attachments (request_id, file_type, drive_link, file_name) VALUES (?, ?, ?, ?)",
      [reference, fileType, driveLink, fileName]
    );

    // Format the response message with currency
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode || "USD",
    });

    const formattedBalance = formatter.format(newBalance);
    const formattedCleared = formatter.format(newReceiptAmount);

    res.json({
      message: `Receipt updated. Remaining balance: ${formattedBalance}, total cleared: ${formattedCleared}`,
      currencyCode: currencyCode,
    });
  } catch (err) {
    console.error("Clearance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/users/same-country", authenticateJWT, async (req, res) => {
  const userId = req.user.Id;

  try {
    const [[user]] = await pool.query(
      "SELECT name, country FROM users WHERE Id = ?",
      [userId]
    );

    const [users] = await pool.query(
      "SELECT Id, name FROM users WHERE country = ? AND Id != ?",
      [user.country, userId]
    );

    // Return current user separately
    res.json([{ Id: userId, name: `${user.name} (You)` }, ...users]);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Could not fetch users." });
  }
});

app.get("/api/user-summary", authenticateJWT, async (req, res) => {
  const userId = req.user.Id;
  try {
    // Get the summary with the user's currency code
    const [summary] = await pool.query(
      `
      SELECT 
        IFNULL(SUM(tr.Total_Amount), 0) AS expenditureAmount,
        IFNULL(SUM(tr.Balance_amount), 0) AS balanceAmount,
        IFNULL(SUM(tr.receipt_amount), 0) AS receiptsAmount,
        # Get the user's currency code or default to KES
        IFNULL(
          (SELECT tr2.currency_code 
           FROM total_request tr2 
           JOIN request_type rt2 ON rt2.Id = tr2.request_type_id 
           WHERE rt2.users_id = ? AND rt2.email_status = 'approved' AND tr2.currency_code IS NOT NULL
           LIMIT 1),
          'KES'
        ) AS currency_code
      FROM request_type rt
      JOIN total_request tr ON rt.Id = tr.request_type_id
      WHERE rt.users_id = ? AND rt.email_status = 'approved'
      `,
      [userId, userId]
    );

    // If no data found, create default structure
    const result =
      summary.length > 0
        ? summary[0]
        : {
            expenditureAmount: 0,
            balanceAmount: 0,
            receiptsAmount: 0,
            currency_code: "$",
          };

    res.json(result);
  } catch (error) {
    console.error("User Summary Error:", error);
    res.status(500).json({ error: "Failed to load user summary." });
  }
});
// Admin Filter Options (Countries)
app.get("/api/admin/filters", authenticateJWT, async (req, res) => {
  const [rows] = await pool.query("SELECT DISTINCT country FROM users");
  const countries = rows.map((r) => r.country);
  res.json({ countries });
});

// Admin Users by Country
app.get("/api/admin/users", authenticateJWT, async (req, res) => {
  const country = req.query.country;
  const [rows] = await pool.query("SELECT name FROM users WHERE country = ?", [
    country,
  ]);
  const users = rows.map((r) => r.name);
  res.json({ users });
});

// Admin Receipts Fetch
app.get("/api/admin/receipts", authenticateJWT, async (req, res) => {
  const { receiptType, country, user } = req.query;

  let query = `
      SELECT 
    u.name, 
    rt.Id AS reference, 
    tr.Total_Amount AS total_amount, 
    tr.Balance_amount AS balance_amount,
    tr.currency_code,
    rt.submission_time, 
    u.country, 
    r.receipt_status,
    a.drive_link
  FROM receipts_table r
  JOIN total_request tr ON r.request_type_id = tr.request_type_id
  JOIN request_type rt ON rt.Id = tr.request_type_id
  JOIN users u ON rt.users_id = u.Id
  LEFT JOIN attachments a ON a.request_id = rt.Id
  WHERE r.receipt_status = ?
  
    `;
  const params = [receiptType];

  if (country !== "All") {
    query += " AND u.country = ?";
    params.push(country);
  }

  if (user !== "All") {
    query += " AND u.name = ?";
    params.push(user);
  }

  const [rows] = await pool.query(query, params);
  res.json({ receipts: rows });
});
app.get("/api/user/receipts", authenticateJWT, async (req, res) => {
  const userId = req.user.Id;

  // Get logged in user's country
  const [[user]] = await pool.query("SELECT country FROM users WHERE Id = ?", [
    userId,
  ]);

  const { duration } = req.query; // e.g., '1-MONTH', 'ANNUALLY'

  let query = `
    SELECT u.name, rt.Id AS reference, tr.Total_Amount AS total_amount,
           tr.Balance_amount AS balance_amount, tr.currency_code, 
           rt.submission_time, a.drive_link
    FROM receipts_table r
    JOIN total_request tr ON r.request_type_id = tr.request_type_id
    JOIN request_type rt ON rt.Id = tr.request_type_id
    JOIN users u ON rt.users_id = u.Id
    LEFT JOIN attachments a ON a.request_id = rt.Id
    WHERE r.receipt_status = 'uploaded'
  `;

  const params = [];

  // Apply country rule
  if (user.country === "Kenya") {
    query += " AND u.country = ?";
    params.push("Kenya");
  } else {
    query += " AND u.Id = ?";
    params.push(userId);
  }

  // Apply duration filter
  if (duration === "1-MONTH") {
    query += " AND rt.submission_time >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)";
  } else if (duration === "QUARTERLY") {
    query += " AND rt.submission_time >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)";
  } else if (duration === "HALF-YEARLY") {
    query += " AND rt.submission_time >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)";
  } else if (duration === "THREE-QUARTER") {
    query += " AND rt.submission_time >= DATE_SUB(CURDATE(), INTERVAL 9 MONTH)";
  } else if (duration === "ANNUALLY") {
    query += " AND rt.submission_time >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
  }

  const [rows] = await pool.query(query, params);
  res.json({ receipts: rows });
});
const PORT = process.env.PORT || 3000;
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
