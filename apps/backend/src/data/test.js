import bcrypt from 'bcryptjs'
console.log(await bcrypt.hash('123456', 10))