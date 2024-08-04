const {authenticate} = require('@google-cloud/local-auth')
const {google} = require('googleapis')
const dotenv = require('dotenv')
const url = require('url');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { start } = require('repl');


dotenv.config()

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);


const auth  =  async (req, res) => {
  const authUrl = await oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  res.redirect(authUrl);
}



const oauth2callback =  async (req, res) => {
  try {
    const { code } = req.query;
    if (code) {
      const { tokens } = await oauth2Client.getToken(code);
      fs.writeFileSync(path.join(__dirname, '../token.json'), JSON.stringify(tokens));
      oauth2Client.setCredentials(tokens);
      res.status(200).send("You are authenticated. Start Using APIS.")
    } else {
      res.status(400).send('Missing authorization code');
    }
  } catch (error) {
    console.error('Error during token exchange:', error);
    res.status(500).send('Token exchange failed');
  }
};

// Read tokens from file
const loadTokens = () => {
    try {
      const tokenPath = path.join(__dirname, '../token.json');
      if (fs.existsSync(tokenPath)) {
        return JSON.parse(fs.readFileSync(tokenPath));
      }
      return null;
    } catch (error) {
      console.error('Error loading tokens:', error);
      return null;
    }
  };
  
const authenticateRequest = (req, res, next) => {
    const tokens = loadTokens();
    if (!tokens) {
      return res.status(401).send('Unauthorized');
    }
  
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);
  
    // Verify token validity (optional, check token expiration)
    google.oauth2('v2').tokeninfo({ access_token: tokens.access_token }, (err, response) => {
        if (err || response.data.error) {
            return res.status(401).send('Unauthorized');
        }
    
        // Attach OAuth2 client to request object for use in API handlers
        req.oauth2Client = oauth2Client;
        next();
    });
  };

const getScheduledevents =  async (req, res) => {
  try {
    

    const {startDate,endDate,timezone} = req.body
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0); // Start of the day
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999); // End of the day

    const calendar = google.calendar({ version: 'v3', auth: req.oauth2Client });

    const eventsListResponse = await calendar.events.list({calendarId:'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      timeZone: timezone,
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = eventsListResponse.data.items;

    res.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Error fetching events');
  }
};

// Get available slots
const getAvailableSlots = async (req, res) => {
    try {
        const { startTime, endTime, timezone, meetingDuration, noticeTime = 0, bufferTime = 0 } = req.body;
    
        if (!startTime || !endTime || !timezone || !meetingDuration) {
            return res.status(400).send('Required parameters missing');
        }
    
        const start = moment.tz(startTime, timezone).toISOString();
        const end = moment.tz(endTime, timezone).toISOString();
    
        const calendar = google.calendar({ version: 'v3', auth: req.oauth2Client });
        const eventsListResponse = await calendar.events.list({
            calendarId: 'primary',
            timeMin: start,
            timeMax: end,
            singleEvents: true,
            timeZone:timezone,
            orderBy: 'startTime',
        });
    
        const events = eventsListResponse.data.items;
        
        const freeSlots = calculateAvailableSlots(events, start, end, meetingDuration, bufferTime, timezone);
    
        res.json({ availableSlots: freeSlots });
        } catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).send('Error fetching available slots');
        }
    };
  
// Calculate available slots
const calculateAvailableSlots = (events, start, end, duration, bufferTime, timeZone) => {
    const slots = [];
    const buffer = moment.duration(bufferTime, 'minutes');
    const slotDuration = moment.duration(duration, 'minutes');
  
    // Convert start and end times to moment objects in the specified timeZone
    let startTime = moment.tz(start, timeZone);
    let endTime = moment.tz(end, timeZone);
    let now = moment.tz(timeZone);
  
    // Adjust startTime to be the later of the given start time or current time
    startTime = moment.max(startTime, now);
  
    // Convert events to moment objects in the specified timeZone
    const parsedEvents = events.map(event => ({
      start: moment.tz(event.start.dateTime, event.start.timeZone),
      end: moment.tz(event.end.dateTime, event.end.timeZone)
    }));
  
    // Sort events by their start time
    parsedEvents.sort((a, b) => a.start - b.start);
  
    // Check time slots between events and before/after business hours
    let lastEnd = startTime;
  
    for (let i = 0; i < parsedEvents.length; i++) {
      const eventStart = parsedEvents[i].start;
      const eventEnd = parsedEvents[i].end;
  
      // Check for available slots before the current event
      let slotStart = lastEnd;
      let slotEnd = eventStart.subtract(buffer);
  
      while (slotEnd.diff(slotStart) >= slotDuration.asMilliseconds()) {
        slots.push({
          start: slotStart.format('YYYY-MM-DDTHH:mm:ss'),
          end: slotStart.add(slotDuration).format('YYYY-MM-DDTHH:mm:ss')
        });
        slotStart = slotStart.add(buffer);
      }
  
      lastEnd = eventEnd;
    }
  
    // Check for available slots after the last event
    let slotStart = lastEnd.add(buffer);
    let slotEnd = endTime;

    
    while (slotEnd.diff(slotStart) >= slotDuration.asMilliseconds()) {
      slots.push({
        start: slotStart.format('YYYY-MM-DDTHH:mm:ss'),
        end: slotStart.add(slotDuration).format('YYYY-MM-DDTHH:mm:ss')
      });
      slotStart = slotStart.add(buffer);
    }
  
    return slots;
  }


