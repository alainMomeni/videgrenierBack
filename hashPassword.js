// backend/hashPassword.js
const bcrypt = require('bcryptjs');

const password = 'kazamaStyle'; // <-- Mettez votre mot de passe ici

bcrypt.genSalt(10, (err, salt) => {
  bcrypt.hash(password, salt, (err, hash) => {
    if (err) throw err;
    console.log('--- Copiez ce hash ---');
    console.log(hash);
    console.log('-----------------------');
  });
});