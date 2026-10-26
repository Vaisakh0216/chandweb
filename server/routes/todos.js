const express = require('express');
const router = express.Router();
const { getTodos, getAssignees, createTodo, updateTodo, deleteTodo, clearCompleted } = require('../controllers/todoController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/assignees', getAssignees);
router.delete('/completed', clearCompleted);
router.route('/').get(getTodos).post(createTodo);
router.route('/:id').put(updateTodo).delete(deleteTodo);

module.exports = router;
