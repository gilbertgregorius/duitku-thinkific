const User = require('./User');
const Payment = require('./Payment');

// Define associations
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  User,
  Payment
};
