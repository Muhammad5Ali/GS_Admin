import express from "express";
import {register,verifyOTP,resendOTP,login, logout, getUser, forgotPassword,verifyResetOTP, resetPasswordWithOTP,registerSupervisor} from "../controllers/userController.js"
import { isAuthenticated } from "../middleware/auth.js";

const router=express.Router();

router.post("/register",register);
router.post("/register-supervisor", registerSupervisor);
router.post("/verifyOTP",verifyOTP);
router.post("/resendOTP", resendOTP);
router.post("/login",login);
router.post("/logout",isAuthenticated,logout);
router.get("/me",isAuthenticated,getUser);
router.post("/password/forgot", forgotPassword);
router.post("/password/verify-otp", verifyResetOTP);
router.put("/password/reset", resetPasswordWithOTP); 



export default router;