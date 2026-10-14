-- Exam Hall Allocation System Database Schema
-- Enhanced Version with Multiple Sessions Support
-- MySQL Database Script

-- Create database
CREATE DATABASE IF NOT EXISTS exam_allocation_system;
USE exam_allocation_system;

-- Admin Users table
CREATE TABLE IF NOT EXISTS admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role ENUM('super_admin', 'admin', 'operator') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (username, password, full_name, email, role) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin@college.edu', 'super_admin');

-- Halls table
CREATE TABLE IF NOT EXISTS halls (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    student_count INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Exam Sessions table
CREATE TABLE IF NOT EXISTS exam_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_name VARCHAR(100) NOT NULL,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    description TEXT,
    status ENUM('draft', 'active', 'completed') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_exam_date (exam_date),
    INDEX idx_status (status)
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    roll_number VARCHAR(20) NOT NULL UNIQUE,
    department_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    INDEX idx_roll_number (roll_number),
    INDEX idx_department (department_id)
);

-- Student Allocations table (for session-specific allocations)
CREATE TABLE IF NOT EXISTS student_allocations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    session_id INT NOT NULL,
    hall_id INT NOT NULL,
    seat_number INT NOT NULL,
    row_number INT,
    column_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_student (session_id, student_id),
    UNIQUE KEY unique_session_hall_seat (session_id, hall_id, seat_number),
    INDEX idx_session_hall (session_id, hall_id),
    INDEX idx_student_session (student_id, session_id)
);

-- Hall Session Capacity table (tracks hall usage per session)
CREATE TABLE IF NOT EXISTS hall_session_capacity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hall_id INT NOT NULL,
    session_id INT NOT NULL,
    allocated_seats INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_hall_session (hall_id, session_id)
);

-- Insert sample data
INSERT INTO halls (name, capacity) VALUES 
('Main Hall', 100),
('Computer Lab 1', 50),
('Computer Lab 2', 50),
('Conference Room A', 30),
('Conference Room B', 30);

INSERT INTO departments (name, student_count) VALUES 
('Computer Science', 80),
('Information Technology', 60),
('Electronics Engineering', 45),
('Mechanical Engineering', 55),
('Civil Engineering', 40);

-- Insert sample exam sessions
INSERT INTO exam_sessions (session_name, exam_date, start_time, end_time, description, status) VALUES 
('Mathematics Exam', '2024-12-15', '09:00:00', '12:00:00', 'Semester 1 Mathematics Examination', 'draft'),
('Physics Exam', '2024-12-15', '14:00:00', '17:00:00', 'Semester 1 Physics Examination', 'draft'),
('Computer Science Exam', '2024-12-16', '09:00:00', '12:00:00', 'Semester 1 Computer Science Examination', 'draft'),
('Electronics Exam', '2024-12-16', '14:00:00', '17:00:00', 'Semester 1 Electronics Examination', 'draft');

-- Generate sample students (this would typically be done by the application)
DELIMITER //
CREATE PROCEDURE GenerateStudents()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE dept_id INT;
    DECLARE dept_name VARCHAR(100);
    DECLARE student_count INT;
    DECLARE i INT DEFAULT 1;
    DECLARE roll_counter INT DEFAULT 1001;
    
    DECLARE dept_cursor CURSOR FOR 
        SELECT id, name, student_count FROM departments;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN dept_cursor;
    
    read_loop: LOOP
        FETCH dept_cursor INTO dept_id, dept_name, student_count;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET i = 1;
        WHILE i <= student_count DO
            INSERT INTO students (roll_number, department_id) 
            VALUES (CONCAT(SUBSTRING(dept_name, 1, 3), UPPER(CHAR(65 + (i % 26))), LPAD(i, 3, '0')), dept_id);
            SET i = i + 1;
            SET roll_counter = roll_counter + 1;
        END WHILE;
        
    END LOOP;
    
    CLOSE dept_cursor;
END //
DELIMITER ;

-- Enhanced views for reporting
CREATE VIEW session_allocation_view AS
SELECT 
    es.id as session_id,
    es.session_name,
    es.exam_date,
    es.start_time,
    es.end_time,
    es.status,
    COUNT(DISTINCT sa.student_id) as allocated_students,
    COUNT(DISTINCT sa.hall_id) as halls_used,
    SUM(h.capacity) as total_capacity,
    ROUND((COUNT(DISTINCT sa.student_id) * 100.0 / SUM(h.capacity)), 2) as utilization_percentage
FROM exam_sessions es
LEFT JOIN student_allocations sa ON es.id = sa.session_id
LEFT JOIN hall_session_capacity hsc ON es.id = hsc.session_id
LEFT JOIN halls h ON hsc.hall_id = h.id
GROUP BY es.id, es.session_name, es.exam_date, es.start_time, es.end_time, es.status;

