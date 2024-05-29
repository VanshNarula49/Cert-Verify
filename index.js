const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');
const formData = require('form-data');
const cookieParser = require("cookie-parser");
const Mailgun = require("mailgun.js");
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const Mongo = require("mongodb");
const { log } = require('console');
const MongoClient = Mongo.MongoClient;
const url = "mongodb+srv://vansh:wF0EiAtblcJY68rE@cluster.q2mmc.mongodb.net/";
const client = new MongoClient(url);
const dbName = "Robify";

const API_KEY = "be96e32ddfab7951c7aca39eba638f7a-77316142-1e5b45e5";
const DOMAIN = "robify.in";
const mailgun = new Mailgun(formData);
const emailclient = mailgun.client({ username: "api", key: API_KEY });
const adminPassword = "Robify678";
const securecookie = "be96e32ddfab7951c7aca39eba638f7abe96e32ddfab7951c7aca39eba638f7abe96e32ddfab7951c7aca39eba638f7a";

async function main() {
  await client.connect();
  console.log("Connected successfully to server");
  return "";
}
main().then(console.log).catch(console.error);

const db = client.db(dbName);
const UserCollection = db.collection("Robify-CERT");

const app = express();
const port = 80;
app.set("view engine", "ejs");
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

const apiConfig = {
    apiKey: '48b184a540a7254a9ea5b2311018271ba2b7c154bc6caafc3628711a1be5969b',
    apiUsername: 'Community-Admin',
};

function adminAuth(req, res, next) {
    if (req.cookies.Password == securecookie) {
        next();
    } else {
        res.send("UNAUTHORIZED ACCESS!");
    }
}

const verifyEmail = async (username, email) => {
    const url = `https://community.robify.in/u/${username}/emails.json`;
    const headers = {
        'Api-Key': apiConfig.apiKey,
        'Api-Username': apiConfig.apiUsername,
    };

    try {
        const response = await axios.get(url, { headers });
        const userEmail = response.data.email;
        return userEmail === email;
    } catch (error) {
        console.error('Error making API request:', error);
        return false;
    }
};

app.get("/login", (req, res) => {
    res.render("login", { msg: "" });
});

app.post("/login", (req, res) => {
    if (req.body.username == "Robify@67890" && req.body.password == "Jain.Robify@67890") {
        res.cookie("Password", securecookie, { maxAge: 2592000 }).redirect("/dashboard");
    } else {
        res.render("login", { msg: "Wrong Password" });
    }
});
app.get("/logout", (req, res) => {
  res.clearCookie("Password").redirect("/");
});

app.post('/verify', async (req, res) => {
    const { username, email, code } = req.body;

    if (!username || !email || code.length !== 4) {
        return res.status(400).json({ success: false, message: 'Invalid input.' });
    }

    const isEmailValid = await verifyEmail(username, email);

    if (isEmailValid) {
        const user = await UserCollection.findOne({ first4Digits: code });
        if (user) {
            const emailData = {
                from: 'Robify <verify@robify.in>',
                to: email,
                subject: 'Your Certificate Verification Code',
                text: `Dear ${user.name},\n\nYour verification code is: ${user.first4Digits}${user.next4Digits}\n\nThank you,\nRobify Team`
            };

            emailclient.messages.create(DOMAIN, emailData)
                .then(() => {
                    res.json({ success: true, message: 'Verification successful. Email sent.' });
                })
                .catch((error) => {
                    console.error('Error sending email:', error);
                    res.status(500).json({ success: false, message: 'Failed to send email.' });
                });
        } else {
            res.json({ success: false, message: 'Verification code not found.' });
        }
    } else {
        res.json({ success: false, message: 'Verification failed.' });
    }
});

