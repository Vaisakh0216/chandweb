const express = require('express');
const router = express.Router();
const { getIndents, getIndent, createIndent, updateIndent, deleteIndent } = require('../controllers/indentController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getIndents).post(createIndent);
router.route('/:id').get(getIndent).put(updateIndent).delete(deleteIndent);

module.exports = router;