CREATE VIEW hall_session_allocation_view AS
SELECT 
    h.id as hall_id,
    h.name as hall_name,
    h.capacity,
    es.id as session_id,
    es.session_name,
    es.exam_date,
    es.start_time,
    es.end_time,
    COALESCE(hsc.allocated_seats, 0) as allocated_students,
    h.capacity - COALESCE(hsc.allocated_seats, 0) as available_seats,
    ROUND((COALESCE(hsc.allocated_seats, 0) * 100.0 / h.capacity), 2) as occupancy_percentage
FROM halls h
CROSS JOIN exam_sessions es
LEFT JOIN hall_session_capacity hsc ON h.id = hsc.hall_id AND es.id = hsc.session_id
ORDER BY es.exam_date, es.start_time, h.name;

CREATE VIEW department_session_allocation_view AS
SELECT 
    d.id as department_id,
    d.name as department_name,
    d.student_count as total_students,
    es.id as session_id,
    es.session_name,
    es.exam_date,
    es.start_time,
    es.end_time,
    COUNT(DISTINCT sa.student_id) as allocated_students,
    COUNT(DISTINCT sa.hall_id) as halls_used
FROM departments d
CROSS JOIN exam_sessions es
LEFT JOIN student_allocations sa ON d.id = (SELECT department_id FROM students WHERE id = sa.student_id) AND es.id = sa.session_id
GROUP BY d.id, d.name, d.student_count, es.id, es.session_name, es.exam_date, es.start_time, es.end_time;

CREATE VIEW student_session_allocation_view AS
SELECT 
    s.roll_number,
    d.name as department,
    es.id as session_id,
    es.session_name,
    es.exam_date,
    es.start_time,
    es.end_time,
    h.name as hall_name,
    sa.seat_number,
    sa.row_number,
    sa.column_number
FROM students s
JOIN departments d ON s.department_id = d.id
LEFT JOIN student_allocations sa ON s.id = sa.student_id
LEFT JOIN exam_sessions es ON sa.session_id = es.id
LEFT JOIN halls h ON sa.hall_id = h.id
ORDER BY es.exam_date, es.start_time, s.roll_number;

-- Indexes for performance
CREATE INDEX idx_allocations_session_student ON student_allocations(session_id, student_id);
CREATE INDEX idx_allocations_hall_seat ON student_allocations(hall_id, seat_number);
CREATE INDEX idx_allocations_student_session ON student_allocations(student_id, session_id);

