const express = require('express')
const dotenv = require('dotenv')
const calendarRoutes = require('./routes/calendarRoutes')
const bodyParser = require('body-parser')

dotenv.config()
app = express()
app.use(express.json())
// app.use(bodyParser.json())


const port = process.env.PORT || 8080

app.use('/calendar', calendarRoutes)

app.listen(port, ()=>{
    console.log('Server is Running')
})