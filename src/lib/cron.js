import cron from "cron";
import https from "https";

const job=new cron.CronJob("*/14 * * * *", function () {
  https
      .get(process.env.API_URL,(res)=>{
        if(res.statusCode===200) console.log("Get request sent successfully");
        else console.log("Get request failed",res.statusCode);
      })   
      .on("error",(e)=>console.error("Error with the request:",e));
});

export default job;

//CRON JOB EXPLANATION
//This is the cron job that will run every 14 minutes.
//CRON jobs are scheduled tasks that run at specific intervals. 
// They are often used for tasks like sending emails, cleaning up databases, or performing regular 
// maintenance. In this case, we are using a cron job to check for expired tokens in the database
//  and delete them.
//We want to send 1 get request every 14 minutes to the server to check if there are any expired tokens 
// in the database.

//How to define a schedule
//You define a schedule using a cron expression, which consists of five fields representing

//!Minute, hour, day of month, month, and day of week.

//EXMAPLE AND EXPLANATION OF CRON JOBS
// * 14 * * * *  - At every 14 minutes
// * 0 0 * * 0   - At midnight on every sunday
// * 30 3 15 * * - At 3:30 AM on the 15th of every month
// * 0  0 1 1 * - At midnight on January 1st every year
// * 0 * * * * - At every hour