app.get('/validate', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
app.post('/validate', async (req, res) => {
    const { code } = req.body;

    if (!code || code.length !== 8) {
        return res.status(400).json({ success: false, message: 'Invalid input.' });
    }

    const first4Digits = code.slice(0, 4);
    const next4Digits = code.slice(4, 8);

    try {
        const user = await UserCollection.findOne({ first4Digits, next4Digits });
        if (user) {
            res.render('validate', { name: user.name, event: user.event });
        } else {
            res.status(404).json({ success: false, message: 'User not found.' });
        }
    } catch (error) {
        console.error('Error querying database:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

app.get('/verify', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'verify.html'));
});

app.get('/dashboard', adminAuth, async (req, res) => {
    const users = await UserCollection.find().toArray();
    res.render('dashboard', { users });
});

app.post('/add-user', adminAuth, async (req, res) => {
    const { name, event } = req.body;
    if (!name || !event) {
        return res.status(400).json({ success: false, message: 'Name and event are required' });
    }

    const first4Digits = await generateUniqueDigits(4);
    const next4Digits = generateRandomDigits(4);

    const newUser = {
        name,
        event,
        createdAt: new Date(),  // Storing date as Date object
        first4Digits,
        next4Digits
    };

    await UserCollection.insertOne(newUser);
    res.json({ success: true });
});

app.post('/upload-csv', adminAuth, upload.single('csvFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const users = [];

    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', (row) => {
                    if (row.name && row.event) {
                        users.push(row);
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (users.length === 0) {
            fs.unlinkSync(filePath); // Clean up the file
            return res.status(400).json({ success: false, message: 'No valid data found in the CSV file' });
        }

        const usersToInsert = await Promise.all(users.map(async (row) => {
            const first4Digits = await generateUniqueDigits(4);
            const next4Digits = generateRandomDigits(4);
            return {
                name: row.name,
                event: row.event,
                createdAt: new Date(),  // Storing date as Date object
                first4Digits,
                next4Digits
            };
        }));

        await UserCollection.insertMany(usersToInsert);
        fs.unlinkSync(filePath); // Delete the file after processing

        res.json({ success: true, message: `${usersToInsert.length} users added successfully.` });
    } catch (error) {
        fs.unlinkSync(filePath); // Clean up the file
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.delete('/delete-user/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    await UserCollection.deleteOne({ _id: new Mongo.ObjectId(id) });
    res.json({ success: true });
});
app.post('/delete-users', adminAuth, async (req, res) => {
    const { ids } = req.body;
    try {
        const objectIds = ids.map(id => new Mongo.ObjectId(id));
        await UserCollection.deleteMany({ _id: { $in: objectIds } });
        res.json({ success: true, message: `${ids.length} users deleted successfully.` });
    } catch (error) {
        console.error('Error deleting users:', error);
        res.status(500).json({ success: false, message: 'Failed to delete users' });
    }
});
app.get('/download-table', adminAuth, async (req, res) => {
    const { startDate, endDate } = req.query;
    const filter = {};

    if (startDate) {
        const start = convertISTToUTC(startDate);
        filter.createdAt = { $gte: start };
    }
    if (endDate) {
        const end = convertISTToEndOfDayUTC(endDate);
        if (!filter.createdAt) {
            filter.createdAt = {};
        }
        filter.createdAt.$lte = end;
    }

    const users = await UserCollection.find(filter).toArray();

    let csvContent = "name,event,createdAt,first4Digits,next4Digits\n";
    users.forEach(user => {
        csvContent += `${user.name},${user.event},${user.createdAt.toISOString()},${user.first4Digits},${user.next4Digits}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('users.csv');
    res.send(csvContent);
});

async function generateUniqueDigits(length) {
    let uniqueDigits;
    let isUnique = false;

    while (!isUnique) {
        uniqueDigits = generateRandomDigits(length);
        const existingUser = await UserCollection.findOne({ first4Digits: uniqueDigits });
        if (!existingUser) {
            isUnique = true;
        }
    }

    return uniqueDigits;
}

function generateRandomDigits(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function convertISTToUTC(dateString) {
    const dateIST = new Date(dateString);
    const offset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const dateUTC = new Date(dateIST.getTime() - offset);
    return dateUTC;
}

function convertISTToEndOfDayUTC(dateString) {
    const dateIST = new Date(dateString);
    dateIST.setHours(23, 59, 59, 999); // Set to end of the day in IST
    const offset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const dateUTC = new Date(dateIST.getTime() - offset);
    return dateUTC;
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
