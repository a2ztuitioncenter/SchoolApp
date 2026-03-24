import { feeModel } from '../models/Fee.js';

export const addFee = async (req, res) => {
  try {
    const { student_id, amount, description, due_date } = req.body;
    if (!student_id || !amount || !due_date)
      return res.status(400).json({ error: 'student_id, amount, due_date required' });
    const fee = await feeModel.addFee({ student_id, amount, description, due_date });
    res.status(201).json({ message: 'Fee added', data: fee });
  } catch (err) {
    console.error('addFee:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAllFees = async (req, res) => {
  try {
    res.json({ data: await feeModel.getAll() });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getUnpaidFees = async (req, res) => {
  try {
    res.json({ data: await feeModel.getUnpaid() });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFeesByStudent = async (req, res) => {
  try {
    res.json({ data: await feeModel.getByStudent(req.params.student_id) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const markPaid = async (req, res) => {
  try {
    const fee = await feeModel.markPaid(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee not found' });
    res.json({ message: 'Marked as paid', data: fee });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const markUnpaid = async (req, res) => {
  try {
    const fee = await feeModel.markUnpaid(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee not found' });
    res.json({ message: 'Marked as unpaid', data: fee });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteFee = async (req, res) => {
  try {
    const deleted = await feeModel.deleteFee(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Fee not found' });
    res.json({ message: 'Fee deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFeeStats = async (req, res) => {
  try {
    res.json({ data: await feeModel.getStats() });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};