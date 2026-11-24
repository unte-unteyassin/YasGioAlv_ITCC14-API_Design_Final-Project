const WASTE_TYPES = ['pc_monitor', 'air_conditioner', 'lights_fans', 'other_electronics', 'other'];
const REPORT_STATUSES = ['pending', 'verified', 'resolved'];

function isNonEmptyString(value, { min = 1, max = Infinity } = {}) {
  return typeof value === 'string' && value.trim().length >= min && value.length <= max;
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidLaboratoryCode(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,30}$/.test(value);
}

module.exports = {
  WASTE_TYPES,
  REPORT_STATUSES,
  isNonEmptyString,
  isValidEmail,
  isValidLaboratoryCode,
};
