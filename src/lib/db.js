import mongooose from "mongoose";


export const connectDB=async()=>{

   try {
    const conn=await mongooose.connect(process.env.MONGO_URI);
    console.log(`Database connected:${conn.connection.host}`);
   } catch (error) {
    console.log("Error connecting to the database",error)
    process.exit(1); //exit with failure
   }    

}