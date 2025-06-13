const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  subdomain: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  gid: {
    type: DataTypes.STRING,
    allowNull: false
  },
  accessToken: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  refreshToken: {
    type: DataTypes.TEXT
  },
  expiresAt: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true
});

module.exports = User;