-- Enhanced stored procedures for allocation with department mixing
DELIMITER //
CREATE PROCEDURE AllocateStudentsToSession(
    IN p_session_id INT,
    IN p_mix_departments BOOLEAN DEFAULT TRUE,
    IN p_rows_per_hall INT DEFAULT 10
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE current_hall_id INT;
    DECLARE current_hall_capacity INT;
    DECLARE current_hall_allocated INT;
    DECLARE available_capacity INT;
    DECLARE student_id INT;
    DECLARE student_dept_id INT;
    DECLARE seat_number INT DEFAULT 1;
    DECLARE row_number INT DEFAULT 1;
    DECLARE col_number INT DEFAULT 1;
    DECLARE prev_dept_id INT DEFAULT NULL;
    DECLARE same_dept_count INT DEFAULT 0;
    DECLARE max_same_dept_adjacent INT DEFAULT 2;
    
    -- Temporary table for shuffled students
    DROP TEMPORARY TABLE IF EXISTS temp_shuffled_students;
    CREATE TEMPORARY TABLE temp_shuffled_students (
        id INT,
        roll_number VARCHAR(20),
        department_id INT,
        order_index INT AUTO_INCREMENT PRIMARY KEY
    );
    
    -- Get unallocated students for this session and shuffle them
    INSERT INTO temp_shuffled_students (id, roll_number, department_id)
    SELECT s.id, s.roll_number, s.department_id
    FROM students s
    WHERE s.id NOT IN (
        SELECT student_id FROM student_allocations WHERE session_id = p_session_id
    )
    ORDER BY RAND();
    
    -- Clear existing allocations for this session
    DELETE FROM student_allocations WHERE session_id = p_session_id;
    DELETE FROM hall_session_capacity WHERE session_id = p_session_id;
    
    -- Initialize hall session capacity
    INSERT INTO hall_session_capacity (hall_id, session_id, allocated_seats)
    SELECT id, p_session_id, 0 FROM halls;
    
    -- Get halls sorted by capacity (largest first)
    BEGIN
        DECLARE hall_cursor CURSOR FOR 
            SELECT h.id, h.capacity, COALESCE(hsc.allocated_seats, 0)
            FROM halls h
            LEFT JOIN hall_session_capacity hsc ON h.id = hsc.hall_id AND hsc.session_id = p_session_id
            ORDER BY h.capacity DESC;
        
        DECLARE student_cursor CURSOR FOR 
            SELECT id, department_id FROM temp_shuffled_students ORDER BY order_index;
        
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
        
        OPEN student_cursor;
        
        student_loop: LOOP
            FETCH student_cursor INTO student_id, student_dept_id;
            IF done THEN
                LEAVE student_loop;
            END IF;
            
            -- Find a hall with available capacity
            hall_loop: LOOP
                OPEN hall_cursor;
                FETCH hall_cursor INTO current_hall_id, current_hall_capacity, current_hall_allocated;
                CLOSE hall_cursor;
                
                IF done THEN
                    LEAVE student_loop;
                END IF;
                
                SET available_capacity = current_hall_capacity - current_hall_allocated;
                
                IF available_capacity > 0 THEN
                    -- Check department mixing rule
                    IF p_mix_departments AND prev_dept_id = student_dept_id THEN
                        SET same_dept_count = same_dept_count + 1;
                        IF same_dept_count >= max_same_dept_adjacent THEN
                            -- Try to find a student from different department
                            BEGIN
                                DECLARE alt_student_id INT;
                                DECLARE alt_dept_id INT;
                                
                                SELECT id, department_id INTO alt_student_id, alt_dept_id
                                FROM temp_shuffled_students 
                                WHERE id != student_id AND department_id != prev_dept_id
                                LIMIT 1;
                                
                                IF alt_student_id IS NOT NULL THEN
                                    SET student_id = alt_student_id;
                                    SET student_dept_id = alt_dept_id;
                                    SET same_dept_count = 0;
                                END IF;
                            END;
                        END IF;
                    ELSE
                        SET same_dept_count = 1;
                    END IF;
                    
                    -- Calculate row and column
                    SET row_number = ((seat_number - 1) DIV p_rows_per_hall) + 1;
                    SET col_number = ((seat_number - 1) % p_rows_per_hall) + 1;
                    
                    -- Allocate student to this hall
                    INSERT INTO student_allocations 
                    (student_id, session_id, hall_id, seat_number, row_number, column_number)
                    VALUES (student_id, p_session_id, current_hall_id, seat_number, row_number, col_number);
                    
                    -- Update hall session capacity
                    UPDATE hall_session_capacity 
                    SET allocated_seats = allocated_seats + 1
                    WHERE hall_id = current_hall_id AND session_id = p_session_id;
                    
                    SET prev_dept_id = student_dept_id;
                    SET seat_number = seat_number + 1;
                    LEAVE hall_loop;
                END IF;
            END LOOP;
            
        END LOOP;
        
        CLOSE student_cursor;
    END;
    
    -- Clean up
    DROP TEMPORARY TABLE temp_shuffled_students;
    
END //

-- Function to get session allocation statistics
CREATE FUNCTION GetSessionAllocationStats(p_session_id INT) 
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total_students INT DEFAULT 0;
    DECLARE allocated_students INT DEFAULT 0;
    DECLARE total_halls INT DEFAULT 0;
    DECLARE used_halls INT DEFAULT 0;
    DECLARE avg_occupancy DECIMAL(5,2) DEFAULT 0;
    DECLARE session_name VARCHAR(100);
    DECLARE exam_date DATE;
    
    -- Get session info
    SELECT session_name, exam_date INTO session_name, exam_date
    FROM exam_sessions WHERE id = p_session_id;
    
    -- Get total students
    SELECT COUNT(*) INTO total_students FROM students;
    
    -- Get allocated students for this session
    SELECT COUNT(*) INTO allocated_students 
    FROM student_allocations WHERE session_id = p_session_id;
    
    -- Get hall statistics
    SELECT COUNT(*) INTO total_halls FROM halls;
    SELECT COUNT(DISTINCT hall_id) INTO used_halls 
    FROM student_allocations WHERE session_id = p_session_id;
    
    -- Calculate average occupancy
    IF used_halls > 0 THEN
        SELECT AVG(allocated_seats * 100.0 / h.capacity) INTO avg_occupancy
        FROM hall_session_capacity hsc
        JOIN halls h ON hsc.hall_id = h.id
        WHERE hsc.session_id = p_session_id AND hsc.allocated_seats > 0;
    END IF;
    
    RETURN JSON_OBJECT(
        'session_id', p_session_id,
        'session_name', session_name,
        'exam_date', exam_date,
        'total_students', total_students,
        'allocated_students', allocated_students,
        'total_halls', total_halls,
        'used_halls', used_halls,
        'average_occupancy', avg_occupancy
    );
END //

DELIMITER ;

-- Sample queries for testing

-- Get hall-wise allocation
-- SELECT * FROM hall_allocation_view;

-- Get department-wise allocation  
-- SELECT * FROM department_allocation_view;

-- Get student details with allocation
-- SELECT * FROM student_allocation_view;

-- Get allocation statistics
-- SELECT GetAllocationStats() as stats;

-- Run allocation procedure
-- CALL AllocateStudents('Session 2024');

-- Get students in a specific hall
-- SELECT s.roll_number, d.name as department, s.seat_number 
-- FROM students s 
-- JOIN departments d ON s.department_id = d.id 
-- WHERE s.hall_id = 1 
-- ORDER BY s.seat_number;
