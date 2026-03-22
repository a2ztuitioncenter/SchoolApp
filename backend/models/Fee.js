// Fee.js - Fee model for tracking student fees and payments
export const feeModel = {
  table: 'fees',
  schema: `
    CREATE TABLE IF NOT EXISTS fees (
      id SERIAL PRIMARY KEY,
      studentId INT NOT NULL,
      userId INT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      dueDate DATE,
      paidDate DATE,
      isPaid BOOLEAN DEFAULT FALSE,
      paymentMethod VARCHAR(50) CHECK (paymentMethod IN ('cash', 'check', 'online', 'bank_transfer')),
      receiptNumber VARCHAR(50),
      month VARCHAR(50),
      academicYear VARCHAR(20),
      schoolId VARCHAR(50) NOT NULL DEFAULT 'school-001',
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_fees_studentId ON fees(studentId);
    CREATE INDEX IF NOT EXISTS idx_fees_userId ON fees(userId);
    CREATE INDEX IF NOT EXISTS idx_fees_isPaid ON fees(isPaid);
    CREATE INDEX IF NOT EXISTS idx_fees_dueDate ON fees(dueDate);
    CREATE INDEX IF NOT EXISTS idx_fees_schoolId ON fees(schoolId);
  `,
};

// Helper to get pending fees for a student
export const getPendingFees = async (pool, studentId) => {
  try {
    const result = await pool.query(
      'SELECT * FROM fees WHERE studentId = $1 AND isPaid = FALSE ORDER BY dueDate ASC',
      [studentId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching pending fees:', error);
    throw error;
  }
};

// Helper to calculate total pending amount
export const getTotalPendingAmount = async (pool, studentId) => {
  try {
    const result = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM fees WHERE studentId = $1 AND isPaid = FALSE',
      [studentId]
    );
    return parseFloat(result.rows[0].total);
  } catch (error) {
    console.error('Error calculating pending amount:', error);
    throw error;
  }
};

// Helper to get all fees for a student
export const getAllStudentFees = async (pool, studentId) => {
  try {
    const result = await pool.query(
      'SELECT * FROM fees WHERE studentId = $1 ORDER BY createdAt DESC',
      [studentId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching all student fees:', error);
    throw error;
  }
};

// Helper to create a fee record
export const createFee = async (pool, feeData) => {
  const {
    studentId,
    userId,
    amount,
    dueDate,
    month,
    academicYear,
    schoolId = 'school-001',
    paymentMethod,
    notes,
  } = feeData;

  try {
    const result = await pool.query(
      `INSERT INTO fees 
       (studentId, userId, amount, dueDate, month, academicYear, schoolId, paymentMethod, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [studentId, userId, amount, dueDate, month, academicYear, schoolId, paymentMethod, notes]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error creating fee:', error);
    throw error;
  }
};

// Helper to mark fee as paid
export const markFeeAsPaid = async (pool, feeId, paymentMethod, receiptNumber) => {
  try {
    const paidDate = new Date();
    const result = await pool.query(
      `UPDATE fees 
       SET isPaid = TRUE, paidDate = $1, paymentMethod = $2, receiptNumber = $3, updatedAt = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [paidDate, paymentMethod, receiptNumber, feeId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error marking fee as paid:', error);
    throw error;
  }
};

// Performance optimization: Get fees summary for a student
export const getFeesSummary = async (pool, studentId) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as totalRecords,
        COALESCE(SUM(amount), 0) as totalAmount,
        COALESCE(SUM(CASE WHEN isPaid = TRUE THEN amount ELSE 0 END), 0) as totalPaid,
        COALESCE(SUM(CASE WHEN isPaid = FALSE THEN amount ELSE 0 END), 0) as totalPending,
        SUM(CASE WHEN isPaid = TRUE THEN 1 ELSE 0 END) as paidCount,
        SUM(CASE WHEN isPaid = FALSE THEN 1 ELSE 0 END) as pendingCount
       FROM fees WHERE studentId = $1`,
      [studentId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching fees summary:', error);
    throw error;
  }
};