const createEvent = async (req,res) => {
    
    const eventDetails = req.body;

    // Check if essential fields are present
    if (!eventDetails.summary || !eventDetails.start || !eventDetails.end) {
        return res.status(400).json({ 'message': 'Missing required event details: summary, start, or end.' });
    }

    timezone = eventDetails.timezone || "UTC"
    startTime = moment.tz(eventDetails.start, timezone).format('YYYY-MM-DDTHH:mm:ssZ');
    endTime = moment.tz(eventDetails.end, timezone).format('YYYY-MM-DDTHH:mm:ssZ');

    // Convert emails to attendees format
    const attendees = eventDetails.attendees ? 
        eventDetails.attendees.map(email => ({ email })) : [];

    // Create event object
    const event = {
        'summary': eventDetails.summary,
        'location': eventDetails.location || '',
        'description': eventDetails.description || '',
        'start': {
            'dateTime': startTime,
            'timeZone': timezone,
        },
        'end': {
            'dateTime': endTime,
            'timeZone': timezone,
        },
        'attendees': attendees,
        'reminders': {
            'useDefault': eventDetails.reminders?.useDefault || false,
            'overrides': eventDetails.reminders?.overrides || [
                { 'method': 'email', 'minutes': 24 * 60 },
                { 'method': 'popup', 'minutes': 10 },
            ],
        },
    };

      const calendar = google.calendar({ version: 'v3', auth: req.oauth2Client });
      
      await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      }, function(err, event) {
        if (err) {
          res.status(400).json({'message':`There was an error contacting the Calendar service: ${err}`})
        }
        res.status(201).json({'message':'Event Created'})
      });
      
}

const updateEvent = async (req,res) => {
    
    const eventDetails = req.body;
    const calendar = google.calendar({ version: 'v3', auth: req.oauth2Client });

    try{
        calendar_event= await calendar.events.get({
            calendarId:'primary',
            eventId:req.params.eventId
        })
    } catch (error) {
        if (error.code === 404) {
            return res.status(404).json({ message: 'Event not found' });
        } else if (error.code === 401) {
            return res.status(401).json({ message: 'Unauthorized' });
        } else {
            return res.status(500).json({ message: 'Failed to Fetch event' });
        }
    }
    if (!calendar_event){
        return res.status(404).json({'message':'Event Not Found'})
    }

    timezone = eventDetails.timezone || calendar_event.data.start.timeZone
    startTime = moment.tz(eventDetails.start|| calendar_event.data.start.dateTime, timezone).format('YYYY-MM-DDTHH:mm:ssZ');
    endTime = moment.tz(eventDetails.end || calendar_event.data.end.dateTime, timezone).format('YYYY-MM-DDTHH:mm:ssZ');


    // Convert emails to attendees format
    if (eventDetails.attendees){
        const attendees = eventDetails.attendees ? eventDetails.attendees.map(email => ({ email })) : [];
    }else{
        attendees = calendar_event.data.attendees
    }
    
    

    // Create event object
    const event = {
        'summary': eventDetails.summary || calendar_event.data.summary,
        'location': eventDetails.location || calendar_event.data.location,
        'description': eventDetails.description || calendar_event.data.description,
        'start': {
            'dateTime': startTime,
            'timeZone': timezone,
        },
        'end': {
            'dateTime': endTime,
            'timeZone': timezone,
        },
        'attendees': attendees,
        'reminders': {
            'useDefault': eventDetails.reminders?.useDefault || calendar_event.data.reminders.useDefault,
            'overrides': eventDetails.reminders?.overrides || calendar_event.data.reminders.overrides
        },
    };
    
      
    await calendar.events.patch({
    calendarId: 'primary',
    eventId:req.params.eventId,
    resource: event,
    }, function(err, event) {
    if (err) {
        res.status(400).json({'message':`There was an error contacting the Calendar service: ${err}`})
    }
    res.status(201).json({'message':'Event Updated'})
    });
      
}

const deleteEvent = async (req,res) => {
    const calendar = google.calendar({ version: 'v3', auth: req.oauth2Client });
      
    await calendar.events.delete({
        calendarId: 'primary',
        eventId: req.params.eventId,
    }, function(err, event) {
        if (err) {
        res.status(400).json({'message':`There was an error contacting the Calendar service: ${err}`})
        }
        res.status(201).json({'message':'Event Deleted'})
    });
}

module.exports = {auth, getScheduledevents, oauth2callback, getAvailableSlots, authenticateRequest, createEvent, deleteEvent, updateEvent}