<?php
/**
 * Database Setup Script
 * This script creates the database and tables for the Exam Hall Allocation System
 */

// Database credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'exam_allocation_system');

header('Content-Type: text/html; charset=UTF-8');

// Suppress error display but log errors
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Try to connect without database first
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS);

if ($conn->connect_error) {
    die("Failed to connect to MySQL: " . htmlspecialchars($conn->connect_error) . 
        "\n\nPlease ensure:\n" .
        "1. MySQL is running\n" .
        "2. Username: " . DB_USER . "\n" .
        "3. Password is correct");
}

// Read the database.sql file
$sqlFile = __DIR__ . '/database.sql';

if (!file_exists($sqlFile)) {
    die("Error: database.sql file not found at " . htmlspecialchars($sqlFile));
}

$sqlContent = file_get_contents($sqlFile);

if ($sqlContent === false) {
    die("Error: Could not read database.sql file");
}

// Split SQL statements
$statements = array_filter(array_map('trim', explode(';', $sqlContent)));

$successCount = 0;
$errors = [];

echo "<!DOCTYPE html>
<html>
<head>
    <title>Database Setup</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .success { color: #27ae60; margin: 10px 0; padding: 10px; background: #d5f4e6; border-left: 4px solid #27ae60; }
        .error { color: #c0392b; margin: 10px 0; padding: 10px; background: #fadbd8; border-left: 4px solid #c0392b; }
        .info { color: #2980b9; margin: 10px 0; padding: 10px; background: #d6eaf8; border-left: 4px solid #2980b9; }
        .details { background: #ecf0f1; padding: 15px; border-radius: 3px; margin: 10px 0; }
        pre { background: #2c3e50; color: #ecf0f1; padding: 10px; overflow-x: auto; border-radius: 3px; }
    </style>
</head>
<body>
<div class='container'>
    <h1>Exam Hall Allocation System - Database Setup</h1>";

foreach ($statements as $statement) {
    $statement = trim($statement);
    if (empty($statement)) continue;
    
    if (!$conn->query($statement)) {
        $errors[] = "Error executing: " . substr($statement, 0, 50) . "...\nError: " . $conn->error;
        echo "<div class='error'>✗ Error: " . htmlspecialchars($conn->error) . "</div>";
    } else {
        $successCount++;
        echo "<div class='success'>✓ Executed successfully</div>";
    }
}

// Final status
echo "</div>";
echo "<div class='container'>";

if (empty($errors)) {
    echo "<div class='info'><strong>✓ Setup Complete!</strong></div>";
    echo "<div class='details'>";
    echo "<h3>Setup Summary:</h3>";
    echo "<ul>";
    echo "<li>Database '<strong>" . DB_NAME . "</strong>' created/verified</li>";
    echo "<li>All tables created successfully</li>";
    echo "<li>Default admin user created</li>";
    echo "<li>Default credentials:</li>";
    echo "<ul>";
    echo "<li>Username: <strong>admin</strong></li>";
    echo "<li>Password: <strong>admin123</strong></li>";
    echo "</ul>";
    echo "</ul>";
    echo "<p style='margin-top: 20px;'><a href='login.html' style='background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px;'>Go to Login Page</a></p>";
    echo "</div>";
} else {
    echo "<div class='error'><strong>✗ Setup encountered errors:</strong></div>";
    echo "<div class='details'>";
    foreach ($errors as $error) {
        echo "<pre>" . htmlspecialchars($error) . "</pre>";
    }
    echo "</div>";
}

// Test the connection with config.php
echo "<h3>Connection Test:</h3>";
$testConn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($testConn->connect_error) {
    echo "<div class='error'>✗ Connection to database failed: " . htmlspecialchars($testConn->connect_error) . "</div>";
} else {
    echo "<div class='success'>✓ Successfully connected to database: " . DB_NAME . "</div>";
    
    // Check if admin user exists
    $result = $testConn->query("SELECT username FROM admin_users WHERE username='admin' LIMIT 1");
    if ($result && $result->num_rows > 0) {
        echo "<div class='success'>✓ Admin user 'admin' exists in database</div>";
    }
}

$conn->close();
?>
</body>
</html>
