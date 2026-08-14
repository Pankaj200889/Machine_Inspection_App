const bcrypt = require('../server/node_modules/bcryptjs');
const hash = '$2b$10$r8ENIRSJPEUB13ztb4U.Z.jLqhbaJvMGraDL.1sJr4cjjlvmNC/b2';
const password = 'Admin@124578';
console.log("Match:", bcrypt.compareSync(password, hash));
