const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Connection = sequelize.define('Connection', {
  name: { type: DataTypes.STRING, allowNull: false },
  session_id: { type: DataTypes.STRING, allowNull: false, unique: true },
  status: { type: DataTypes.STRING, defaultValue: 'pending' }, // pending, authenticated, ready, disconnected
  qrCode: { type: DataTypes.TEXT, allowNull: true } // Storing last QR temporarily
});

module.exports = Connection;
