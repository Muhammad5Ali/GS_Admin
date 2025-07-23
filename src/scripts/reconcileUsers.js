// scripts/reconcileUsers.js
import mongoose from 'mongoose';
import User from '../models/User.js';
import Report from '../models/Report.js';
import { connectDB } from '../lib/db.js';

const reconcile = async () => {
  await connectDB();
  
  const users = await User.find();
  
  for (const user of users) {
    const reports = await Report.find({ user: user._id });
    
    console.log(`Reconciling ${user.username}...`);
    console.log(`Current: ${user.reportCount} reports, ${user.points} points`);
    
    // Remove deprecated fields
    user.reportCount = undefined;
    user.points = undefined;
await user.save();
  }
  
  console.log('Reconciliation complete!');
  process.exit(0);
};

reconcile();