export const getContent = async (req, res) => {
    const { type } = req.query;
    const pool = req.db;

    if (!type) {
        return res.status(400).json({ success: false, error: 'Content type is required' });
    }

    // Map requested types to database keys
    const typeMap = {
        'help_support': 'help',
        'contact': 'contact',
        'contact_us': 'contact',
        'about': 'learn-more',
        'about_us': 'learn-more'
    };

    const key = typeMap[type] || type;

    try {
        const result = await pool.query(
            'SELECT key, content, updated_at FROM content_pages WHERE key = $1',
            [key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Content not found for type: ${type}` });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Content Fetch Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch content' });
    }
};
