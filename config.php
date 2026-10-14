<?php
// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'exam_allocation_system');

// Error Reporting - suppress display for production
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Create database connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Check connection
if ($conn->connect_error) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed. Please ensure MySQL is running and the database exists.']);
    exit;
}

// Set charset
$conn->set_charset("utf8");

// Application Settings
define('APP_NAME', 'Exam Hall Allocation System');
define('APP_VERSION', '1.0.0');
define('ROLL_NUMBER_START', 1001);

// Security Settings
define('HASH_ALGO', 'sha256');
define('SESSION_TIMEOUT', 3600); // 1 hour

// Error Reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Timezone
date_default_timezone_set('Asia/Kolkata');

// Helper Functions
function sanitize_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

function generate_roll_number($department, $count) {
    $dept_code = strtoupper(substr($department, 0, 3));
    return $dept_code . str_pad($count, 4, '0', STR_PAD_LEFT);
}

function format_date($date) {
    return date('d-m-Y H:i:s', strtotime($date));
}

// API Headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}
?>
