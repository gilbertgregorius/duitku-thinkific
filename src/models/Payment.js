const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  userId: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'IDR'
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'expired'),
    defaultValue: 'pending'
  },
  duitkuReference: DataTypes.STRING,
  paymentUrl: DataTypes.TEXT,
  thinkificOrderId: DataTypes.STRING,
  webhookReceived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['orderId'] },
    { fields: ['status'] },
    { fields: ['userId'] }
  ]
});

module.exports = Payment;