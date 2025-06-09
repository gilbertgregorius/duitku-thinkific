const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');

// POST /api/enrollment
router.post('/', enrollmentController.enrollUser);

module.exports = router;
