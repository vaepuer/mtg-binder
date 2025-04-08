const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cardCollection: [
        {
            name: String,
            setCode: String,
            quantity: Number,
            treatment: String,
            collectorNumber: String
        }
    ]
});

const User = mongoose.model('User', userSchema);

const bcrypt = require('bcrypt');
const User = require('./models/User');

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User created' });
});

const bcrypt = require('bcrypt');

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Session or JWT token to keep the user logged in
    res.json({ message: 'Login successful' });
});
