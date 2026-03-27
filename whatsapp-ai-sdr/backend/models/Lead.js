const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Lead = sequelize.define('Lead', {
  name: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: false, unique: true },
  status: { type: DataTypes.STRING, defaultValue: 'novo' },
  intent: { type: DataTypes.STRING, defaultValue: 'none' },
  last_message: { type: DataTypes.TEXT, allowNull: true },
  active_flow_id: { type: DataTypes.INTEGER, allowNull: true },
  active_flow_node_id: { type: DataTypes.STRING, allowNull: true }
});

module.exports = Lead;
