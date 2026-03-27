const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Flow = sequelize.define('Flow', {
  name: { type: DataTypes.STRING, allowNull: false },
  nodes: { type: DataTypes.JSON, allowNull: false, defaultValue: [] }
});

module.exports = Flow;
