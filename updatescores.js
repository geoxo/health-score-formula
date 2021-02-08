const dbConfig = require("./app/config/db.config");
const db = require("./app/models");
const User = db.user;
const connectString = `mongodb://${dbConfig.USER}:${dbConfig.PASS}@${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}?authSource=${dbConfig.DB}&w=1`
var ObjectID = require('mongodb').ObjectID;

console.log(new Date())

function getStandardDeviation (array) { //sample version
  const n = array.length
  const mean = array.reduce((a, b) => a + b) / n
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / (n - 1))
}

function updateScores(){
let conn = db.mongoose
.connect(connectString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: false,
  useFindAndModify: false
})
.then(async () => {
  console.log("Successfully connected to MongoDB.");
  await User.find( async (error, data) => {
    if (error) {
      console.log('Error getting user data!')
    } else {
      console.log('Successfully got user data!')
      let users = data
      let today = new Date()
 
      for(let i = 0; i < users.length; i++)
      {
        if(users[i].days.length > 0)
        {
          let days = users[i].days
          let userID = users[i]._id 

          for(let j = 0; j < days.length; j++)
          {
            let day = new Date(days[j].day)
            let cmp = Math.floor(day.getTime() / 86400000) == Math.floor(today.getTime() / 86400000);  
            //86400000 is the number of milliseconds in a day (= 24*60*60*1000)
            if(cmp)
            {
              //console.log(users[i]._id, days[j].day)
              let theDay = days[j].day
              let curDay = days[j].data
              let dayID = curDay._id
              
              /*if(curDay.glucose_levels && curDay.glucose_levels.length >= 48 &&
                curDay.heart_rates && curDay.heart_rates.length >= 150 //720
              )*/
              //{
                let glucose = curDay.glucose_levels
                let glucose_cnt = 0
                let gScore = 0

                if(glucose && glucose.length > 0)
                {
                  for(let z = 0; z < glucose.length; z++)
                  {
                    let val = parseFloat(glucose[z].value)
                    if(60.0 <= val && val <= 110.0)
                    {
                      glucose_cnt = glucose_cnt + 1
                    }
                  }
                  if(glucose_cnt !== 0)
                    gScore = (glucose_cnt / glucose.length * 100).toFixed(2)
                }

                /*let heart = curDay.heart_rates
                .sort(function(x, y){
                  return parseFloat(x.value) - parseFloat(y.value);
                })*/

                let HRV_SD = 0
                
                /*if(heart && heart.length > 0)
                  HRV_SD = ((parseFloat(heart[heart.length - 1].value) - parseFloat(heart[0].value)) / 4) * 5
                */

                if(curDay.heart_rates && curDay.heart_rates.length > 0)
                {
                  let hearts = JSON.parse(JSON.stringify(curDay.heart_rates))
                  let totalHeartRate = 0
                  let heartsArr = []

                  if(hearts && hearts.length > 0)
                  {
                    for(let hh = 0; hh < hearts.length; hh++)
                    {
                      if(hearts[hh].value)
                      {
                        //console.log('parse',parseFloat(hearts[hh].value['$numberDecimal']))
                        heartsArr.push(parseFloat(hearts[hh].value['$numberDecimal']))
                      }
                    }

                    if(heartsArr.length > 0)
                    {
                      //console.log('len',heartsArr)
                      HRV_SD = getStandardDeviation(heartsArr)
                    }
                  }

                  
                  if(HRV_SD !== 0)
                  {
                    if(0 < HRV_SD && HRV_SD <= 10)
                    {
                      HRV_SD = HRV_SD
                    }
                    else if(10 < HRV_SD && HRV_SD <= 20)
                    {
                      HRV_SD = HRV_SD * 2
                    }
                    else if(20 < HRV_SD && HRV_SD <= 30)
                    {
                      HRV_SD = HRV_SD * 1.5
                    }
                    else if(30 < HRV_SD && HRV_SD <= 40)
                    {
                      HRV_SD = HRV_SD * 0.6
                    }
                    else if(40 < HRV_SD && HRV_SD <= 50)
                    {
                      HRV_SD = HRV_SD * 0.57
                    }
                    else if(50 < HRV_SD && HRV_SD <= 60)
                    {
                      HRV_SD = HRV_SD * 0.62
                    }
                    else if(60 < HRV_SD && HRV_SD <= 70)
                    {
                      HRV_SD = HRV_SD * 0.66
                    }
                    else if(70 < HRV_SD)
                    {
                      HRV_SD = HRV_SD * 0.7
                    }
                    HRV_SD = HRV_SD.toFixed(2)
                  }
                }

                let summaries = JSON.parse(JSON.stringify(curDay.summaries))
                let totalSleep = 0
                let sleepScore = 0
                let totalMealActiv = 0
                let mealActivCnt = 0
                let otherScore = 0
                let subjectiveScore = 0
                let moodScore = 0
                let mealactivScore = 0
                let score = 0

                if(gScore !== 0 && HRV_SD !== 0)
                {
                  score = ((gScore * 0.5) + (HRV_SD * 0.5 ))
                }
                else if(gScore === 0 && HRV_SD !== 0)
                {
                  score = HRV_SD * 1
                }
                else if(gScore !== 0 && HRV_SD === 0)
                {
                  score = gScore * 1
                }

              //if(!isNaN(score))
              //{  
                if(summaries && summaries.length > 0)
                  for(let z = 0; z < summaries.length; z++)
                  {
                    let summary = summaries[z]
                    let summaryID = summary._id

                    if(summary && summary._type === "sleep")
                    {
                      if(summary.start_date && summary.end_date)
                      {
                        let summaryScore = parseFloat(summary.score['$numberDecimal'])
                        
                        if(summaryScore < 1) //not updated yet
                        {
	                        let diff =(new Date(summary.end_date).getTime() - new Date(summary.start_date).getTime()) / 1000;
	                        diff /= 60;
	                        totalSleep = totalSleep + diff
	                        diff = Math.floor(diff / 60) 
	                        console.log('sleep', userID, diff)

	                        if(diff < 7)
	                        {
	                        	summaryScore = Math.floor(diff) * 10
	                        }
	                        else if(diff === 7)
	                        {
	                        	summaryScore = 80
	                        }
	                        else if(diff >= 8)
	                        {
	                        	summaryScore = 100
	                        }

	                        if(summaryScore > 0)
	                        {
	                        	await User.findOneAndUpdate(
	                            {  _id: userID, "days.day": theDay},
	                            { $set: {"days.$.data.summaries.$[summ].score": summaryScore}},
	                            { arrayFilters: [{"summ._id": ObjectID(summaryID)}]},
	                            (err, user) => {
	                                  if (err) {
	                                    //could not update meal score
	                                  }
	                                  else if (user) {
	                                    //success
	                                  }  
	                                }
	                            )
	                        }
                    	}
                      }
                    }
                    else if(summary && summary._type === "meal")
                    {
                      let questions = summary.questions
                      let summaryScore = parseFloat(summary.score['$numberDecimal'])
                      let summaryScoreCnt = 0
                      let summaryID = summary._id
                      let summaryEndDate = new Date(summary.end_date).getTime()
                      let gLevelsCnt = 0
                      let inRange = 0
                      let mealScore = 0

                      console.log('meal', userID, summary.score)

                      if(summaryScore < 1) //not updated yet
                      {
	                      if(glucose && glucose.length > 0)
	                      {
	                        for(let z = 0; z < glucose.length; z++)
	                        {
	                          let startDate = new Date(glucose[z].start_date).getTime()
	                          let diff = (startDate - summaryEndDate) / 10800000; //3 * 60 * 60 * 1000, 3 hours in miliseconds 
	                          if (diff <= 3){ //within 3 hours of eating a meal 
                              console.log('startDate', startDate, 'end_date', summaryEndDate)
	                            gLevelsCnt = gLevelsCnt + 1
	                            if(60 <= glucose[z].value && glucose[z].value <= 110)
	                            {
	                              inRange = inRange + 1
	                            }
	                          }
	                        }
	                      }

	                      if(gLevelsCnt > 0 && inRange > 0)
	                      {
	                        mealScore = Math.floor((inRange / gLevelsCnt) * 10)       
	                      }

	                      console.log('gLevelsCnt', gLevelsCnt, 'inRange', inRange, 'mealScore', mealScore)
	                      
	                      if(questions && questions.length > 0)
	                      {
	                        for(let zz = 0; zz < questions.length; zz++)
	                        { 
	                          let answer = questions[zz].selected_answer
	                          if(answer && answer === "Great")
	                          {
	                            totalMealActiv = totalMealActiv + 100
	                            //summaryScore = summaryScore + 100
	                            if(mealScore < 7)
	                              mealScore = mealScore + 1
	                          }
	                          else if(answer && answer === "OK")
	                          {
	                            totalMealActiv = totalMealActiv + 50
	                            //summaryScore = summaryScore + 50
	                          }
	                          else if(answer && answer === "Bad")
	                          {
	                            totalMealActiv = totalMealActiv + 0
	                            //summaryScore = summaryScore + 0
	                            if(mealScore > 0)
	                              mealScore = mealScore - 1
	                          }
	                          if(answer)
	                          {
	                            mealActivCnt = mealActivCnt + 1
	                            summaryScoreCnt = summaryScoreCnt + 1
	                          }
	                        }
	          
	                        if(mealScore > 0)
	                        {
	                         await User.findOneAndUpdate(
	                            {  _id: userID, "days.day": theDay},
	                            { $set: {"days.$.data.summaries.$[summ].score": mealScore}},
	                            { arrayFilters: [{"summ._id": ObjectID(summaryID)}]},
	                            (err, user) => {
	                                  if (err) {
	                                    //could not update meal score
	                                  }
	                                  else if (user) {
	                                    //success
	                                  }  
	                                }
	                            )
	                        }
	                      }
                  	  }
                    }
                    else if(summary && summary._type === "drink")
                    {
                      let questions = summary.questions
                      let summaryScore = parseFloat(summary.score['$numberDecimal'])
                      let summaryScoreCnt = 0
                      let summaryID = summary._id

                      if(summaryScore < 1) //not updated yet
                      {
	                      if(questions && questions.length > 0)
	                      {
	                        for(let zz = 0; zz < questions.length; zz++)
	                        {
	                          let answer = questions[zz].selected_answer
	                          if(answer && answer === "Great")
	                          {
	                            totalMealActiv = totalMealActiv + 100
	                            summaryScore = summaryScore + 100
	                          }
	                          else if(answer && answer === "OK")
	                          {
	                            totalMealActiv = totalMealActiv + 50
	                            summaryScore = summaryScore + 50
	                          }
	                          else if(answer && answer === "Bad")
	                          {
	                            totalMealActiv = totalMealActiv + 0
	                            summaryScore = summaryScore + 0
	                          }
	                          if(answer)
	                          {
	                            mealActivCnt = mealActivCnt + 1 
	                            summaryScoreCnt = summaryScoreCnt + 1 
	                          }
	                        }
	                      }
	                      if(summaryScore > 0)
	                      {
	                        summaryScore = summaryScore / summaryScoreCnt / 10
	                        await User.findOneAndUpdate(
	                          {  _id: userID, "days.day": theDay},
	                          { $set: {"days.$.data.summaries.$[summ].score": summaryScore}},
	                          { arrayFilters: [{"summ._id": ObjectID(summaryID)}]},
	                          (err, user) => {
	                                if (err) {
	                                  //could not update meal score
	                                }
	                                else if (user) {
	                                  //success
	                                }  
	                              }
	                          )
	                      }
                  	 	}
                    }
                    else if(summary && summary._type === "workout")
                    {
                      console.log('workout', userID, summary.score)
                      let questions = summary.questions
                      let summaryScore = parseFloat(summary.score['$numberDecimal'])
                      let summaryScoreCnt = 0
                      let summaryID = summary._id

                      if(summaryScore < 1) //not updated yet
                      { 
	                      if(questions && questions.length > 0)
	                      {
	                        for(let zz = 0; zz < questions.length; zz++)
	                        {
	                          let answer = questions[zz].selected_answer
	                          if(answer && answer === "Great")
	                          {
	                            totalMealActiv = totalMealActiv + 100
	                            summaryScore = summaryScore + 100
	                          }
	                          else if(answer && answer === "OK")
	                          {
	                            totalMealActiv = totalMealActiv + 50
	                            summaryScore = summaryScore + 50
	                          }
	                          else if(answer && answer === "Bad")
	                          {
	                            totalMealActiv = totalMealActiv + 0
	                            summaryScore = summaryScore + 0
	                          }
	                          if(answer)
	                          {
	                            mealActivCnt = mealActivCnt + 1 
	                            summaryScoreCnt = summaryScoreCnt + 1 
	                          }
	                        }
	                      }
	                      if(summaryScore > 0)
	                      {
	                        summaryScore = summaryScore / summaryScoreCnt / 10
	                        console.log('add workout', summaryScore)
	                        await User.findOneAndUpdate(
	                          {  _id: userID, "days.day": theDay},
	                          { $set: {"days.$.data.summaries.$[summ].score": summaryScore}},
	                          { arrayFilters: [{"summ._id": ObjectID(summaryID)}]},
	                          (err, user) => {
	                                if (err) {
	                                  //could not update meal score
	                                }
	                                else if (user) {
	                                  //success
	                                }  
	                              }
	                          )
	                      }
                  	  }
                    }  
                  }

                let moods = curDay.moods
                let totalMoods = 0
                let moodsCnt = 0

                if(moods)
                  for(let z = 0; z < moods.length; z++)
                  {
                    if(moods._type === "A") //great
                    {
                      totalMoods = totalMoods + 100
                    }
                    else if(moods._type === "B") //good
                    {
                      totalMoods = totalMoods + 80
                    }
                    else if(moods._type === "C") //neutral
                    {
                      totalMoods = totalMoods + 60
                    }
                    else if(moods._type === "D") //bad
                    {
                      totalMoods = totalMoods + 40
                    }
                    else if(moods._type === "E") //awful
                    {
                      totalMoods = totalMoods + 20
                    }
                    moodsCnt = moodsCnt + 1
                  }

                  if(totalMoods !== 0)
                  {
                    moodScore = totalMoods / moodsCnt
                  }

                  if(totalMealActiv !== 0)
                  {
                    mealactivScore = totalMealActiv / mealActivCnt
                  }

                  if(moodScore !== 0 && mealactivScore !== 0)
                  {
                    subjectiveScore = moodScore * 0.5 + mealactivScore * 0.5
                  }
                  else if(moodScore !== 0 && mealactivScore === 0)
                  {
                    subjectiveScore = moodScore * 1
                  }
                  else if(moodScore === 0 && mealactivScore !== 0)
                  {
                    subjectiveScore = mealactivScore * 1
                  }

                  if(totalSleep > 0)
                  {
                    let sleepHours = totalSleep / 60
                    if( 0 < sleepHours && sleepHours <= 1)
                    {
                      sleepScore = 0
                    }
                    else if( 1 < sleepHours && sleepHours <= 2)
                    {
                      sleepScore = 10
                    }
                    else if( 2 < sleepHours && sleepHours <= 3)
                    {
                      sleepScore = 20
                    }
                    else if( 3 < sleepHours && sleepHours <= 4)
                    {
                      sleepScore = 30
                    }
                    else if( 4 < sleepHours && sleepHours <= 5)
                    {
                      sleepScore = 40
                    }
                    else if( 5 < sleepHours && sleepHours <= 6)
                    {
                      sleepScore = 50
                    }
                    else if( 6 < sleepHours && sleepHours <= 7)
                    {
                      sleepScore = 60
                    }
                    else if( 7 < sleepHours && sleepHours <= 8)
                    {
                      sleepScore = 80
                    }
                    else if( sleepHours > 8)
                    {
                      sleepScore = 100
                    }
                  }

                
                if(subjectiveScore !== 0 && sleepScore !== 0)
                {
                  otherScore = sleepScore * 0.5 + subjectiveScore * 0.5
                }
                else if(subjectiveScore === 0 && sleepScore !== 0) {
                  otherScore = sleepScore * 1
                }
                else if(subjectiveScore !== 0 && sleepScore === 0)
                {
                  otherScore = subjectiveScore * 1
                }
              //}
              
              if(otherScore !== 0)
              {
                if(gScore !== 0 && HRV_SD !== 0)
                {
                  score = ((gScore * 0.4) + (HRV_SD * 0.4 ) + (otherScore * 0.2))
                }
              }

              if(score > 100)
                score = 100

              score = score.toFixed(2)
              
              
              console.log('userID', userID, 'day', theDay, 'score', score, 'sleepScore', sleepScore, 'subjectiveScore', subjectiveScore,
               'moodScore', moodScore, 'mealactivScore', mealactivScore,
               'otherScore', otherScore, 'gScore', gScore, 'HRV_SD', HRV_SD
               )

              await User.findOneAndUpdate(
              {  _id: userID, "days.day": theDay},
              { $set: {"days.$.data.average_score": score, "days.$.data.metabolic_score": gScore, "days.$.data.cardio_score": HRV_SD}},
              (err, user) => {
                    if (err) {
                      console.log("error updating user data!")
                    }
                    else if (user) {
                      //console.log("updated user data!")
                    }  
                  }
              )

              /*}
              else
              {
                console.log("Insufficient data!")
              }*/
            }
            
          }
        }
        
      }
    }
  })
  //db.mongoose.disconnect();
  //console.log("connection closed")
})
.catch(err => {
  console.error("Connection error", err);
  process.exit();
});
}

setInterval(updateScores, 1200000);