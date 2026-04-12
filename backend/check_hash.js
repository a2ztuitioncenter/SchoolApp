const bcrypt = require('bcryptjs');
const hash = '$2a$10$w/PfOkdq2S37SVLK9lVL.eZuXz.6bv0uXFCve6kmhJ5dWbsX5ZqKC';
console.log('muslim:', bcrypt.compareSync('muslim', hash));
console.log('musllim:', bcrypt.compareSync('musllim', hash));
