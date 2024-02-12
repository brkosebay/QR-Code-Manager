const mongoose = require('mongoose');

const RespondentSchema = new mongoose.Schema({
  token: String,
  identifiers: [String],
  hasCompletedSurvey: { type: Boolean, default: false },
  hasReceivedGift: { type: Boolean, default: false },
  giftReceivedTimestamp: {type: Date}
});

module.exports = mongoose.model('Respondent', RespondentSchema);
