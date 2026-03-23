import Fee from '../models/Fee.js';

export const addFee = async (req, res) => {
  try {
    const { student_id, amount, description, due_date } = req.body;
    if (!student_id || !amount || !due_date)
      return res.status(400).json({ error: 'student_id, amount, due_date required' });
    const fee = await Fee.addFee({ student_id, amount, description, due_date });
    res.status(201).json({ message: 'Fee added', data: fee });
  } catch (err) {
    console.error('addFee:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAllFees = async (req, res) => {
  try {
    res.json({ data: await Fee.getAll() });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getUnpaidFees = async (req, res) => {
  try {
    res.json({ data: await Fee.getUnpaid() });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFeesByStudent = async (req, res) => {
  try {
    res.json({ data: await Fee.getByStudent(req.params.student_id) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const markPaid = async (req, res) => {
  try {
    const fee = await Fee.markPaid(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee not found' });
    res.json({ message: 'Marked as paid', data: fee });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const markUnpaid = async (req, res) => {
  try {
    const fee = await Fee.markUnpaid(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee not found' });
    res.json({ message: 'Marked as unpaid', data: fee });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteFee = async (req, res) => {
  try {
    const deleted = await Fee.deleteFee(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Fee not found' });
    res.json({ message: 'Fee deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFeeStats = async (req, res) => {
  try {
    res.json({ data: await Fee.getStats() });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};