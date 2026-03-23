// parentRoutes.js - Parent portal endpoints
import express from 'express';

const router = express.Router();

/**
 * GET /api/parent/children/:parentUserId
 * Returns: List of children linked to parent account
 */
router.get('/children/:parentUserId', async (req, res) => {
  try {
    const { parentUserId } = req.params;
    const pool = req.db;

    console.log(`Fetching children for parent: ${parentUserId}`);

    // For now, return mock data
    // In production, would query a parent_children junction table
    const mockChildren = [
      {
        id: 'student-001',
        name: 'Rahul Kumar',
        classLevel: '10',
        section: 'A',
        rollNumber: '001',
        joinDate: '2023-04-01',
      },
      {
        id: 'student-002',
        name: 'Priya Kumar',
        classLevel: '8',
        section: 'B',
        rollNumber: '015',
        joinDate: '2023-04-15',
      },
    ];

    return res.json({
      success: true,
      children: mockChildren,
    });
  } catch (error) {
    console.error('Error fetching children:', error);
    return res.status(500).json({ error: 'Failed to fetch children' });
  }
});

/**
 * GET /api/parent/attendance/:parentUserId
 * Returns: Combined attendance data for all children
 */
router.get('/attendance/:parentUserId', async (req, res) => {
  try {
    const { parentUserId } = req.params;
    const pool = req.db;

    console.log(`Fetching attendance for parent: ${parentUserId}`);

    // For now, return mock data
    const mockAttendance = {
      success: true,
      data: {
        avgAttendance: 92,
        totalClasses: 120,
        daysPresent: 110,
        daysAbsent: 10,
        children: [
          {
            childName: 'Rahul Kumar',
            attendance: 95,
            presentDays: 114,
            totalDays: 120,
          },
          {
            childName: 'Priya Kumar',
            attendance: 88,
            presentDays: 106,
            totalDays: 120,
          },
        ],
      },
    };

    return res.json(mockAttendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

/**
 * GET /api/parent/fees/:parentUserId
 * Returns: Fees status and payment records
 */
router.get('/fees/:parentUserId', async (req, res) => {
  try {
    const { parentUserId } = req.params;
    const pool = req.db;

    console.log(`Fetching fees for parent: ${parentUserId}`);

    // For now, return mock data
    const mockFees = {
      success: true,
      data: {
        totalFees: 60000,
        paid: 40000,
        pending: 15000,
        overdue: 5000,
        fees: [
          {
            month: 'January 2024',
            amount: 5000,
            dueDate: '2024-01-10',
            status: 'paid',
          },
          {
            month: 'February 2024',
            amount: 5000,
            dueDate: '2024-02-10',
            status: 'paid',
          },
          {
            month: 'March 2024',
            amount: 5000,
            dueDate: '2024-03-10',
            status: 'pending',
          },
          {
            month: 'April 2024',
            amount: 5000,
            dueDate: '2024-04-10',
            status: 'pending',
          },
          {
            month: 'May 2024',
            amount: 5000,
            dueDate: '2024-05-10',
            status: 'overdue',
          },
        ],
      },
    };

    return res.json(mockFees);
  } catch (error) {
    console.error('Error fetching fees:', error);
    return res.status(500).json({ error: 'Failed to fetch fees' });
  }
});

/**
 * GET /api/parent/homework/:parentUserId
 * Returns: Recent homework assignments for child
 */
router.get('/homework/:parentUserId', async (req, res) => {
  try {
    const { parentUserId } = req.params;
    const pool = req.db;

    console.log(`Fetching homework for parent: ${parentUserId}`);

    // For now, return mock data
    const mockHomework = {
      success: true,
      homework: [
        {
          id: 'hw-001',
          subject: 'Mathematics',
          topic: 'Quadratic Equations',
          dueDate: '2024-01-20',
          description: 'Solve exercises 4.1 to 4.5',
          status: 'pending',
        },
        {
          id: 'hw-002',
          subject: 'English',
          topic: 'Essay Writing',
          dueDate: '2024-01-22',
          description: 'Write an essay on "Technology and Society"',
          status: 'pending',
        },
        {
          id: 'hw-003',
          subject: 'Science',
          topic: 'pH and Acidity',
          dueDate: '2024-01-25',
          description: 'Complete the lab report',
          status: 'pending',
        },
        {
          id: 'hw-004',
          subject: 'History',
          topic: 'Medieval India',
          dueDate: '2024-01-19',
          description: 'Answer unit questions',
          status: 'completed',
        },
      ],
    };

    return res.json(mockHomework);
  } catch (error) {
    console.error('Error fetching homework:', error);
    return res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

/**
 * GET /api/parent/performance/:parentUserId
 * Returns: Child's academic performance metrics
 */
router.get('/performance/:parentUserId', async (req, res) => {
  try {
    const { parentUserId } = req.params;
    const pool = req.db;

    console.log(`Fetching performance for parent: ${parentUserId}`);

    // For now, return mock data
    const mockPerformance = {
      success: true,
      data: {
        testAverage: 85,
        homeworkScore: 90,
        participation: 80,
        overallGrade: 'A',
        subjects: [
          { subject: 'Mathematics', score: 88, grade: 'A' },
          { subject: 'English', score: 82, grade: 'B+' },
          { subject: 'Science', score: 87, grade: 'A' },
          { subject: 'Social Studies', score: 85, grade: 'A' },
        ],
      },
    };

    return res.json(mockPerformance);
  } catch (error) {
    console.error('Error fetching performance:', error);
    return res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

/**
 * GET /api/parent/messages/:parentUserId
 * Returns: Recent messages from teachers
 */
router.get('/messages/:parentUserId', async (req, res) => {
  try {
    const { parentUserId } = req.params;
    const pool = req.db;

    console.log(`Fetching messages for parent: ${parentUserId}`);

    // For now, return mock data
    const mockMessages = {
      success: true,
      messages: [
        {
          id: 'msg-001',
          teacherName: 'Mrs. Sharma',
          subject: 'Mathematics',
          message: 'Rahul is doing well in mathematics. Keep it up!',
          date: '2024-01-15',
          read: true,
        },
        {
          id: 'msg-002',
          teacherName: 'Mr. Patel',
          subject: 'English',
          message: 'Rahul needs to work on his essay writing skills.',
          date: '2024-01-14',
          read: true,
        },
        {
          id: 'msg-003',
          teacherName: 'Dr. Singh',
          subject: 'Science',
          message: 'Great performance in the science test!',
          date: '2024-01-10',
          read: false,
        },
      ],
    };

    return res.json(mockMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/parent/messages/send
 * Send a message to teacher
 */
router.post('/messages/send', async (req, res) => {
  try {
    const { parentUserId, teacherId, message } = req.body;
    const pool = req.db;

    console.log(`Sending message from parent ${parentUserId} to teacher ${teacherId}`);

    // For now, just return success
    return res.json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
