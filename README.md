# Meeting-Scheduler -- Calendar API Integration
Meeting Scheduler usng Google Calendar API

This project provides an integration with Google Calendar API, allowing users to authenticate, fetch scheduled events, find available slots, create, update, and delete events.

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/NoorShaik683/meeting-schedular
   cd meeting-scheduler
   ```

2. **Install Dependencies**

   Ensure you have Node.js and npm installed. Run the following command to install all required dependencies:

   ```bash
   npm install
   ```

3. **Set Up Environment Variables**

   Create a `.env` file in the root of the project with the following content:

   ```env
   CLIENT_ID=your-google-client-id
   CLIENT_SECRET=your-google-client-secret
   REDIRECT_URI=your-redirect-uri
   PORT=8080
   ```

   Replace `your-google-client-id`, `your-google-client-secret`, and `your-redirect-uri` with your actual Google API credentials.

## Execution

1. **Start the Server**

   ```bash
   npm start
   ```

   The server will start and listen on the port specified in the `.env` file (default is 8080).

2. **Visit the Authentication API**

   Open your browser and navigate to:

   ```
   http://localhost:8080/calendar/auth
   ```

   This will redirect you to Google's authentication page. Grant the necessary permissions.

3. **Authorization Callback**

   After granting permissions, Google will redirect to your specified `REDIRECT_URI`, and a `token.json` file will be generated in the project directory. This file contains the authentication tokens required for accessing the Google Calendar API.

## Authentication

Once you have authenticated via the `/auth` endpoint, the `token.json` file will be created with your access tokens. This file is used by the other API endpoints to interact with Google Calendar.

## Usage

You can use Postman or any other HTTP client to interact with the API endpoints. Below are the available endpoints and their descriptions:

### Authentication
- **GET** `/calendar/auth`
  - Initiates OAuth2 authentication with Google.
  - Redirects to Google authentication page.

### Callback
- **GET** `/calendar/oauth2callback`
  - Handles the OAuth2 callback and stores the tokens in `token.json`.

### Events
- **POST** `/calendar/get-scheduled-events`
  - Fetches scheduled events between a specified start and end date.
  - **Body**:
    ```json
    {
      "startDate": "2024-08-01T00:00:00Z",
      "endDate": "2024-08-31T23:59:59Z",
      "timezone": "America/New_York"
    }
    ```

- **POST** `/calendar/get-slots`
  - Gets available slots within a given time range, considering meeting duration, notice time, and buffer time.
  - **Body**:
    ```json
    {
      "startTime": "2024-08-01T00:00:00Z",
      "endTime": "2024-08-31T23:59:59Z",
      "timezone": "America/New_York",
      "meetingDuration": 30,
      "noticeTime": 15,
      "bufferTime": 10
    }
    ```

- **POST** `/calendar/create-event`
  - Creates a new event in the primary calendar.
  - **Body**:
    ```json
    {
      "summary": "Meeting with Team",
      "start": "2024-08-10T10:00:00Z",
      "end": "2024-08-10T11:00:00Z",
      "timezone": "America/New_York",
      "location": "Conference Room",
      "description": "Discuss project updates",
      "attendees": ["example@example.com"],
      "reminders": {
        "useDefault": false,
        "overrides": [
          { "method": "email", "minutes": 60 },
          { "method": "popup", "minutes": 15 }
        ]
      }
    }
    ```

- **PATCH** `/calendar/update-event/:eventId`
  - Updates an existing event based on the provided event ID.
  - **Body**:
    ```json
    {
      "summary": "Updated Meeting with Team",
      "start": "2024-08-10T10:00:00Z",
      "end": "2024-08-10T11:00:00Z",
      "timezone": "America/New_York",
      "location": "Updated Location",
      "description": "Discuss project updates and next steps",
      "attendees": ["example@example.com"],
      "reminders": {
        "useDefault": false,
        "overrides": [
          { "method": "email", "minutes": 30 },
          { "method": "popup", "minutes": 10 }
        ]
      }
    }
    ```

- **DELETE** `/calendar/delete-event/:eventId`
  - Deletes an event based on the provided event ID.

