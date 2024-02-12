const express = require('express');
const respondentController = require('../controllers/respondentController');
const Respondent = require('../models/respondentModel');
const { readSheetAndProcessResponses, authenticateSheetsAPI } = require('../utils/googleSheetService');
const router = express.Router();

// Route to handle adding a respondent and sending a QR code
router.post('/add-respondent', respondentController.addRespondent);

router.get('/validate/:token', async (req, res) => {
  const client = authenticateSheetsAPI();
  const { token } = req.params;

  try {
    // Validate the token by finding the corresponding respondent
    let respondent = await Respondent.findOne({ token });

    if (respondent) {
      // Proceed to read sheet responses and update survey completion status if necessary
      await readSheetAndProcessResponses(respondent.token, respondent.identifiers, client);

      // Re-fetch the respondent to get the updated data
      respondent = await Respondent.findOne({ token });

      if (respondent.hasCompletedSurvey && !respondent.hasReceivedGift) {
        respondent.hasReceivedGift = true;
        respondent.giftReceivedTimestamp = new Date(); // Set the current date and time
        await respondent.save();
        res.send(`<body style="background-color: green;"><h1>Participant is eligible for the gift.</h1></body>`);
      } else if (respondent.hasCompletedSurvey && respondent.hasReceivedGift) {
        res.send(`<body style="background-color: red;"><h1>Participant has already received gift on: ${respondent.giftReceivedTimestamp}</h1></body>`);
      } else {
        res.send('<body style="background-color: red;"><h1>Participant has not filled in the survey.</h1></body>');
      }
    } else {
      res.send('<body style="background-color: red;"><h1>Invalid token or participant not found.</h1></body>');
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Internal Server Error');
  }
});


module.exports = router;
