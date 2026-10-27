const express = require('express');
const router = express.Router();
const {
  getEmployees, getEmployeesDropdown, getEmployee, getEmployeeEntries,
  createEmployee, updateEmployee, deleteEmployee,
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');

const canEdit = authorize('admin', 'manager');

router.use(protect);
router.get('/dropdown', getEmployeesDropdown);
router.route('/').get(getEmployees).post(canEdit, createEmployee);
router.route('/:id')
  .get(getEmployee)
  .put(canEdit, updateEmployee)
  .delete(authorize('admin'), deleteEmployee);
router.get('/:id/entries', getEmployeeEntries);

module.exports = router;
