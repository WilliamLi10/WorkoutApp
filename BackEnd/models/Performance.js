const mongoose = require('mongoose');


const exerciseDataSchema = new mongoose.Schema({
    sets: Number,
    reps: Number,
    weight: Number
});
const performanceSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Accounts' },
    dateLogged: {
        type: Date,
        default: Date.now, // Set a default value to the current date and time
      },
    exerciseName: String,
    performanceMetric: Number,
    performanceData: exerciseDataSchema

});

const Performance = mongoose.model('performance', performanceSchema);

module.exports = Performance