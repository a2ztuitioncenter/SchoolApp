import { feeModel } from '../models/Fee.js';

export const addFee = async (req, res) => {
  try {
    // Accept both camelCase and snake_case from frontend
    const studentId = req.body.studentId || req.body.student_id;
    const dueDate = req.body.dueDate || req.body.due_date;
    const { amount, description } = req.body;
    if (!studentId || !amount || !dueDate)
      return res.status(400).json({ error: 'studentId, amount, dueDate required' });
    const fee = await feeModel.addFee({ studentId, amount, description, dueDate });
    res.status(201).json({ message: 'Fee added', data: fee });
  } catch (err) {
    console.error('addFee:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getAllFees = async (req, res) => {
  try {
    res.json({ data: await feeModel.getAll() });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getUnpaidFees = async (req, res) => {
  try {
    res.json({ data: await feeModel.getUnpaid() });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getFeesByStudent = async (req, res) => {
  try {
    res.json({ data: await feeModel.getByStudent(req.params.student_id) });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const markPaid = async (req, res) => {
  try {
    const fee = await feeModel.markPaid(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee not found' });
    res.json({ message: 'Marked as paid', data: fee });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const markUnpaid = async (req, res) => {
  try {
    const fee = await feeModel.markUnpaid(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee not found' });
    res.json({ message: 'Marked as unpaid', data: fee });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const deleteFee = async (req, res) => {
  try {
    const deleted = await feeModel.deleteFee(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Fee not found' });
    res.json({ message: 'Fee deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getFeeStats = async (req, res) => {
  try {
    res.json({ data: await feeModel.getStats() });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};