<?php
require_once 'config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check_session':
        handleSessionCheck();
        break;
    default:
        sendResponse(['error' => 'Invalid action'], 400);
}

function handleLogin() {
    global $conn;
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $username = sanitize_input($data['username'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        sendResponse(['error' => 'Username and password are required'], 400);
        return;
    }
    
    // Query database for user
    $sql = "SELECT id, username, password, full_name, email, role, is_active 
              FROM admin_users 
              WHERE username = ? AND is_active = TRUE";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(['error' => 'Invalid username or password'], 401);
        return;
    }
    
    $user = $result->fetch_assoc();
    
    // Verify password - handle both PHP password hashes and MySQL old password hashes
    $password_valid = false;
    
    // First try PHP's password_verify (for modern hashes)
    if (password_verify($password, $user['password'])) {
        $password_valid = true;
    } else {
        // Try MySQL old password hash format
        $sql = "SELECT PASSWORD(?) as mysql_hash";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $password);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        if ($row['mysql_hash'] === $user['password']) {
            $password_valid = true;
        }
    }
    
    if (!$password_valid) {
        sendResponse(['error' => 'Invalid username or password'], 401);
        return;
    }
    
    // Update last login
    $updateSql = "UPDATE admin_users SET last_login = NOW() WHERE id = ?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param("i", $user['id']);
    $updateStmt->execute();
    
    // Remove sensitive data
    unset($user['password']);
    
    // Start session
    session_start();
    $_SESSION['admin_logged_in'] = true;
    $_SESSION['admin_user'] = $user;
    $_SESSION['login_time'] = time();
    
    sendResponse([
        'success' => true,
        'user' => $user,
        'message' => 'Login successful'
    ]);
}

function handleLogout() {
    session_start();
    
    // Destroy session
    session_destroy();
    
    sendResponse([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
}

function handleSessionCheck() {
    session_start();
    
    if (!isset($_SESSION['admin_logged_in']) || !$_SESSION['admin_logged_in']) {
        sendResponse([
            'authenticated' => false,
            'message' => 'Not authenticated'
        ]);
        return;
    }
    
    // Check session timeout (30 minutes)
    $loginTime = $_SESSION['login_time'] ?? 0;
    $currentTime = time();
    $timeout = 30 * 60; // 30 minutes
    
    if (($currentTime - $loginTime) > $timeout) {
        session_destroy();
        sendResponse([
            'authenticated' => false,
            'message' => 'Session expired'
        ]);
        return;
    }
    
    // Refresh session time
    $_SESSION['login_time'] = $currentTime;
    
    sendResponse([
        'authenticated' => true,
        'user' => $_SESSION['admin_user'] ?? null,
        'message' => 'Session valid'
    ]);
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
?>
