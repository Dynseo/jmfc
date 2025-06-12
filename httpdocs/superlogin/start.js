let fs = require('fs');
let express = require('express');
let http = require('http');
let https = require('https');
let bodyParser = require('body-parser');
let logger = require('morgan');
let cors = require('cors');
let { CouchAuth } = require('@klues/couch-auth');
let useSSL = true;
let infoTreeAPI = require('./infoTreeAPI/infoTreeAPI.js');
let dotenv = require('dotenv');
dotenv.config({ path: '../config/.env' });

const USERNAME_REGEX = /^[a-z0-9][a-z0-9_-]{2,15}$/;; // also see src/js/util/constants.js:8

const corsOptions = {
    origin: ['https://jmfc.dynseo.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
};

let app = express();
app.use(logger('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors(corsOptions));

let config = {
    testMode: {
        // Use a stub transport so no email is actually sent
        noEmail: true,
        // Displays debug information in the oauth dialogs
        oauthDebug: false,
        // Logs out-going emails to the console
        debugEmail: true
    },
    security: {
        // The maximum number of entries in the activity log in each user doc. Zero to disable completely
        userActivityLogSize: 15
    },
    dbServer: {
        publicURL: process.env.COUCH_DB_URL,
        protocol: 'http://',
        host: process.env.COUCH_DB_HOST || '127.0.0.1:5984',
        user: process.env.COUCH_DB_USER,
        password: process.env.COUCH_DB_PASSWORD,
        userDB: process.env.COUCH_DB_USER_DB,
        couchAuthDB: process.env.COUCH_DB_AUTH_DB


    },
    local: {
        sendConfirmEmail: false,
        requireEmailConfirm: false,
        usernameLogin: true,
        emailUsername: false
    },
    mailer: {
        fromEmail: process.env.MAILER_FROM_EMAIL,
        options: {
            host: process.env.MAILER_HOST,
            port: process.env.MAILER_PORT,
            secure: process.env.MAILER_SECURE,
            auth: {
                user: process.env.MAILER_USER,
                pass: process.env.MAILER_PASS
            }
        }
    },
    emails: {
        confirmEmail: {
            subject: 'Please confirm your email'
        },
        forgotPassword: {
            subject: 'Your password reset link'
        }
    },
    userDBs: {
        defaultDBs: {
            private: ['jmfc-grid-data']
        }
    }
};

// Configure nano access to CouchDB
const nano = require('nano')(`${config.dbServer.protocol}${config.dbServer.user}:${config.dbServer.password}@${config.dbServer.host}`);
const authUsers = nano.use('auth-users');

// Initialize CouchAuth
try {
    logConfig();
    let couchAuth = new CouchAuth(config);
    app.use('/auth', couchAuth.router);
} catch (err) {
    console.error('Error initializing CouchAuth:');
    console.error(err);
}


app.use('/user/validate-username/:name', async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    let name = req.params.name;
    if (!USERNAME_REGEX.test(name)) {
        console.log("regex not matching");
        res.status(200).json(false);
        next();
        return;
    }
    let result = await authUsers.view('views', 'view-usernames', { key: name });
    let valid = result && result.rows && result.rows.length === 0;

    res.status(200).json(valid);
    next();
});

app.use('/api/infotree', infoTreeAPI.getRouter(config.dbServer.protocol, config.dbServer.host));

if (useSSL) {
    let privateKey = fs.readFileSync(process.env.PATH_TO_KEY, 'utf8');
    let certificate = fs.readFileSync(process.env.PATH_TO_CERT, 'utf8');
    let credentials = { key: privateKey, cert: certificate };
    https.createServer(credentials, app).listen(3001);
} else {
    http.createServer(app).listen(3002);
}

function logConfig() {
    console.log("starting with this config:");
    let logConfig = JSON.parse(JSON.stringify(config));
    logConfig.dbServer.password = '***';
    console.log(JSON.stringify(logConfig));
}


