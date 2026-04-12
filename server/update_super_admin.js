
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const userSchema = new mongoose.Schema({
  email: String,
  role: String
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function updateToSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const result = await User.updateOne(
      { email: 'thisisaman408@gmail.com' },
      { $set: { role: 'super-admin' } }
    );
    
    if (result.matchedCount > 0) {
      console.log('Successfully updated user to super-admin.');
      console.log('Modified count:', result.modifiedCount);
    } else {
      console.log('User not found. Role update failed.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateToSuperAdmin();
