<?php
session_start();

// CORS configuration
$config = require_once '/var/www/jmfc/config/config.php';
header('Access-Control-Allow-Origin: ' . $config['allowed_origins'][0]);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Function to set user session
function setUserSession($username, $token) {
    $_SESSION['user'] = [
        'key_name' => $username,
        'token' => $token,
        'last_activity' => time()
    ];
    session_write_close();
}

// Function to get user session
function getUserSession() {
    if (isset($_SESSION['user'])) {
        // Update last activity
        $_SESSION['user']['last_activity'] = time();
        session_write_close();
        return $_SESSION['user'];
    }
    return null;
}

// Function to clear user session
function clearUserSession() {
    unset($_SESSION['user']);
    session_destroy();
}

// Function to check if session is valid
function isSessionValid() {
    if (!isset($_SESSION['user'])) {
        return false;
    }
    
    // Check if session has expired (30 minutes)
    $timeout = 30 * 60; // 30 minutes in seconds
    if (time() - $_SESSION['user']['last_activity'] > $timeout) {
        clearUserSession();
        return false;
    }
    
    return true;
}
?> 