const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MessageLog = sequelize.define('MessageLog', {
  from: { type: DataTypes.STRING },
  to: { type: DataTypes.STRING },
  content: { type: DataTypes.TEXT },
  flow_id: { type: DataTypes.INTEGER, allowNull: true },
  is_ai: { type: DataTypes.BOOLEAN, defaultValue: false }
});

module.exports = MessageLog;
