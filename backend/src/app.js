require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { getServerIPAddress } = require('./utils/networkService');
const respondentRoutes = require('./routes/respondentRoutes');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI);

app.use('/', respondentRoutes);

const PORT = process.env.PORT || 3000;

const ipAddr = getServerIPAddress();

console.log(ipAddr);

app.listen(PORT, `${ipAddr}`, () => {
    console.log(`Server running on IP: ${ipAddr}, port ${PORT}`);
})