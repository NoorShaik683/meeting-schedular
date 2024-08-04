const express = require('express')
const calendarController = require('../controllers/calendarController')
const router = express.Router()

router.get('/auth', calendarController.auth)
router.get('/oauth2callback', calendarController.oauth2callback)
router.post('/get-scheduled-events',calendarController.authenticateRequest, calendarController.getScheduledevents)
router.post('/get-slots', calendarController.authenticateRequest, calendarController.getAvailableSlots)
router.post('/create-event', calendarController.authenticateRequest, calendarController.createEvent)
router.delete('/delete-event/:eventId', calendarController.authenticateRequest, calendarController.deleteEvent)
router.patch('/update-event/:eventId', calendarController.authenticateRequest, calendarController.updateEvent)

module.exports =  router 