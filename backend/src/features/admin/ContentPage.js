/**
 * ContentPage.js - Model for dynamic content pages (Programs, Help, Privacy, etc.)
 */
export const contentPageModel = {
    schema: `
        CREATE TABLE IF NOT EXISTS content_pages (
            id SERIAL PRIMARY KEY,
            key VARCHAR(50) UNIQUE NOT NULL,
            content TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,
    baselineData: [
        {
            key: 'help',
            content: `<h3>Help & Support</h3><p>Welcome to the A2Z Tuition Help Center. How can we help you today?</p><ul><li><b>Student Support:</b> Contact your teacher for academic queries.</li><li><b>Technical Support:</b> Email support@a2ztuition.com</li><li><b>Billing:</b> Visit the Fees section in your dashboard.</li></ul>`
        },
        {
            key: 'documentation',
            content: `<h3>Documentation</h3><p>Learn how to use the A2Z Tuition ERP system effectively.</p><h4>Getting Started</h4><p>1. Log in with your registered phone number.<br>2. Check your daily timetable on the dashboard.<br>3. Submit homework through the Homework module.</p>`
        },
        {
            key: 'programs',
            content: `<h3>Our Programs</h3><p>We offer a wide range of academic programs tailored for excellence.</p><ul><li><b>Secondary Schooling:</b> Comprehensive coaching for Class 9-10.</li><li><b>Higher Secondary:</b> Specialized streams for Science, Commerce, and Arts.</li><li><b>Competitive Exams:</b> JEE, NEET, and Olympiad preparation.</li></ul>`
        },
        {
            key: 'resources',
            content: `<h3>Learning Resources</h3><p>Access curated materials to boost your learning.</p><ul><li><b>Digital Library:</b> eBooks and reference papers.</li><li><b>Video Lectures:</b> Recorded sessions for revision.</li><li><b>Practice Tests:</b> Weekly assessments and mock exams.</li></ul>`
        },
        {
            key: 'contact',
            content: `<h3>Contact Us</h3><p>Get in touch with us for any inquiries.</p><p><b>Address:</b> 123 Education Lane, Learning City<br><b>Phone:</b> +91 70867 95477<br><b>Email:</b> info@a2ztuition.com</p>`
        },
        {
            key: 'privacy',
            content: `<h3>Privacy Policy</h3><p>Your privacy is important to us. This policy explains how we handle your data.</p><p>1. We only collect data necessary for academic management.<br>2. Your information is never shared with third parties.<br>3. You can request data deletion by contacting the administrator.</p>`
        },
        {
            key: 'learn-more',
            content: `<h3>About A2Z Tuition</h3><p>A2Z Tuition is dedicated to providing high-quality education through modern technology and expert faculty. Our mission is to empower students with knowledge and skills for a bright future.</p>`
        },
        {
            key: 'terms',
            content: `<h3>Terms of Service</h3><p>By using our platform, you agree to comply with our academic guidelines and code of conduct.</p>`
        }
    ]
};
